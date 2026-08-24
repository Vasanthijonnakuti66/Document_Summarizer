from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from app.utils.file_validation import validate_uploaded_file
from app.services.pdf_extractor import extract_text_from_pdf
from app.services.ocr_service import perform_ocr_on_image, perform_ocr_on_pdf
from app.services.summarizer import generate_analysis
from app.schemas.document import DocumentAnalysisResponse
import os
import re

router = APIRouter()

@router.get("/health")
def health_check():
    return {"status": "ok", "message": "Document Summary Assistant API is healthy."}

@router.post("/analyze", response_model=DocumentAnalysisResponse)
async def analyze_document(
    file: UploadFile = File(...),
    summary_length: str = Form("medium")
):
    # 1. Validate summary length parameter
    summary_length = summary_length.lower().strip()
    if summary_length not in {"short", "medium", "long"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="summary_length must be one of: 'short', 'medium', 'long'."
        )

    # 2. Run validations on file type and size
    validate_uploaded_file(file)

    try:
        # Read the file contents
        file_bytes = await file.read()
        filename = file.filename or "document"
        _, ext = os.path.splitext(filename.lower())
        
        extracted_text = ""
        page_count = 1
        extraction_method = ""
        
        # 3. Text extraction based on file extension
        if ext == ".pdf":
            # Extract PDF using PyMuPDF
            pdf_data = extract_text_from_pdf(file_bytes)
            page_count = pdf_data["page_count"]
            
            if pdf_data["is_scanned"]:
                # Scanned PDF fallback
                extracted_text = perform_ocr_on_pdf(pdf_data["doc"])
                extraction_method = "pdf_ocr"
            else:
                extracted_text = pdf_data["text"]
                extraction_method = "pdf_text"
        else:
            # Image OCR path
            extracted_text = perform_ocr_on_image(file_bytes)
            extraction_method = "image_ocr"
            page_count = 1

        # 4. Check if we extracted any text
        # Remove page headers and whitespace for validation
        clean_check = re.sub(r'--- Page \d+( \(OCR\))? ---', '', extracted_text).strip()
        if not clean_check:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to extract any text from the uploaded document. Please check if the file is blank or corrupted."
            )

        # 5. Count final stats
        words = clean_check.split()
        word_count = len(words)
        character_count = len(clean_check)

        # 6. Generate AI Summary using Gemini Service
        analysis_result = generate_analysis(extracted_text, summary_length)

        # 7. Construct Response
        return DocumentAnalysisResponse(
            filename=filename,
            file_type=ext.lstrip('.').upper(),
            page_count=page_count,
            word_count=word_count,
            character_count=character_count,
            extraction_method=extraction_method,
            summary=analysis_result.get("summary", ""),
            key_points=analysis_result.get("key_points", []),
            improvement_suggestions=analysis_result.get("improvement_suggestions", []),
            extracted_text=extracted_text
        )

    except HTTPException as he:
        # Re-raise HTTPExceptions
        raise he
    except Exception as e:
        # Prevent stack trace leaks
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred during document processing: {str(e)}"
        )
