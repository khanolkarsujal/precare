# PreCare — AI-Assisted Patient Pre-Consultation SaaS

PreCare is an AI-assisted patient pre-consultation and clinical intake platform for clinics. It collects and structures patient history before the doctor consultation, allowing clinicians to review an organized case history and focus more time on direct patient care.

> **Clinical Principle**: PreCare is strictly an information intake and structuring assistant. It does **not** provide diagnoses, recommend treatments, or replace licensed medical professionals.

---

## Architecture Overview

- **Frontend**: React 19, Vite, Vanilla CSS design system, responsive single-page SaaS routing (`/`, `/signup`, `/login`, `/onboarding`, `/dashboard`, `/intake/:clinicId`).
- **Backend**: FastAPI (Python 3.10+) with Uvicorn, CORS middleware, REST endpoints, and `/health` monitoring.
- **Database**: SQLite database (`precare.sqlite`), parameterized SQL schema with clinic-isolated patient cases.
- **AI Integration**: Local Ollama with `qwen3:8b` clinical LLM, optimized single-call per patient interaction (`think: false`, token capped).

---

## Environment Variables

Copy `.env.example` to `.env` and configure your environment:

```bash
cp .env.example .env
```

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | FastAPI backend port | `8000` |
| `VITE_API_URL` | Frontend API base URL (empty for same-origin or reverse-proxy) | `http://localhost:8000` |
| `SECRET_KEY` | Cryptographic secret for hashing and tokens | `change_me_in_production` |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins | `http://localhost:5173,https://precare.app` |
| `DATABASE_URL` | SQLite database URI | `sqlite:///./precare.sqlite` |
| `AI_PROVIDER` | AI provider | `ollama` |
| `OLLAMA_BASE_URL` | Ollama server URL | `http://localhost:11434` |
| `OLLAMA_MODEL` | Clinical LLM model | `qwen3:8b` |

---

## Development Setup

### 1. Prerequisites
- **Node.js**: v18+ and `npm`
- **Python**: 3.10+ and `pip`
- **Ollama** (optional for local AI): `ollama pull qwen3:8b`

### 2. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
python -m pip install fastapi uvicorn httpx python-dotenv
```

---

## Starting the Application

### 1. Start Backend (FastAPI)
```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
Verify the backend is live:
```bash
curl http://localhost:8000/health
# {"status": "ok", "service": "precare-backend", "version": "1.0.0"}
```

### 2. Start Frontend (Vite)
```bash
npm run dev
```
Open **http://localhost:5173/** in your browser.

---

## Database Setup

The database initializes automatically on backend startup using SQLite (`precare.sqlite` by default).

- **Clinics Table**: Stores clinic metadata, doctor credentials, and cryptographic salt + hash (PBKDF2-HMAC-SHA512). Passwords are never stored in plaintext.
- **Cases Table**: Stores patient cases with foreign key index on `clinic_id` ensuring strict multi-tenant clinic isolation.

> **Production Note**: SQLite is suitable for single-node / container deployments with persistent volumes. For multi-instance distributed deployments, set `DATABASE_URL` to a distributed database or managed service.

---

## AI / Ollama Setup

1. Install Ollama from [ollama.ai](https://ollama.ai).
2. Pull the optimized clinical model:
   ```bash
   ollama pull qwen3:8b
   ```
3. Start Ollama:
   ```bash
   ollama serve
   ```
4. If Ollama is offline or unavailable, PreCare gracefully falls back to structured rule-based intake without crashing.

---

## Production Build

Build the static frontend bundle:

```bash
npm run build
```

The optimized production output is generated in `dist/`.

Run in production:
```bash
# Run backend with production worker configuration
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --workers 4
```
