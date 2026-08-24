import os
import io
import fitz
import pytesseract
from PIL import Image
from fastapi import HTTPException, status
from dotenv import load_dotenv

load_dotenv()

# Configure custom tesseract command path if specified in .env
tesseract_cmd = os.getenv("TESSERACT_CMD")
if tesseract_cmd:
    pytesseract.pytesseract.tesseract_cmd = tesseract_cmd

def verify_tesseract_availability():
    """Checks if Tesseract is available. Raises a user-friendly HTTPException if not."""
    try:
        pytesseract.get_tesseract_version()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "OCR Service is currently unavailable because Tesseract OCR is not installed or configured on the server. "
                "To enable OCR, please install Tesseract OCR on your system and set the TESSERACT_CMD environment variable "
                "to point to the tesseract executable (e.g. C:\\Program Files\\Tesseract-OCR\\tesseract.exe)."
            )
        )

def perform_ocr_on_image(image_bytes: bytes) -> str:
    """Performs OCR on raw image bytes."""
    verify_tesseract_availability()
    try:
        img = Image.open(io.BytesIO(image_bytes))
        # Ensure RGB mode
        if img.mode not in ("L", "RGB"):
            img = img.convert("RGB")
        text = pytesseract.image_to_string(img)
        return text.strip()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OCR processing failed on the image: {str(e)}"
        )

def perform_ocr_on_pdf(doc: fitz.Document) -> str:
    """Renders each page of the PDF to a high-res image and runs OCR."""
    verify_tesseract_availability()
    ocr_pages = []
    
    try:
        for page_num in range(len(doc)):
            page = doc[page_num]
            # Render page to image (zoom makes the text sharper/easier to read for OCR)
            zoom = 2.0  # scale factor
            mat = fitz.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=mat)
            
            # Convert pixmap to PIL Image
            img_data = pix.tobytes("png")
            img = Image.open(io.BytesIO(img_data))
            
            # OCR the image
            page_text = pytesseract.image_to_string(img)
            ocr_pages.append(f"--- Page {page_num + 1} (OCR) ---\n{page_text.strip()}")
            
        return "\n\n".join(ocr_pages)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OCR processing failed on the scanned PDF: {str(e)}"
        )
