import io
import pytest
from fastapi.testclient import TestClient
from fastapi import HTTPException
from app.main import app
from app.utils.file_validation import validate_uploaded_file
from app.services.pdf_extractor import extract_text_from_pdf
from unittest.mock import patch, MagicMock
from fastapi import UploadFile

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/documents/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert "healthy" in response.json()["message"]

def test_file_validation_valid():
    # Test valid PDF UploadFile
    mock_file = MagicMock(spec=UploadFile)
    mock_file.filename = "test.pdf"
    mock_file.content_type = "application/pdf"
    
    # Mocking seek/tell for file size (1 KB)
    mock_file.file = MagicMock()
    mock_file.file.tell.return_value = 1024
    
    # Should not raise exception
    validate_uploaded_file(mock_file)

def test_file_validation_invalid_ext():
    mock_file = MagicMock(spec=UploadFile)
    mock_file.filename = "test.txt"
    mock_file.content_type = "text/plain"
    
    with pytest.raises(HTTPException) as exc_info:
        validate_uploaded_file(mock_file)
    assert exc_info.value.status_code == 400
    assert "Unsupported file extension" in exc_info.value.detail

def test_file_validation_empty_file():
    mock_file = MagicMock(spec=UploadFile)
    mock_file.filename = "test.pdf"
    mock_file.content_type = "application/pdf"
    mock_file.file = MagicMock()
    mock_file.file.tell.return_value = 0
    
    with pytest.raises(HTTPException) as exc_info:
        validate_uploaded_file(mock_file)
    assert exc_info.value.status_code == 400
    assert "empty" in exc_info.value.detail

def test_pdf_extraction_scanned_check():
    # Since PyMuPDF needs real PDF bytes, we check the function logic.
    # Empty/fake pdf bytes should raise fitz error or be handled.
    # Let's test with minimal valid empty PDF bytes if possible, or mock fitz.open.
    with patch("fitz.open") as mock_fitz_open:
        mock_doc = MagicMock()
        mock_fitz_open.return_value = mock_doc
        mock_doc.__len__.return_value = 1
        
        mock_page = MagicMock()
        mock_doc.__getitem__.return_value = mock_page
        mock_page.get_text.return_value = [
            (0, 0, 100, 100, "Extractable Text Block that is long enough to pass the scanned PDF character count threshold. It needs to be more than one hundred characters long to simulate a text PDF.", 0, 0)
        ]
        
        result = extract_text_from_pdf(b"dummy_bytes")
        assert result["page_count"] == 1
        assert result["is_scanned"] is False
        assert "Extractable Text Block" in result["text"]

@patch("app.routes.document.generate_analysis")
def test_analyze_endpoint_mocked(mock_gen_analysis):
    # Mocking Gemini response
    mock_gen_analysis.return_value = {
        "summary": "This is a mock summary.",
        "key_points": ["Point 1", "Point 2"],
        "improvement_suggestions": ["Suggestion 1"]
    }
    
    # We also mock pdf extraction to return standard text
    with patch("app.routes.document.extract_text_from_pdf") as mock_extract:
        mock_extract.return_value = {
            "text": "This is text from page 1. It has enough words.",
            "page_count": 1,
            "word_count": 10,
            "character_count": 50,
            "is_scanned": False
        }
        
        # Call the actual client
        file_data = {"file": ("test.pdf", b"pdf_binary_content", "application/pdf")}
        response = client.post(
            "/api/documents/analyze",
            files=file_data,
            data={"summary_length": "medium"}
        )
        
        assert response.status_code == 200
        json_resp = response.json()
        assert json_resp["filename"] == "test.pdf"
        assert json_resp["file_type"] == "PDF"
        assert json_resp["summary"] == "This is a mock summary."
        assert len(json_resp["key_points"]) == 2
        assert json_resp["extraction_method"] == "pdf_text"
