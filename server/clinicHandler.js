/**
 * ==============================================================================
 * [LEGACY PROTOTYPE] server/clinicHandler.js
 * ==============================================================================
 * Notice: This handler was part of the initial Node.js prototype server.
 * Clinic authentication and cases management are now handled by FastAPI in
 * backend/main.py and backend/auth.py.
 * ==============================================================================
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const CLINICS_FILE = path.join(DATA_DIR, 'clinics.json');
const CASES_FILE = path.join(DATA_DIR, 'cases.json');

const SESSION_SECRET = process.env.SESSION_SECRET || 'precare_clinic_secret_key_2026';

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Seed demo clinic if none exists
function loadClinics() {
  try {
    if (fs.existsSync(CLINICS_FILE)) {
      const content = fs.readFileSync(CLINICS_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.error('[clinicHandler] Error reading clinics file:', e.message);
  }
  return [];
}

function saveClinics(clinics) {
  try {
    fs.writeFileSync(CLINICS_FILE, JSON.stringify(clinics, null, 2), 'utf-8');
  } catch (e) {
    console.error('[clinicHandler] Error saving clinics file:', e.message);
  }
}

function loadCases() {
  try {
    if (fs.existsSync(CASES_FILE)) {
      const content = fs.readFileSync(CASES_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.error('[clinicHandler] Error reading cases file:', e.message);
  }
  return [];
}

function saveCases(cases) {
  try {
    fs.writeFileSync(CASES_FILE, JSON.stringify(cases, null, 2), 'utf-8');
  } catch (e) {
    console.error('[clinicHandler] Error saving cases file:', e.message);
  }
}

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

export function verifyPassword(password, hash, salt) {
  const check = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return check === hash;
}

// Create a safe sanitized clinic object (no password/salt)
export function sanitizeClinic(clinic) {
  if (!clinic) return null;
  const { passwordHash, salt, ...safe } = clinic;
  return safe;
}

/**
 * Handle API requests for clinics, auth, and clinic-scoped cases
 * Returns true if handled, false if not an auth/clinic route.
 */
