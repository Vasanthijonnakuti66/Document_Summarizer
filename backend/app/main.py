import os
import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.routes import document

load_dotenv()

app = FastAPI(
    title="Document Summary Assistant API",
    description="Backend API for extracting text and generating AI summaries from documents.",
    version="1.0.0"
)

# Configure CORS
cors_origins_raw = os.getenv("CORS_ORIGINS")
origins = []
if cors_origins_raw:
    try:
        origins = json.loads(cors_origins_raw)
    except Exception:
        origins = [cors_origins_raw]

# Fallbacks for safety during dev/deployment
if not origins:
    origins = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000"
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root endpoint
@app.get("/")
def read_root():
    return {
        "name": "Document Summary Assistant API",
        "version": "1.0.0",
        "status": "online",
        "endpoints": {
            "health": "/api/health",
            "analyze": "/api/documents/analyze (POST)"
        }
    }

# Include API Router
app.include_router(document.router, prefix="/api/documents", tags=["documents"])

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
