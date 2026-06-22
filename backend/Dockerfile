# Build from repository root:
#   docker build -f backend/Dockerfile .
#
# API image includes guide bootstrap JSON and images for import/sync on Railway.
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

COPY mobile/src/data/bootstrap/ /app/guide_bundle/bootstrap/
COPY mobile/src/assets/images/ /app/guide_bundle/assets/images/

ENV GUIDE_BUNDLE_DIR=/app/guide_bundle

CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
