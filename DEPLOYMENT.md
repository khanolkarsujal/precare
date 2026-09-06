# PreCare SaaS — $0 Production Deployment Guide

> **IMPORTANT BUSINESS PRINCIPLE: $0 FIRST**
> **NO PAID SERVICES ARE REQUIRED FOR THE INITIAL MARKET VALIDATION DEPLOYMENT.**
> PreCare is deployed completely free during clinical validation. Once clinics start paying, revenue is reinvested into paid infrastructure.

---

## 1. Zero-Cost Infrastructure Stack

| Layer | Provider | Plan | Cost |
| :--- | :--- | :--- | :--- |
| **Source Control** | GitHub | Free public or private repo | **$0** |
| **Database** | Neon.tech or Render PostgreSQL | Free Serverless PostgreSQL (0.5 GB) | **$0** |
| **Backend API** | Render.com | Free Web Service (Python FastAPI) | **$0** |
| **Frontend** | Vercel | Free Hobby Tier (React / Vite SPA) | **$0** |
| **AI Inference** | Groq (console.groq.com) | Free Tier (Llama 3.1 8B Instant) | **$0** |
| **SSL / HTTPS** | Vercel & Render | Automated Let's Encrypt certificates | **$0** |
| **Total Monthly Cost** | | | **$0.00 / month** |

---

## 2. Step-by-Step Deployment Order

### Step 1: Push Code to GitHub Free
1. Initialize local repository (if not already done):
   ```bash
   git init
   git add .
   git commit -m "feat: deployable PreCare SaaS"
   ```
2. Create a new repository on [GitHub](https://github.com/new) named `precare`.
3. Link and push to GitHub:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<your-username>/precare.git
   git push -u origin main
   ```
*(Note: `.gitignore` automatically prevents `.env`, `precare.sqlite`, `node_modules`, and test files from being committed.)*

---

### Step 2: Set Up Free Cloud PostgreSQL
1. Create a free account on **[Neon.tech](https://neon.tech)** (or Render PostgreSQL).
2. Create a new project: `precare-db`.
3. Copy the pooled connection string:
   ```text
   postgresql://<user>:<password>@<ep-pooler>.neon.tech/neondb?sslmode=require
   ```
*(PreCare's `backend/database.py` automatically initializes tables `clinics` and `cases` and indexes on startup.)*

---

### Step 3: Deploy Backend on Render Free
1. Log in to **[Render.com](https://render.com)**.
2. Click **New +** → **Web Service**.
3. Select your GitHub repository `precare`.
4. Configure service settings:
   - **Name**: `precare-backend`
   - **Region**: Oregon (or closest to your clinics)
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/health`
5. Add Environment Variables under **Environment**:
   | Key | Example / Safe Value | Notes |
   | :--- | :--- | :--- |
   | `ENVIRONMENT` | `production` | Enforces production security checks |
   | `SECRET_KEY` | *(Click "Generate" or 64-char random string)* | Cryptographic session token signature |
   | `DATABASE_URL` | `postgresql://...` *(from Neon)* | Cloud PostgreSQL connection string |
   | `CORS_ORIGINS` | `https://precare.vercel.app` | Updated in Step 6 after frontend deploys |
   | `AI_PROVIDER` | `groq` | Online AI inference provider |
   | `AI_API_BASE` | `https://api.groq.com/openai/v1` | OpenAI-compatible endpoint |
   | `AI_API_KEY` | *(Your free Groq key)* | From console.groq.com |
   | `AI_MODEL` | `llama-3.1-8b-instant` | Fast clinical JSON extraction |
6. Click **Deploy Web Service**.
7. Once deployed, note your backend URL: e.g., `https://precare-backend.onrender.com`.
8. Verify health endpoint in browser: `https://precare-backend.onrender.com/health`.

---

### Step 4: Deploy Frontend on Vercel Free
1. Log in to **[Vercel.com](https://vercel.com)**.
2. Click **Add New...** → **Project**.
3. Import your GitHub repository `precare`.
4. Framework Preset: **Vite** (auto-detected).
5. Build and Output Settings:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. Add Environment Variable:
   | Key | Value |
   | :--- | :--- |
   | `VITE_API_URL` | `https://precare-backend.onrender.com` |
7. Click **Deploy**.
8. Direct links and refreshes (`/signup`, `/login`, `/dashboard`, `/intake/:clinicId`) work automatically via `vercel.json`.

---

### Step 5: Configure Free-Tier Online AI (Groq)
1. Go to **[console.groq.com](https://console.groq.com)** and create a free account.
2. Go to **API Keys** → **Create API Key**.
3. Copy key and paste into Render backend environment variable `AI_API_KEY`.
*(No credit card is required. Groq free tier provides fast inference with high rate limits.)*

---

### Step 6: Connect & Lock Down CORS
1. Once Vercel assigns your frontend URL (e.g., `https://precare.vercel.app`), go back to **Render Dashboard** → **precare-backend** → **Environment**.
2. Update `CORS_ORIGINS`:
   ```text
   https://precare.vercel.app
   ```
3. Save changes. Render will perform an automated zero-downtime redeployment.

---

### Step 7: End-to-End Validation from Another Device / Network
1. Open `https://precare.vercel.app` on your smartphone (cellular network).
2. Register a new clinic account:
   - Clinic Name: `Test Family Clinic`
   - Doctor Name: `Dr. Tester`
   - Email: `dr.test@example.com`
   - Password: `SecurePassword123`
3. Complete Onboarding setup.
4. Copy the unique clinic intake link:
   `https://precare.vercel.app/intake/test-family-clinic-xxxx`
5. Open an incognito browser tab or send the link to another phone.
6. Complete a sample patient intake as a patient.
7. Switch back to the Doctor Dashboard:
   - Confirm the new patient appears immediately in the queue.
   - Click "Open Case" → review structured history.
   - Click "Start Consultation" → verify workspace and auto-save notes.
   - Click "Complete Consultation" → verify status updates to Completed.

---

## 3. Local Development Mode (Preserved)

For local development with zero cloud dependencies:
```bash
# 1. Run FastAPI backend locally with SQLite and Ollama:
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000

# 2. In another terminal, run Vite dev server:
npm run dev
```
Local configuration uses:
- SQLite (`precare.sqlite`)
- Local Ollama (`http://localhost:11434` with `qwen3:8b`)
- Vite proxy forwarding `/api` and `/health` to `http://127.0.0.1:8000`
