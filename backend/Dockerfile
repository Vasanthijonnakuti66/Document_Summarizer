FROM python:3.11-slim

# Install system dependencies required for OCR
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy backend files
COPY . .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Render provides the PORT environment variable
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]