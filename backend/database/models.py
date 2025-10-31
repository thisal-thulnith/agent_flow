"""
Pydantic models for data validation and serialization
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# ==================== Enums ====================

class AgentTone(str, Enum):
    """Agent conversation tone options"""
    PROFESSIONAL = "professional"
    FRIENDLY = "friendly"
    CASUAL = "casual"
    ENTHUSIASTIC = "enthusiastic"
    FORMAL = "formal"


class AgentLanguage(str, Enum):
    """Supported languages"""
    ENGLISH = "en"
    SPANISH = "es"
    FRENCH = "fr"
    GERMAN = "de"
    ITALIAN = "it"
    PORTUGUESE = "pt"
    RUSSIAN = "ru"
    CHINESE = "zh"
    JAPANESE = "ja"
    KOREAN = "ko"


class ConversationChannel(str, Enum):
    """Communication channels"""
    WEB = "web"
    TELEGRAM = "telegram"
    WHATSAPP = "whatsapp"
    MESSENGER = "messenger"


class TrainingDataType(str, Enum):
    """Types of training data"""
    PDF = "pdf"
    URL = "url"
    FAQ = "faq"
    TEXT = "text"


# ==================== Agent Models ====================

class AgentCreate(BaseModel):
    """Model for creating a new agent"""
    name: str = Field(..., min_length=1, max_length=100, description="Agent name")
    company_name: str = Field(..., min_length=1, max_length=200, description="Company name")
    company_description: Optional[str] = Field(None, max_length=2000, description="Company description")
    products: Optional[List[str]] = Field(default=[], description="List of products/services (simple names)")
    tone: Optional[str] = Field(default="friendly", description="Conversation tone")
    language: Optional[str] = Field(default="en", description="Primary language")
    greeting_message: Optional[str] = Field(None, max_length=500, description="Custom greeting")
    sales_strategy: Optional[str] = Field(None, max_length=1000, description="Sales approach")


class AgentUpdate(BaseModel):
    """Model for updating an agent"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    company_description: Optional[str] = Field(None, max_length=2000)
    products: Optional[List[str]] = None
    tone: Optional[str] = None
    language: Optional[str] = None
    greeting_message: Optional[str] = Field(None, max_length=500)
    sales_strategy: Optional[str] = Field(None, max_length=1000)
    is_active: Optional[bool] = None


class AgentResponse(BaseModel):
    """Model for agent response"""
    id: str
    user_id: str
    name: str
    company_name: str
    company_description: Optional[str]
    products: Optional[List[str]]
    tone: str
    language: str
    greeting_message: Optional[str]
    sales_strategy: Optional[str]
    pinecone_namespace: str
    is_active: bool
    created_at: str
    updated_at: Optional[str]


# ==================== Chat Models ====================

class ChatMessage(BaseModel):
    """Single chat message"""
    role: str = Field(..., description="'user' or 'assistant'")
    content: str = Field(..., min_length=1, max_length=5000, description="Message content")
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow)


class ChatRequest(BaseModel):
    """Request model for chat endpoint"""
    agent_id: str = Field(..., description="Agent ID to chat with")
    message: str = Field(..., min_length=1, max_length=5000, description="User message")
    session_id: Optional[str] = Field(None, description="Session ID for conversation continuity")
    channel: ConversationChannel = Field(default=ConversationChannel.WEB, description="Communication channel")
    user_language: Optional[str] = Field(None, description="User's preferred language (auto-detect if not provided)")


class ChatResponse(BaseModel):
    """Response model for chat endpoint"""
    success: bool
    message: str = Field(..., description="Agent's response")
    session_id: str = Field(..., description="Session ID for tracking conversation")
    agent_id: str
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional metadata")


# ==================== Training Models ====================

class TrainingDataCreate(BaseModel):
    """Model for adding training data"""
    agent_id: str = Field(..., description="Agent ID to train")
    type: TrainingDataType = Field(..., description="Type of training data")
    content: Optional[str] = Field(None, description="Text content (for FAQ/TEXT)")
    url: Optional[str] = Field(None, description="URL to scrape (for URL type)")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional metadata")

    @validator("content")
    def validate_content(cls, v, values):
        if values.get("type") in [TrainingDataType.FAQ, TrainingDataType.TEXT]:
            if not v or len(v) < 10:
                raise ValueError("Content is required and must be at least 10 characters")
        return v

    @validator("url")
    def validate_url(cls, v, values):
        if values.get("type") == TrainingDataType.URL:
            if not v:
                raise ValueError("URL is required for URL type")
        return v


