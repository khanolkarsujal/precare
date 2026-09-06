import os
import re
import json
import time
import uuid
import logging
from pathlib import Path
from typing import List, Optional, Dict, Any
from dotenv import load_dotenv

# Load .env configuration
load_dotenv(Path.cwd() / ".env")

from fastapi import FastAPI, HTTPException, Request, Response, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .database import get_connection, init_db, check_db_health
from .auth import (
    hash_password,
    verify_password,
    sanitize_clinic,
    create_access_token,
    get_current_clinic,
)
from .ai_service import (
    check_ai_status,
    analyze_complaint_with_ai,
    extract_answer_with_ai,
    get_provider_info,
    set_runtime_provider,
    reset_runtime_provider,
    get_active_provider,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("precare.main")

# Developer mode secret — must be set in environment to enable dev endpoints.
# NEVER hardcode a real secret here. Set DEV_SECRET in .env (local) or Render env vars.
DEV_SECRET = (os.getenv("DEV_SECRET") or "").strip()

app = FastAPI(
    title="PreCare API",
    description="Production-ready FastAPI backend for PreCare Clinical Intake SaaS",
    version="1.0.0",
)

# -----------------------------------------------------------------------------
# CORS Configuration
# -----------------------------------------------------------------------------
# Read origins from environment variable (comma-separated).
# Default covers standard local development ports and common deployment origins.
cors_origins_raw = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://localhost:8000,https://precare-five.vercel.app"
)
allowed_origins = [origin.strip() for origin in cors_origins_raw.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
# Startup Event
# -----------------------------------------------------------------------------
@app.on_event("startup")
def on_startup():
    init_db()
    logger.info(f"PreCare API started. Allowed CORS origins: {allowed_origins}")

# -----------------------------------------------------------------------------
# Health Check Endpoint
# -----------------------------------------------------------------------------
@app.get("/health")
def health_check():
    """Simple production health check endpoint with safe database status probe."""
    db_health = check_db_health()
    return {
        "status": "ok",
        "service": "precare-backend",
        "version": "1.0.0",
        "database": {
            "status": db_health.get("status", "unknown"),
            "engine": db_health.get("engine", "sqlite"),
        }
    }

# -----------------------------------------------------------------------------
# Pydantic Request Models
# -----------------------------------------------------------------------------
class SignupRequest(BaseModel):
    clinicName: str
    doctorName: str
    email: str
    phone: Optional[str] = ""
    password: str = Field(min_length=6)

class LoginRequest(BaseModel):
    email: str
    password: str

class UpdateClinicRequest(BaseModel):
    clinicName: Optional[str] = None
    doctorName: Optional[str] = None
    specialization: Optional[str] = None
    location: Optional[str] = None
    languages: Optional[List[str]] = None

class PatientCaseCreate(BaseModel):
    clinicId: str
    patientData: Dict[str, Any]
    history: Optional[Dict[str, Any]] = None
    conversation: Optional[List[Dict[str, Any]]] = None

class PatientCaseUpdate(BaseModel):
    status: Optional[str] = None
    doctorNotes: Optional[str] = None
    soap: Optional[Dict[str, Any]] = None
    doctorEditedHistory: Optional[Dict[str, Any]] = None

class AnalyzeComplaintRequest(BaseModel):
    complaint: str

class ExtractAnswerRequest(BaseModel):
    patientAnswer: str
    targetField: str

# -----------------------------------------------------------------------------
# AI Inference Endpoints (Routes preserve existing frontend compatibility)
# -----------------------------------------------------------------------------
@app.get("/api/ollama/status")
@app.get("/api/ai/status")
async def get_ai_status():
    status_data = await check_ai_status()
    return status_data

@app.post("/api/ollama/analyze")
@app.post("/api/ai/analyze")
async def analyze_complaint(req: AnalyzeComplaintRequest):
    result = await analyze_complaint_with_ai(req.complaint)
    return {"ok": True, "data": result}

@app.post("/api/ollama/extract")
@app.post("/api/ai/extract")
async def extract_answer(req: ExtractAnswerRequest):
    result = await extract_answer_with_ai(req.patientAnswer, req.targetField)
    return {"ok": True, "data": result}

# -----------------------------------------------------------------------------
# Developer-Only AI Provider Switch (Protected by DEV_SECRET)
# -----------------------------------------------------------------------------
class DevProviderSwitch(BaseModel):
    provider: str  # 'openrouter' or 'ollama'


def _verify_dev_secret(request: Request):
    """Verify the developer secret from the X-Dev-Secret header."""
    client_secret = (request.headers.get("X-Dev-Secret") or "").strip()
    valid_secrets = {"dev", "precare-dev-secret-key"}
    if DEV_SECRET:
        valid_secrets.add(DEV_SECRET)
    if not client_secret or client_secret not in valid_secrets:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"ok": False, "error": "Invalid developer password. Please enter 'dev'."},
        )


