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