class TrainingDataResponse(BaseModel):
    """Response model for training data"""
    id: str
    agent_id: str
    type: str
    status: str  # 'processing', 'completed', 'failed'
    chunks_created: Optional[int] = None
    error: Optional[str] = None
    created_at: str


class PDFUploadResponse(BaseModel):
    """Response for PDF upload"""
    success: bool
    message: str
    training_data_id: Optional[str] = None
    chunks_created: Optional[int] = None


# ==================== Analytics Models ====================

class AgentAnalytics(BaseModel):
    """Analytics data for an agent"""
    agent_id: str
    total_conversations: int
    total_messages: int
    leads_captured: int
    conversions: int
    average_conversation_length: float
    popular_questions: List[Dict[str, Any]]
    daily_stats: List[Dict[str, Any]]


class LeadInfo(BaseModel):
    """Lead information captured during conversation"""
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    interest_level: Optional[str] = None  # 'high', 'medium', 'low'
    notes: Optional[str] = None


class ConversationResponse(BaseModel):
    """Conversation details"""
    id: str
    agent_id: str
    session_id: str
    channel: str
    messages: List[ChatMessage]
    lead_info: Optional[LeadInfo]
    created_at: str
    updated_at: Optional[str]


# ==================== Webhook Models ====================

class TelegramWebhookData(BaseModel):
    """Telegram webhook payload"""
    update_id: int
    message: Optional[Dict[str, Any]] = None


# ==================== User Models ====================

class UserProfile(BaseModel):
    """User profile information"""
    id: str
    email: str
    created_at: str
    total_agents: int
    total_conversations: int


# ==================== Response Models ====================

class SuccessResponse(BaseModel):
    """Generic success response"""
    success: bool = True
    message: str
    data: Optional[Any] = None


class ErrorResponse(BaseModel):
    """Generic error response"""
    success: bool = False
    error: str
    details: Optional[Any] = None


# ==================== Product Models ====================

class ProductCreate(BaseModel):
    """Model for creating a new product with photo and price"""
    agent_id: str
    name: str = Field(..., min_length=1, max_length=255, description="Product name")
    description: Optional[str] = Field(None, max_length=500, description="Short description")
    detailed_description: Optional[str] = Field(None, max_length=5000, description="Detailed product description")
    price: Optional[float] = Field(None, ge=0, description="Product price")
    currency: Optional[str] = Field("USD", max_length=3, description="Currency code")
    image_url: Optional[str] = Field(None, description="Product image URL")
    category: Optional[str] = Field(None, max_length=100, description="Product category")
    features: Optional[List[str]] = Field(default=[], description="List of product features")
    specifications: Optional[Dict[str, Any]] = Field(default={}, description="Product specifications")
    stock_status: Optional[str] = Field("in_stock", description="Stock availability")
    sku: Optional[str] = Field(None, max_length=100, description="SKU/Product code")
    is_featured: Optional[bool] = Field(False, description="Featured product flag")
    is_active: Optional[bool] = Field(True, description="Active status")


class ProductUpdate(BaseModel):
    """Model for updating a product"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=500)
    detailed_description: Optional[str] = Field(None, max_length=5000)
    price: Optional[float] = Field(None, ge=0)
    currency: Optional[str] = Field(None, max_length=3)
    image_url: Optional[str] = None
    category: Optional[str] = Field(None, max_length=100)
    features: Optional[List[str]] = None
    specifications: Optional[Dict[str, Any]] = None
    stock_status: Optional[str] = None
    sku: Optional[str] = Field(None, max_length=100)
    is_featured: Optional[bool] = None
    is_active: Optional[bool] = None


class ProductResponse(BaseModel):
    """Model for product response"""
    id: str
    agent_id: str
    name: str
    description: Optional[str]
    detailed_description: Optional[str]
    price: Optional[float]
    currency: Optional[str]
    image_url: Optional[str]
    category: Optional[str]
    features: Optional[List[str]]
    specifications: Optional[Dict[str, Any]]
    stock_status: Optional[str]
    sku: Optional[str]
    is_featured: bool
    is_active: bool
    created_at: str
    updated_at: Optional[str]