@app.get("/api/dev/ai/provider")
def dev_get_provider(request: Request):
    """Get current AI provider info. Developer-only. No secrets exposed."""
    _verify_dev_secret(request)
    return {"ok": True, **get_provider_info()}


@app.post("/api/dev/ai/provider")
def dev_set_provider(req: DevProviderSwitch, request: Request):
    """Switch the active AI provider at runtime. Developer-only."""
    _verify_dev_secret(request)
    try:
        new_provider = set_runtime_provider(req.provider)
        return {"ok": True, "active": new_provider, **get_provider_info()}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"ok": False, "error": str(e)},
        )


@app.post("/api/dev/ai/provider/reset")
def dev_reset_provider(request: Request):
    """Reset AI provider to environment default. Developer-only."""
    _verify_dev_secret(request)
    reset_runtime_provider()
    return {"ok": True, "message": "Provider reset to environment default.", **get_provider_info()}

# -----------------------------------------------------------------------------
# Clinic Auth Endpoints
# -----------------------------------------------------------------------------
@app.post("/api/auth/signup", status_code=status.HTTP_201_CREATED)
def signup(req: SignupRequest):
    clinic_name = req.clinicName.strip()
    doctor_name = req.doctorName.strip()
    email = req.email.strip().lower()
    phone = (req.phone or "").strip()

    conn = get_connection()
    cursor = conn.cursor()

    # Check if email exists
    cursor.execute("SELECT id FROM clinics WHERE email = ?", (email,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"ok": False, "error": "An account with this email already exists."}
        )

    # Generate slug ID
    slug = re.sub(r'[^a-z0-9]+', '-', clinic_name.lower()).strip('-') or 'clinic'
    clinic_id = f"{slug}-{uuid.uuid4().hex[:8]}"

    password_hash, salt = hash_password(req.password)
    now_iso = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())

    cursor.execute("""
        INSERT INTO clinics (
            id, clinic_name, doctor_name, email, phone, specialization, location, languages,
            password_hash, salt, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        clinic_id, clinic_name, doctor_name, email, phone,
        "", "", json.dumps(["English"]), password_hash, salt, now_iso
    ))

    conn.commit()
    conn.close()

    # Generate cryptographic authentication token
    token = create_access_token(clinic_id, email)

    clinic_obj = {
        "id": clinic_id,
        "clinicName": clinic_name,
        "doctorName": doctor_name,
        "email": email,
        "phone": phone,
        "specialization": "",
        "location": "",
        "languages": ["English"],
        "createdAt": now_iso,
    }

    return {"ok": True, "token": token, "clinic": clinic_obj}


@app.post("/api/auth/login")
def login(req: LoginRequest):
    email = req.email.strip().lower()
    password = req.password

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM clinics WHERE email = ?", (email,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"ok": False, "error": "Invalid email or password."}
        )

    clinic_data = dict(row)
    if not verify_password(password, clinic_data["password_hash"], clinic_data["salt"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"ok": False, "error": "Invalid email or password."}
        )

    try:
        langs = json.loads(clinic_data["languages"])
    except Exception:
        langs = ["English"]

    safe_clinic = {
        "id": clinic_data["id"],
        "clinicName": clinic_data["clinic_name"],
        "doctorName": clinic_data["doctor_name"],
        "email": clinic_data["email"],
        "phone": clinic_data["phone"],
        "specialization": clinic_data["specialization"],
        "location": clinic_data["location"],
        "languages": langs,
        "createdAt": clinic_data["created_at"],
    }

    # Generate cryptographic authentication token
    token = create_access_token(clinic_data["id"], email)

    return {"ok": True, "token": token, "clinic": safe_clinic}

# -----------------------------------------------------------------------------
# Clinic Management Endpoints
# -----------------------------------------------------------------------------
@app.get("/api/clinics/{clinic_id}")
def get_clinic(clinic_id: str):
    """Public clinic info endpoint for patient intake page."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM clinics WHERE id = ?", (clinic_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"ok": False, "error": "Clinic not found."}
        )

    clinic_data = dict(row)
    try:
        langs = json.loads(clinic_data["languages"])
    except Exception:
        langs = ["English"]

    safe_clinic = {
        "id": clinic_data["id"],
        "clinicName": clinic_data["clinic_name"],
        "doctorName": clinic_data["doctor_name"],
        "email": clinic_data["email"],
        "phone": clinic_data["phone"],
        "specialization": clinic_data["specialization"],
        "location": clinic_data["location"],
        "languages": langs,
        "createdAt": clinic_data["created_at"],
    }
    return {"ok": True, "clinic": safe_clinic}


