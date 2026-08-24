import os
import json
from fastapi import HTTPException, status
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# We initialize genai inside a helper or check if key is set when called.
# This prevents crashes at startup if the API key is not present.
def get_gemini_model():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GEMINI_API_KEY is not set. Please set the environment variable and try again."
        )
    
    genai.configure(api_key=api_key)
    model_name = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
    return genai.GenerativeModel(model_name)

def chunk_text(text: str, max_chars: int = 25000, overlap: int = 2000) -> list[str]:
    """Chunks text to prevent token overflow on extremely long documents."""
    chunks = []
    start = 0
    text_len = len(text)
    
    while start < text_len:
        end = min(start + max_chars, text_len)
        chunks.append(text[start:end])
        start += max_chars - overlap
        
    return chunks

def summarize_chunk(model, chunk_text_data: str) -> str:
    """Summarizes a single chunk of a large document."""
    prompt = f"""
    Please write a concise summary of the following document chunk. 
    Only include factual information present in this text.

    Text:
    {chunk_text_data}
    """
    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gemini API error during intermediate summarization: {str(e)}"
        )

def generate_analysis(text: str, summary_length: str) -> dict:
    """
    Generates summary, key points, and suggestions from text using Gemini.
    If the text is too long, we summarize chunks first, then perform final analysis.
    """
    model = get_gemini_model()
    
    # Chunking strategy for long documents (e.g. > 30k characters)
    if len(text) > 30000:
        chunks = chunk_text(text)
        chunk_summaries = []
        for i, chunk in enumerate(chunks):
            summary = summarize_chunk(model, chunk)
            chunk_summaries.append(f"Summary of Part {i+1}:\n{summary}")
        
        # Combine intermediate summaries
        analyzed_text = "\n\n".join(chunk_summaries)
    else:
        analyzed_text = text

    # Set up length-specific prompt instructions
    if summary_length == "short":
        length_instr = "A concise summary of exactly 3-5 sentences."
    elif summary_length == "medium":
        length_instr = "A summary of 1-3 detailed paragraphs."
    elif summary_length == "long":
        length_instr = "A detailed, comprehensive summary of multiple structured paragraphs."
    else:
        length_instr = "A summary."

    prompt = f"""
    You are an expert document analysis assistant. Analyze the following document text and output a JSON object containing a summary, key points, and improvement suggestions.

    Rules:
    1. Only use facts directly present in the document. Do not invent or assume anything.
    2. Preserve important names, dates, numbers, findings, and conclusions.
    3. Generate the "summary" field conforming to: {length_instr}
    4. Provide a list of 5-8 key points in the "key_points" field.
    5. Provide a list of 3-5 structural or content improvement suggestions in the "improvement_suggestions" field.
       Ensure they are specific to the document's content, clarity, structure, and potential gaps.

    Document Text:
    {analyzed_text}

    Output JSON Format:
    {{
      "summary": "...",
      "key_points": ["...", "..."],
      "improvement_suggestions": ["...", "..."]
    }}
    """
    
    try:
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        
        result_dict = json.loads(response.text.strip())
        return result_dict
        
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to parse structured JSON response from the Gemini API."
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gemini API call failed: {str(e)}"
        )
