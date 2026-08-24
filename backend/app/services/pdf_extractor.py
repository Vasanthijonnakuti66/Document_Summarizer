import fitz  # PyMuPDF
import re

def extract_text_from_pdf(file_bytes: bytes):
    """
    Extracts text from PDF bytes page by page, preserving basic structure.
    Returns:
        dict: {
            "text": str,
            "page_count": int,
            "word_count": int,
            "character_count": int,
            "is_scanned": bool
        }
    """
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    page_count = len(doc)
    
    extracted_pages = []
    
    for page_num in range(page_count):
        page = doc[page_num]
        # Get blocks to preserve structure
        blocks = page.get_text("blocks")
        page_text_parts = []
        
        # Sort blocks by vertical position, then horizontal
        blocks.sort(key=lambda b: (b[1], b[0]))
        
        for block in blocks:
            block_text = block[4].strip()
            if block_text:
                page_text_parts.append(block_text)
                
        # Combine blocks with double newlines (paragraphs)
        page_text = "\n\n".join(page_text_parts)
        extracted_pages.append(f"--- Page {page_num + 1} ---\n{page_text}")
        
    full_text = "\n\n".join(extracted_pages)
    
    # Calculate word and character count
    clean_text_for_counts = re.sub(r'--- Page \d+ ---', '', full_text).strip()
    words = clean_text_for_counts.split()
    word_count = len(words)
    character_count = len(clean_text_for_counts)
    
    # Determine if PDF is scanned/image-only
    # If the text is very short (e.g. less than 50 characters across all pages), it is likely scanned
    is_scanned = character_count < 100
    
    return {
        "text": full_text,
        "page_count": page_count,
        "word_count": word_count,
        "character_count": character_count,
        "is_scanned": is_scanned,
        "doc": doc  # Keep doc reference if needed for OCR fallback
    }
