# Meditation Generation Engine — Backend

A Python backend that generates personalized meditation audio from text descriptions.

## Quick Start

```bash
# 1. Activate virtual environment
source venv/bin/activate

# 2. Set up your API keys in .env
#    OPENAI_API_KEY is needed for LLM classification + script generation
#    ELEVENLABS_API_KEY is optional (falls back to Edge TTS)

# 3. Run tests
pytest tests/ -v

# 4. Start the server
uvicorn api.main:app --reload --port 8000

# 5. Generate a meditation
curl -X POST http://localhost:8000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"stressor": "anxiety about tomorrow", "duration_mins": 5}'
```

## Architecture

```
Stressor text → Classifier → Script Generator → Validator → TTS → Composer → Mastering → Storage
                (OpenAI)      (OpenAI)           (rules)    (Edge) (pydub)    (FFmpeg)     (local)
```

### Duration Control (Core Algorithm)

The engine guarantees audio within ±15 seconds of the target duration:

1. **Generate script** — LLM writes prose with named pause types
2. **Build timeline** — Engine assigns weights to pauses (not durations)
3. **Generate TTS** — Measure actual duration of each speech segment
4. **Calculate budget** — `pause_budget = target - speech - breath`
5. **Distribute pauses** — Budget split proportionally by weight, respecting minimums
6. **Assemble** — Speech + pauses + breath = exact target duration

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/generate` | Start a meditation generation job |
| GET | `/api/generate/stream/{job_id}` | SSE progress stream |
| GET | `/api/status/{job_id}` | Get job status |
| GET | `/api/history` | List past jobs |
| GET | `/api/health` | Health check |

## Project Structure

```
backend/
├── engine/          # Core generation pipeline
│   ├── models/      # Data models (events, timeline, etc.)
│   ├── nodes/       # Pipeline nodes (classifier, TTS, etc.)
│   ├── tts/         # TTS provider abstraction
│   ├── audio/       # Audio processing (reconciler, composer, FFmpeg)
│   └── profiles/    # Static config (pacing, breath patterns)
├── api/             # FastAPI layer
├── db/              # SQLAlchemy models + session
├── storage/         # Storage abstraction (local, S3 stub)
├── config/          # Settings + LLM config
├── tests/           # Tests organized by phase
└── scripts/         # CLI tools
```

## Deployment & VPS Architecture

This project is deployed on a Hostinger VPS and configured with an automated Git pipeline (CI/CD) and Nginx reverse proxy.

### 1. Architecture Flow
```text
Client Request (HTTPS) 
  → Nginx (Reverse Proxy + SSL on unblock-api.axonic.cloud)
  → Docker Container (FastAPI App on port 8001)
  → Redis Container (Docker Bridge Network)
  → AWS S3 (Audio Storage) & SQLite (Database Volume)
```

### 2. VPS Access & Operations
* **SSH to VPS**:
  ```bash
  ssh deploy@srv1391251.hstgr.cloud
  ```
  *(Uses the authorized SSH key `id_ed25519` on your local Mac.)*

* **Checking Application Status**:
  ```bash
  docker ps
  ```
* **View Server Logs**:
  ```bash
  docker compose -f /opt/apps/unblock-focus/backend/deploy/docker-compose.yml logs -f
  ```
* **Manually Restart Backend**:
  ```bash
  /opt/apps/unblock-focus/backend/start.sh
  ```

### 3. Docker Compose Setup
The backend runs inside a Docker container with an internal bridge network to Redis. 
* **Port Mapping**: The backend container binds internally to port `8000` but maps to host port `8001` (`127.0.0.1:8001:8000`) to avoid conflicts with other apps (like `feather-ai-backend` on port `8000`).
* **Volume Mapping**: Database (`/app/data`) and media (`/app/media`) are mapped to persistent Docker volumes.

### 4. Nginx & Domain Routing
Nginx manages SSL and routes traffic to the container.
* **Config File Location on VPS**: `/etc/nginx/sites-available/axonic`
* **Subdomain configuration block**:
  ```nginx
  server {
      listen 443 ssl http2;
      server_name unblock-api.axonic.cloud;
      
      # SSL Certs paths (managed by Certbot)
      ssl_certificate /etc/letsencrypt/live/unblock-api.axonic.cloud/fullchain.pem;
      ssl_certificate_key /etc/letsencrypt/live/unblock-api.axonic.cloud/privkey.pem;

      location / {
          proxy_pass http://127.0.0.1:8001;
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          
          # SSE Buffering Off (Critical for real-time progress updates)
          proxy_http_version 1.1;
          proxy_set_header Connection "";
          proxy_buffering off;
          proxy_cache off;
          chunked_transfer_encoding off;
      }
  }
  ```

### 5. Automatic GitHub Actions Pipeline
Defined in `.github/workflows/deploy-backend.yml`. 
1. **Trigger**: When changes are pushed to `main` under the `backend/` directory.
2. **Action**: Connects to VPS via SSH using GitHub secrets (`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`).
3. **Execution**: Navigates to `/opt/apps/unblock-focus`, runs `git pull`, and executes `backend/start.sh` to rebuild the Docker image and restart the containers.

