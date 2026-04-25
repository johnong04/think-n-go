import os
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import uvicorn

# Load environment variables (if needed by the imported classes)
load_dotenv()

# Import the pre-defined classes
from utils.ToolsSelectionAgent import ToolsSelectionAgent
from utils.OpenAIModel import OpenAIModel
from utils.MarkitdownTool import MarkItDownConverter
from utils.FraudDetection import FraudDetector
from utils.OCRScanner import OCRScanner
from utils.DisputeResolutionPipeline import DisputeResolutionPipeline
from utils.ConversationAnalysisAgent import ConversationAnalysisAgent

app = FastAPI()

# Allow CORS (adjust allowed origins as needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instantiate the imported classes
tool_agent = ToolsSelectionAgent()
openai_model = OpenAIModel()
agent = ConversationAnalysisAgent()

# -------------------------------
# Pydantic Models for Requests and Responses
# -------------------------------

class EmbeddingRequest(BaseModel):
    text: str

class ToolSelectionRequest(BaseModel):
    context: str
    available_tools: dict  # e.g., {"getBuyerBankStatement": "description", ...}

class FraudDetectionRequest(BaseModel):
    text: str
    warning_count: int = 0

class FraudDetectionResponse(BaseModel):
    result: str  # "No Fraud" or "Fraud Detected"
    warning_count: int
    escalate: bool

# Response model for dispute resolution
class DisputeResolutionResponse(BaseModel):
    resolution: str
    selected_tool: str
    escalate: bool

# -------------------------------
# FastAPI Endpoints
# -------------------------------

@app.post("/embed")
async def embed_text(request: EmbeddingRequest):
    """
    Endpoint to create an embedding for the provided text.
    """
    try:
        embedding = openai_model.create_embedding(request.text)
        return {"embedding": embedding}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Endpoint to transcribe an uploaded audio file.
    """
    try:
        # Save the uploaded file temporarily
        file_location = f"temp_{file.filename}"
        with open(file_location, "wb") as f:
            content = await file.read()
            f.write(content)
        
        transcription = openai_model.transcribe_audio(file_location)
        os.remove(file_location)  # Clean up the temporary file
        return {"transcription": transcription}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/markitdown")
async def convert_pdf(file: UploadFile = File(...)):
    """
    Endpoint to convert an uploaded PDF file to Markdown text using MarkItDown.
    """
    temp_file = f"temp_{file.filename}"
    try:
        # Save the uploaded PDF file temporarily
        with open(temp_file, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Instantiate the converter and perform the conversion
        converter = MarkItDownConverter()
        markdown_text = converter.convert_pdf_to_markdown(temp_file)
        
        # Clean up the temporary file
        os.remove(temp_file)
        return {"markdown": markdown_text}
    
    except Exception as e:
        if os.path.exists(temp_file):
            os.remove(temp_file)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ocrscanner")
async def ocrscanner(file: UploadFile = File(...)):
    """
    Endpoint to convert an uploaded PDF file to Markdown text using OCRScanner.
    This endpoint uses the OCRScanner class which first converts the PDF pages to images 
    (using PyMuPDF, hence avoiding Poppler) and then uses Gemini for OCR extraction.
    """
    temp_file = f"temp_{file.filename}"
    try:
        # Save the uploaded PDF file temporarily
        with open(temp_file, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Instantiate OCRScanner and perform the conversion
        scanner = OCRScanner()
        markdown_text = scanner.convert_pdf_to_markdown(temp_file)
        
        # Clean up the temporary file
        os.remove(temp_file)
        return {"markdown": markdown_text}
    
    except Exception as e:
        if os.path.exists(temp_file):
            os.remove(temp_file)
        raise HTTPException(status_code=500, detail=str(e))


# Request/Response Models
class FraudDetectionRequest(BaseModel):
    text: str
    warning_count: int = 0


class FraudDetectionResponse(BaseModel):
    status: str
    message: str
    warning_count: int
    escalate: bool

@app.post("/fraud_detection_firewall", response_model=FraudDetectionResponse)
async def analyze_text(request: FraudDetectionRequest):
    """
    Endpoint for fraud detection analysis
    """
    try:
        message, new_count, escalate = FraudDetector().analyze_text(
            text=request.text,
            warning_count=request.warning_count
        )
        
        return FraudDetectionResponse(
            status="ALERT" if "Warning" in message else "CLEAN",
            message=message,
            warning_count=new_count,
            escalate=escalate
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Analysis error: {str(e)}"
        )

# Request Model
class ConversationAnalysisRequest(BaseModel):
    context: str

# Response Model
class ConversationAnalysisResponse(BaseModel):
    selected_tool: str

@app.post("/analyze_conversation", response_model=ConversationAnalysisResponse)
async def analyze_conversation(request: ConversationAnalysisRequest):
    """
    Endpoint to analyze a conversation and select the appropriate tool.
    """
    try:
        selected_tool = agent.analyze_conversation(request.context)
        return {"selected_tool": selected_tool}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/select_tool")
async def select_tool(request: ToolSelectionRequest):
    """
    Endpoint to select the most appropriate tool based on the provided context.
    """
    try:
        selected_tool = tool_agent.select_tool(request.context, request.available_tools)
        return {"selected_tool": selected_tool}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/resolve_dispute", response_model=DisputeResolutionResponse)
async def resolve_dispute_endpoint(
    conversation_chain: str = Form(...),
    pdf_file_buyer: UploadFile = File(...),
    pdf_file_seller: UploadFile = File(...)
):
    """
    Endpoint to process the dispute using DisputeResolutionPipeline.
    """
    temp_file1 = f"temp_{pdf_file_buyer.filename}"
    temp_file2 = f"temp_{pdf_file_seller.filename}"
    try:
        # Save the uploaded PDF files temporarily
        with open(temp_file1, "wb") as f1:
            content1 = await pdf_file_buyer.read()
            f1.write(content1)
        
        with open(temp_file2, "wb") as f2:
            content2 = await pdf_file_seller.read()
            f2.write(content2)
        
        # Instantiate the DisputeResolutionPipeline
        pipeline = DisputeResolutionPipeline(model="gpt-4o")
        
        # Process the dispute
        result = pipeline.process_dispute(conversation_chain, temp_file1, temp_file2)
        
        # Clean up the temporary files
        os.remove(temp_file1)
        os.remove(temp_file2)
        
        return DisputeResolutionResponse(
            resolution=result["resolution"],
            selected_tool=result["selected_tool"],
            escalate=result.get("escalate", False)
        )
    except Exception as e:
        # Clean up the temporary files if they exist
        if os.path.exists(temp_file1):
            os.remove(temp_file1)
        if os.path.exists(temp_file2):
            os.remove(temp_file2)
        raise HTTPException(status_code=500, detail=str(e))

# -------------------------------
# To run the FastAPI server:
if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
# -------------------------------