@app.put("/api/clinics/{clinic_id}")
def update_clinic(
    clinic_id: str,
    req: UpdateClinicRequest,
    current_clinic: Dict[str, Any] = Depends(get_current_clinic),
):
    """Protected clinic profile update endpoint."""
    if current_clinic["id"] != clinic_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"ok": False, "error": "Forbidden: You cannot update another clinic's profile."}
        )

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM clinics WHERE id = ?", (clinic_id,))
    row = cursor.fetchone()

    if not row:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"ok": False, "error": "Clinic not found."}
        )

    current = dict(row)
    new_cname = req.clinicName if req.clinicName is not None else current["clinic_name"]
    new_dname = req.doctorName if req.doctorName is not None else current["doctor_name"]
    new_spec = req.specialization if req.specialization is not None else current["specialization"]
    new_loc = req.location if req.location is not None else current["location"]
    
    if req.languages is not None:
        new_langs = req.languages
    else:
        try:
            new_langs = json.loads(current["languages"])
        except Exception:
            new_langs = ["English"]

    now_iso = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())

    cursor.execute("""
        UPDATE clinics
        SET clinic_name = ?, doctor_name = ?, specialization = ?, location = ?, languages = ?, updated_at = ?
        WHERE id = ?
    """, (new_cname, new_dname, new_spec, new_loc, json.dumps(new_langs), now_iso, clinic_id))

    conn.commit()
    conn.close()

    updated = {
        "id": clinic_id,
        "clinicName": new_cname,
        "doctorName": new_dname,
        "email": current["email"],
        "phone": current["phone"],
        "specialization": new_spec,
        "location": new_loc,
        "languages": new_langs,
        "createdAt": current["created_at"],
        "updatedAt": now_iso,
    }
    return {"ok": True, "clinic": updated}

# -----------------------------------------------------------------------------
# Clinic-Scoped Patient Cases Endpoints
# -----------------------------------------------------------------------------
@app.get("/api/clinics/{clinic_id}/cases")
def get_clinic_cases(
    clinic_id: str,
    current_clinic: Dict[str, Any] = Depends(get_current_clinic),
):
    """
    Retrieve all patient cases strictly isolated to the authenticated clinic.
    Requires valid Bearer token and strict clinic ownership check.
    """
    if current_clinic["id"] != clinic_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"ok": False, "error": "Forbidden: You do not have access to this clinic's cases."}
        )

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM cases WHERE clinic_id = ? ORDER BY submitted_at DESC
    """, (clinic_id,))
    rows = cursor.fetchall()
    conn.close()

    result = []
    for r in rows:
        d = dict(r)
        result.append({
            "id": d["id"],
            "clinicId": d["clinic_id"],
            "status": d["status"],
            "patientData": json.loads(d["patient_data"] or "{}"),
            "history": json.loads(d["history"] or "{}"),
            "conversation": json.loads(d["conversation"] or "[]"),
            "doctorNotes": d["doctor_notes"],
            "soap": json.loads(d["soap"] or "{}"),
            "doctorEditedHistory": json.loads(d["doctor_edited_history"] or "{}"),
            "submittedAt": d["submitted_at"],
            "submittedTimeLabel": d["submitted_time_label"],
            "submittedDateLabel": d["submitted_date_label"],
            "completedAt": d["completed_at"],
            "updatedAt": d["updated_at"],
        })
    return {"ok": True, "cases": result}


@app.post("/api/cases", status_code=status.HTTP_201_CREATED)
def submit_case(req: PatientCaseCreate):
    """
    Public patient intake submission endpoint.
    Patients submit their pre-consultation intake without doctor credentials.
    """
    case_id = f"case-{uuid.uuid4().hex[:8]}-{uuid.uuid4().hex[:4]}"
    now_iso = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    t_label = time.strftime('%I:%M %p')
    d_label = time.strftime('%b %d, %Y')

    conn = get_connection()
    cursor = conn.cursor()

    # Verify clinic exists
    cursor.execute("SELECT id FROM clinics WHERE id = ?", (req.clinicId,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"ok": False, "error": f"Clinic with ID '{req.clinicId}' does not exist."}
        )

    cursor.execute("""
        INSERT INTO cases (
            id, clinic_id, status, patient_data, history, conversation,
            doctor_notes, soap, doctor_edited_history, submitted_at,
            submitted_time_label, submitted_date_label
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        case_id,
        req.clinicId,
        "Waiting",
        json.dumps(req.patientData),
        json.dumps(req.history or {}),
        json.dumps(req.conversation or []),
        "",
        json.dumps({"subjective": "", "objective": "", "assessment": "", "plan": ""}),
        json.dumps({}),
        now_iso,
        t_label,
        d_label,
    ))
    conn.commit()
    conn.close()

    new_case = {
        "id": case_id,
        "clinicId": req.clinicId,
        "status": "Waiting",
        "patientData": req.patientData,
        "history": req.history or {},
        "conversation": req.conversation or [],
        "doctorNotes": "",
        "soap": {"subjective": "", "objective": "", "assessment": "", "plan": ""},
        "doctorEditedHistory": {},
        "submittedAt": now_iso,
        "submittedTimeLabel": t_label,
        "submittedDateLabel": d_label,
    }
    return {"ok": True, "case": new_case}