export async function handleClinicRoutes(req, res, url, parseBody, sendJson) {
  const pathname = url.pathname;

  // 1. POST /api/auth/signup
  if (req.method === 'POST' && pathname === '/api/auth/signup') {
    try {
      const body = await parseBody();
      const { clinicName, doctorName, email, phone, password } = body;

      if (!clinicName || !doctorName || !email || !password) {
        return sendJson(400, { ok: false, error: 'All required fields must be provided.' });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return sendJson(400, { ok: false, error: 'Please enter a valid email address.' });
      }

      if (password.length < 6) {
        return sendJson(400, { ok: false, error: 'Password must be at least 6 characters long.' });
      }

      const clinics = loadClinics();
      const existing = clinics.find((c) => c.email.toLowerCase() === email.trim().toLowerCase());
      if (existing) {
        return sendJson(409, { ok: false, error: 'An account with this email already exists.' });
      }

      const { hash, salt } = hashPassword(password);
      // Clean ID format from clinic name
      const slug = clinicName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'clinic';
      const clinicId = `${slug}-${Date.now().toString(36)}`;

      const newClinic = {
        id: clinicId,
        clinicName: clinicName.trim(),
        doctorName: doctorName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim() : '',
        specialization: '',
        location: '',
        languages: ['English'],
        passwordHash: hash,
        salt,
        createdAt: new Date().toISOString(),
      };

      clinics.push(newClinic);
      saveClinics(clinics);

      return sendJson(201, {
        ok: true,
        clinic: sanitizeClinic(newClinic),
      });
    } catch (err) {
      return sendJson(500, { ok: false, error: err.message });
    }
  }

  // 2. POST /api/auth/login
  if (req.method === 'POST' && pathname === '/api/auth/login') {
    try {
      const body = await parseBody();
      const { email, password } = body;

      if (!email || !password) {
        return sendJson(400, { ok: false, error: 'Email and password are required.' });
      }

      const clinics = loadClinics();
      const clinic = clinics.find((c) => c.email.toLowerCase() === email.trim().toLowerCase());
      if (!clinic) {
        return sendJson(401, { ok: false, error: 'Invalid email or password.' });
      }

      const valid = verifyPassword(password, clinic.passwordHash, clinic.salt);
      if (!valid) {
        return sendJson(401, { ok: false, error: 'Invalid email or password.' });
      }

      return sendJson(200, {
        ok: true,
        clinic: sanitizeClinic(clinic),
      });
    } catch (err) {
      return sendJson(500, { ok: false, error: err.message });
    }
  }

  // 3. GET /api/clinics/:id
  if (req.method === 'GET' && pathname.startsWith('/api/clinics/')) {
    const parts = pathname.split('/').filter(Boolean);
    // /api/clinics/:id
    if (parts.length === 3) {
      const clinicId = parts[2];
      const clinics = loadClinics();
      const clinic = clinics.find((c) => c.id === clinicId);
      if (!clinic) {
        return sendJson(404, { ok: false, error: 'Clinic not found.' });
      }
      return sendJson(200, { ok: true, clinic: sanitizeClinic(clinic) });
    }

    // /api/clinics/:id/cases
    if (parts.length === 4 && parts[3] === 'cases') {
      const clinicId = parts[2];
      const allCases = loadCases();
      const clinicCases = allCases.filter((c) => c.clinicId === clinicId);
      return sendJson(200, { ok: true, cases: clinicCases });
    }
  }

  // 4. PUT /api/clinics/:id (Update setup)
  if (req.method === 'PUT' && pathname.startsWith('/api/clinics/')) {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length === 3) {
      try {
        const clinicId = parts[2];
        const body = await parseBody();
        const clinics = loadClinics();
        const idx = clinics.findIndex((c) => c.id === clinicId);
        if (idx === -1) {
          return sendJson(404, { ok: false, error: 'Clinic not found.' });
        }

        clinics[idx] = {
          ...clinics[idx],
          clinicName: body.clinicName || clinics[idx].clinicName,
          doctorName: body.doctorName || clinics[idx].doctorName,
          specialization: body.specialization ?? clinics[idx].specialization,
          location: body.location ?? clinics[idx].location,
          languages: body.languages ?? clinics[idx].languages,
          updatedAt: new Date().toISOString(),
        };

        saveClinics(clinics);
        return sendJson(200, { ok: true, clinic: sanitizeClinic(clinics[idx]) });
      } catch (err) {
        return sendJson(500, { ok: false, error: err.message });
      }
    }
  }

  // 5. POST /api/cases (Submit patient case for clinic)
  if (req.method === 'POST' && pathname === '/api/cases') {
    try {
      const body = await parseBody();
      const { clinicId, patientData, history, conversation } = body;

      if (!clinicId) {
        return sendJson(400, { ok: false, error: 'Clinic ID is required.' });
      }

      const allCases = loadCases();
      const now = new Date();
      const newCase = {
        id: `case-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        clinicId,
        status: 'Waiting',
        submittedAt: now.toISOString(),
        submittedTimeLabel: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        submittedDateLabel: now.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
        patientData: patientData || {},
        history: history || null,
        conversation: conversation || [],
        doctorNotes: '',
        soap: { subjective: '', objective: '', assessment: '', plan: '' },
        doctorEditedHistory: {},
      };

      allCases.unshift(newCase);
      saveCases(allCases);

      return sendJson(201, { ok: true, case: newCase });
    } catch (err) {
      return sendJson(500, { ok: false, error: err.message });
    }
  }

  // 6. PUT /api/cases/:id (Update case status or doctor notes)
  if (req.method === 'PUT' && pathname.startsWith('/api/cases/')) {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length === 3) {
      try {
        const caseId = parts[2];
        const body = await parseBody();
        const allCases = loadCases();
        const idx = allCases.findIndex((c) => c.id === caseId);
        if (idx === -1) {
          return sendJson(404, { ok: false, error: 'Case not found.' });
        }

        allCases[idx] = {
          ...allCases[idx],
          ...body,
          soap: body.soap ? { ...allCases[idx].soap, ...body.soap } : allCases[idx].soap,
          doctorEditedHistory: body.doctorEditedHistory
            ? { ...allCases[idx].doctorEditedHistory, ...body.doctorEditedHistory }
            : allCases[idx].doctorEditedHistory,
          updatedAt: new Date().toISOString(),
        };

        saveCases(allCases);
        return sendJson(200, { ok: true, case: allCases[idx] });
      } catch (err) {
        return sendJson(500, { ok: false, error: err.message });
      }
    }
  }

  return false;
}
