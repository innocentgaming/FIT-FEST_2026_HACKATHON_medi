# MediLink CARE — Production Deployment & Cloud Run Guide

**Target Cloud Platform**: Google Cloud Run (Fully Managed Serverless Container)  
**Alternative Supported Platforms**: Render, Railway, AWS ECS, Self-Hosted Docker  
**Port Convention**: Cloud Run dynamic `$PORT` binding (`0.0.0.0:${PORT:-8080}`)

---

## 1. Google Cloud Run Deployment (Recommended)

### 1.1. Prerequisites
- Google Cloud SDK (`gcloud` CLI installed and authenticated).
- Active GCP Project with Cloud Run and Artifact Registry APIs enabled:
```bash
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com
```

### 1.2. Automated 1-Command Deployment
Run from the root of the repository:
```bash
# 1. Build container image in Cloud Build
gcloud builds submit --tag gcr.io/[YOUR_GCP_PROJECT_ID]/medilink-care:latest .

# 2. Deploy to Cloud Run
gcloud run deploy medilink-care \
  --image gcr.io/[YOUR_GCP_PROJECT_ID]/medilink-care:latest \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars="NODE_ENV=production,PORT=8080,JWT_SECRET=[YOUR_STRONG_SECRET]"
```

---

## 2. Multi-Stage Docker Container Architecture

The repository utilizes an optimized multi-stage build:
- **Stage 1 (Frontend Builder)**: Node.js 20-alpine builds React 18 SPA into `/app/frontend/dist` with code-splitting.
- **Stage 2 (Production Runner)**: Minimal Node.js 20-alpine runner installs production-only dependencies and copies compiled frontend static assets into `/app/public`.
- **Unified Delivery**: Express serves `/app/public` for root and SPA client routes, and `/api/*` for REST/WebSocket endpoints.

### Local Docker Test:
```bash
docker build -t medilink-care:local .
docker run -d -p 8080:8080 -e PORT=8080 -e NODE_ENV=production --name medilink medilink-care:local
```
Verify at `http://localhost:8080/health`.

---

## 3. Vercel (Frontend) + Render (Backend) Hybrid Architecture

For distributed edge deployments:

### Backend on Render:
1. Connect repository to Render Web Service.
2. Root Directory: `backend`
3. Build Command: `npm install`
4. Start Command: `node src/server.js`
5. Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `5000`
   - `JWT_SECRET`: `[YOUR_SECRET]`
   - `ALLOWED_ORIGINS`: `https://[YOUR_VERCEL_APP].vercel.app`

### Frontend on Vercel:
1. Connect repository to Vercel Project.
2. Root Directory: `frontend`
3. Framework Preset: `Vite`
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Configuration ([`frontend/vercel.json`](file:///d:/medi/frontend/vercel.json)):
```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://medilink-backend-q2rh.onrender.com/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## 4. Environment Variables Reference

| Variable | Type | Default | Description |
| :--- | :---: | :---: | :--- |
| `NODE_ENV` | String | `production` | Enables production error redaction |
| `PORT` | Number | `8080` / `5000` | Server listening port |
| `JWT_SECRET` | String | *Required* | High-entropy key for token signing |
| `ALLOWED_ORIGINS` | String | `*` | Comma-separated CORS allowed domains |
| `DB_FILE_PATH` | String | `./src/db/data.json` | Path to persistent storage |
| `LOG_LEVEL` | String | `info` | Logging verbosity |

---

## 5. Post-Deployment Verification & Smoke Tests

Execute after deployment:
```bash
# 1. Health check probe
curl -I https://[YOUR_DEPLOYMENT_URL]/health

# 2. Scope & compliance verification
curl https://[YOUR_DEPLOYMENT_URL]/api/health

# 3. Static frontend root
curl -I https://[YOUR_DEPLOYMENT_URL]/
```