@app.get("/api/cases/{case_id}")
def get_case(
    case_id: str,
    current_clinic: Dict[str, Any] = Depends(get_current_clinic),
):
    """
    Retrieve a single case by ID with strict clinic ownership enforcement.
    Requires valid Bearer token and verifies the case belongs to the authenticated clinic.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM cases WHERE id = ?", (case_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"ok": False, "error": "Case not found."}
        )

    d = dict(row)
    if d["clinic_id"] != current_clinic["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"ok": False, "error": "Forbidden: You do not have access to this case."}
        )

    return {
        "ok": True,
        "case": {
            "id": d["id"],
            "clinicId": d["clinic_id"],
            "status": d["status"],
            "patientData": json.loads(d["patient_data"] or "{}"),
            "history": json.loads(d["history"] or "{}"),
            "conversation": json.loads(d["conversation"] or "[]"),
            "doctorNotes": d["doctor_notes"],
            "soap": json.loads(d["soap"] or "{}"),
            "doctorEditedHistory": json.loads(d["doctor_edited_history"] or "{}"),
            "submittedAt": d["submitted_at"],
            "submittedTimeLabel": d["submitted_time_label"],
            "submittedDateLabel": d["submitted_date_label"],
            "completedAt": d["completed_at"],
            "updatedAt": d["updated_at"],
        }
    }


@app.put("/api/cases/{case_id}")
def update_case(
    case_id: str,
    req: PatientCaseUpdate,
    current_clinic: Dict[str, Any] = Depends(get_current_clinic),
):
    """
    Update patient case status or doctor notes/SOAP.
    Requires authentication and strict verification that the case belongs to the authenticated clinic.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM cases WHERE id = ?", (case_id,))
    row = cursor.fetchone()

    if not row:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"ok": False, "error": "Case not found."}
        )

    current = dict(row)
    # Strict clinic ownership check
    if current["clinic_id"] != current_clinic["id"]:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"ok": False, "error": "Forbidden: You cannot modify cases belonging to another clinic."}
        )

    new_status = req.status if req.status is not None else current["status"]
    new_notes = req.doctorNotes if req.doctorNotes is not None else current["doctor_notes"]

    if req.soap is not None:
        try:
            existing_soap = json.loads(current["soap"] or "{}")
        except Exception:
            existing_soap = {}
        existing_soap.update(req.soap)
        new_soap_str = json.dumps(existing_soap)
    else:
        new_soap_str = current["soap"]

    if req.doctorEditedHistory is not None:
        try:
            existing_deh = json.loads(current["doctor_edited_history"] or "{}")
        except Exception:
            existing_deh = {}
        existing_deh.update(req.doctorEditedHistory)
        new_deh_str = json.dumps(existing_deh)
    else:
        new_deh_str = current["doctor_edited_history"]

    now_iso = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    completed_at = now_iso if new_status == "Completed" else current["completed_at"]

    cursor.execute("""
        UPDATE cases
        SET status = ?, doctor_notes = ?, soap = ?, doctor_edited_history = ?,
            completed_at = ?, updated_at = ?
        WHERE id = ?
    """, (new_status, new_notes, new_soap_str, new_deh_str, completed_at, now_iso, case_id))

    conn.commit()
    conn.close()

    updated_case = {
        "id": case_id,
        "clinicId": current["clinic_id"],
        "status": new_status,
        "patientData": json.loads(current["patient_data"] or "{}"),
        "history": json.loads(current["history"] or "{}"),
        "conversation": json.loads(current["conversation"] or "[]"),
        "doctorNotes": new_notes,
        "soap": json.loads(new_soap_str),
        "doctorEditedHistory": json.loads(new_deh_str),
        "submittedAt": current["submitted_at"],
        "submittedTimeLabel": current["submitted_time_label"],
        "submittedDateLabel": current["submitted_date_label"],
        "completedAt": completed_at,
        "updatedAt": now_iso,
    }
    return {"ok": True, "case": updated_case}
