from pydantic import BaseModel
from typing import List, Optional

class DocumentAnalysisResponse(BaseModel):
    filename: str
    file_type: str
    page_count: int
    word_count: int
    character_count: int
    extraction_method: str  # e.g., "pdf_text", "image_ocr", "pdf_ocr"
    summary: str
    key_points: List[str]
    improvement_suggestions: List[str]
    extracted_text: str
