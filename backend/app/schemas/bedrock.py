from pydantic import BaseModel, Field


class BedrockChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    system_prompt: str | None = None
    max_tokens: int = Field(default=512, ge=1, le=4096)
    temperature: float = Field(default=0.2, ge=0, le=1)


class BedrockChatResponse(BaseModel):
    model_id: str
    region: str
    output_text: str
