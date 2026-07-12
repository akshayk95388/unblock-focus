#!/bin/bash

# Navigate to backend folder
cd "$(dirname "$0")"

echo "🚀 Starting unblock-focus backend in Docker..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found in backend/.env. Creating one from default settings..."
    echo "OPENAI_API_KEY=your_key_here" > .env
    echo "ELEVENLABS_API_KEY=" >> .env
    echo "LANGCHAIN_API_KEY=" >> .env
    echo "📝 Please edit backend/.env and add your credentials before running again."
    exit 1
fi

# Run docker-compose
docker compose -f deploy/docker-compose.yml up -d --build

echo "✅ Containers are starting!"
echo "📍 You can view logs using: docker compose -f deploy/docker-compose.yml logs -f"
