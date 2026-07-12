# Use official Python image as base
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
# - build-essential and libpq-dev for compiled python dependencies
# - ffmpeg is required by pydub for audio processing/composition
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements.txt and install python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all project files
COPY . .

# Ensure storage directories exist for volumes
RUN mkdir -p /app/data /app/media

# Expose port 8000
EXPOSE 8000

# Set environment variables
ENV PYTHONUNBUFFERED=1
# Override defaults to use a persistent volume mount for database and media files
ENV DATABASE_URL=sqlite+aiosqlite:////app/data/meditation.db
ENV MEDIA_DIR=/app/media

# Start FastAPI app
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
