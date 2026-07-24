# syntax=docker/dockerfile:1
FROM python:3.12-slim AS base

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .


# Expose API port
EXPOSE 8000

# Default: run Uvicorn ASGI server with dynamic port support (for Railway/Heroku)
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
