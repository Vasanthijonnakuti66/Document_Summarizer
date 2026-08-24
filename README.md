# Document Summary Assistant

An AI-powered document analysis application built as a modern, responsive single-page web app. It allows users to upload normal text PDFs, scanned PDFs, or images, automatically extracts text (utilizing structural PDF extraction and Tesseract OCR fallbacks), and generates structured, factual AI summaries conforming to custom length requests (short, medium, long), along with key points and document improvement suggestions.

---

## Architecture

The project is structured with a decoupled client-server architecture:

```mermaid
graph TD
    User([User]) -->|Upload PDF/Image| Frontend[Vite + React Client]
    Frontend -->|POST /api/documents/analyze| Backend[FastAPI Server]
    Backend -->|Type Detection| Router{Router}
    Router -->|Text PDF| PDFExtractor[PyMuPDF Service]
    Router -->|Image / Scanned PDF| OCRService[Tesseract OCR Service]
    PDFExtractor -->|Extracted Text| Summarizer[Gemini AI Summarizer]
    OCRService -->|Extracted Text| Summarizer
    Summarizer -->|JSON Response| Frontend
    Frontend -->|Render Analysis| Dashboard[Results Dashboard]
```

1. **Frontend (Vite + React)**: A lightweight, accessible, and responsive user interface built using React and styled with Tailwind CSS and Lucide Icons. Features an drag-and-drop landing upload zone, multi-step progress logging, and a client-side tab caching engine.
2. **Backend (FastAPI)**: A modular Python API that manages request routing, file validation, text extraction, OCR, and AI summarizer workflows.
3. **PDF Extractor (PyMuPDF)**: Parses searchable text page-by-page while preserving headings and paragraph boundaries.
4. **OCR Service (Tesseract & Pillow)**: Renders scanned PDF pages and images to high-resolution frames for Tesseract processing.
5. **AI Summarizer (Google Gemini API)**: Analyzes the text and responds with structured JSON containing summaries, bulleted key points, and action-oriented improvement suggestions. Features a map-reduce chunking strategy for long documents.

---

## Tech Stack

- **Frontend**: React (v19), Vite, Tailwind CSS, Lucide React
- **Backend**: Python (v3.11+), FastAPI, PyMuPDF, Pillow, PyTesseract, Google Generative AI SDK, PyTest

---

## Project Structure

```text
Document_Summarizer/
├── backend/
│   ├── app/
│   │   ├── routes/
│   │   │   └── document.py        # Analyze & health endpoints
│   │   ├── schemas/
│   │   │   └── document.py        # Response models
│   │   ├── services/
│   │   │   ├── pdf_extractor.py   # PyMuPDF text parser
│   │   │   ├── ocr_service.py     # Pillow + Tesseract engine
│   │   │   └── summarizer.py      # Gemini SDK integration
│   │   ├── utils/
│   │   │   └── file_validation.py # Extension, MIME & size checks
│   │   └── main.py                # Server entrypoint & CORS config
│   ├── tests/
│   │   └── test_endpoints.py      # PyTest endpoints suite
│   ├── requirements.txt           # Python dependencies
│   ├── .env                       # Environment variables (secret)
│   └── .env.example               # Configuration template
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── App.jsx                # React app layout & state
│   │   ├── App.css                # Style overrides
│   │   ├── index.css              # Tailwind imports
│   │   └── main.jsx               # React DOM bootstrap
│   ├── index.html                 # Main markup & head SEO metadata
│   ├── tailwind.config.js         # Tailwind configuration
│   ├── postcss.config.js          # PostCSS processing config
│   └── package.json               # Frontend dependencies
└── README.md                      # Documentation
```

---

## Local Setup

### Backend Setup

1. **Navigate to backend and install requirements**:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Configure Environment Variables**:
   Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```
   Add your Google Gemini API key:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-2.5-flash
   ```

3. **Install Tesseract OCR (Required for OCR feature)**:
   - **Windows**: Download the installer from UB Mannheim. Install it and add its installation path (e.g., `C:\Program Files\Tesseract-OCR\tesseract.exe`) to your `.env` as `TESSERACT_CMD` or add it to your system PATH.
   - **macOS**: Install via Homebrew: `brew install tesseract`.
   - **Linux**: Install via apt: `sudo apt-get install tesseract-ocr`.

4. **Run Backend Server**:
   ```bash
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
   *Verify health check at: `http://localhost:8000/api/documents/health`*

5. **Run Backend Tests**:
   ```bash
   $env:PYTHONPATH="."
   pytest tests/test_endpoints.py
   ```

### Frontend Setup

1. **Navigate to frontend and install dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Configure API URL**:
   Create a `.env` file if deploying to override default backend location:
   ```env
   VITE_API_URL=http://localhost:8000
   ```

3. **Run Dev Server**:
   ```bash
   npm run dev
   ```
   *Open the app in your browser at the address shown (usually `http://localhost:5173`)*

---

## API Documentation

### 1. Health Check
- **Endpoint**: `GET /api/documents/health`
- **Response**:
  ```json
  {
    "status": "ok",
    "message": "Document Summary Assistant API is healthy."
  }
  ```

### 2. Analyze Document
- **Endpoint**: `POST /api/documents/analyze`
- **Format**: `multipart/form-data`
- **Fields**:
  - `file`: Uploaded file (PDF/PNG/JPG/JPEG/WEBP)
  - `summary_length`: String (`short`, `medium`, `long`)
- **Response**:
  ```json
  {
    "filename": "annual_report.pdf",
    "file_type": "PDF",
    "page_count": 5,
    "word_count": 1420,
    "character_count": 8900,
    "extraction_method": "pdf_text",
    "summary": "This document outlines...",
    "key_points": [
      "Q4 Revenue increased by 15%",
      "Operating costs were reduced..."
    ],
    "improvement_suggestions": [
      "Add detail regarding future risks",
      "Include a table for quarterly breakdowns"
    ],
    "extracted_text": "ANNUAL REPORT 2026..."
  }
  ```

---

## Deployment

### Frontend (Vercel)
Vite projects can be easily deployed to Vercel:
1. Connect your repository to Vercel.
2. Set **Build Command** to `npm run build` and **Output Directory** to `dist`.
3. Set the Environment Variable `VITE_API_URL` to your backend URL (e.g., `https://your-backend.render.com`).

### Backend (Render / Railway / Docker)
Deploy the FastAPI backend to services like Render or Railway:
1. Set the build command to install dependencies: `pip install -r requirements.txt`.
2. Set the start command to: `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
3. Configure the environment variables `GEMINI_API_KEY`, `GEMINI_MODEL`, and `CORS_ORIGINS` (pointing to your Vercel URL).
4. *Note: Ensure your deployment environment has Tesseract binaries installed if testing image OCR in production.*

---

## Limitations

- **OCR Quality**: OCR accuracy is dependent on image resolution, lighting, and language structure.
- **Large Document Processing**: To prevent API token overflows, documents exceeding 30,000 characters are chunked and merged. Some nuanced cross-page context might get generalized.
- **AI Dependencies**: Summarization requires an active network connection to the Gemini API.

---

## Future Improvements

1. **Export Capabilities**: Add buttons to export summaries to PDF or Word documents.
2. **Multilingual OCR**: Allow users to specify target languages for OCR and translation.
3. **Document History**: Add local storage caching to browse previously summarized documents.
4. **Context Citations**: Extract page-specific line numbers or references to ground AI key points.
