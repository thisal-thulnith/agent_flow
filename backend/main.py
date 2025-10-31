"""
Sales AI Agent Platform - Main Backend Application
FastAPI server with LangGraph-powered conversation agents
"""

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from contextlib import asynccontextmanager
import uvicorn
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent))

from config import settings, validate_settings
from database.supabase_client import init_supabase, test_connection
from routers import auth, agents, chat, training, webhooks, analytics, products, conversational_builder, unified_chat, orders

# Rate limiter
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifecycle manager for the application
    Runs on startup and shutdown
    """
    # Startup
    print("=" * 50)
    print("🚀 Sales AI Agent Platform Starting...")
    print("=" * 50)

    # Validate configuration
    print("\n📋 Validating configuration...")
    validation = validate_settings()

    if not validation["valid"]:
        print("\n❌ Configuration validation failed!")
        if validation.get("missing"):
            print(f"Missing required settings: {', '.join(validation['missing'])}")
        if validation.get("error"):
            print(f"Error: {validation['error']}")
        print("\n💡 Please check your .env file and fill in all required values.")
        print("   See .env.example for reference.\n")
        sys.exit(1)

    print("✅ Configuration valid!")

    if validation.get("warnings"):
        print("\n⚠️  Warnings:")
        for warning in validation["warnings"]:
            print(f"   - {warning}")

    # Initialize Supabase
    print("\n📊 Connecting to Supabase...")
    try:
        init_supabase()
        is_connected = await test_connection()
        if is_connected:
            print("✅ Supabase connected successfully!")
        else:
            print("❌ Failed to connect to Supabase")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Supabase connection error: {str(e)}")
        sys.exit(1)

    # Initialize Qdrant (lazy loading - will connect when first used)
    print("\n🔍 Qdrant vector database configured")
    print(f"   Collection: {settings.QDRANT_COLLECTION_NAME}")

    # Application ready
    print("\n" + "=" * 50)
    print(f"✅ Backend ready on http://localhost:{settings.PORT}")
    print(f"📖 API docs: http://localhost:{settings.PORT}/docs")
    print(f"🔧 Environment: {settings.ENVIRONMENT}")
    print("=" * 50 + "\n")

    yield  # Application runs here

    # Shutdown
    print("\n🛑 Shutting down...")


# Create FastAPI application
app = FastAPI(
    title="Sales AI Agent API",
    description="Backend API for creating and managing AI-powered sales agents",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware - Allow ALL origins (for deployment testing)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors with detailed messages"""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": "Validation error",
            "details": exc.errors()
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions"""
    print(f"❌ Error: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": "Internal server error",
            "message": str(exc) if settings.ENVIRONMENT == "development" else "An error occurred"
        }
    )


# Root endpoint
@app.get("/")
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def root(request: Request):
    """API root endpoint"""
    return {
        "success": True,
        "message": "Sales AI Agent API",
        "version": "1.0.0",
        "status": "running",
        "docs": f"http://localhost:{settings.PORT}/docs"
    }


# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {
        "success": True,
        "status": "healthy",
        "environment": settings.ENVIRONMENT
    }


# Include routers
app.include_router(
    auth.router,
    prefix=f"{settings.API_PREFIX}/auth",
    tags=["Authentication"]
)

app.include_router(
    agents.router,
    prefix=f"{settings.API_PREFIX}/agents",
    tags=["Agents"]
)

app.include_router(
    chat.router,
    prefix=f"{settings.API_PREFIX}/chat",
    tags=["Chat"]
)

app.include_router(
    training.router,
    prefix=f"{settings.API_PREFIX}/training",
    tags=["Training"]
)

app.include_router(
    webhooks.router,
    prefix=f"{settings.API_PREFIX}/webhooks",
    tags=["Webhooks"]
)

app.include_router(
    analytics.router,
    prefix=f"{settings.API_PREFIX}/analytics",
    tags=["Analytics"]
)

app.include_router(
    products.router,
    prefix=f"{settings.API_PREFIX}/products",
    tags=["Products"]
)

app.include_router(
    conversational_builder.router,
    prefix=f"{settings.API_PREFIX}/conversational-builder",
    tags=["Conversational Builder"]
)

app.include_router(
    unified_chat.router,
    prefix=f"{settings.API_PREFIX}/unified-chat",
    tags=["Unified Chat"]
)

app.include_router(
    orders.router,
    prefix=f"{settings.API_PREFIX}/orders",
    tags=["Orders"]
)

# Mount static files for uploaded images
uploads_dir = Path(__file__).parent / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")


# Run server
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.ENVIRONMENT == "development",
        log_level="info"
    )
