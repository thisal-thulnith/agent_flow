"""
Configuration management for Sales AI Agent Backend
Loads all environment variables and validates required settings
"""

from pydantic_settings import BaseSettings
from typing import Optional
import os
from pathlib import Path

# Get the project root directory
ROOT_DIR = Path(__file__).parent.parent


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Server Configuration
    PORT: int = 8000
    ENVIRONMENT: str = "development"
    API_PREFIX: str = "/api"

    # Supabase Configuration
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_KEY: str

    # Qdrant Configuration
    QDRANT_URL: Optional[str] = "http://localhost:6333"  # Use cloud URL or local
    QDRANT_API_KEY: Optional[str] = None  # Only needed for cloud
    QDRANT_COLLECTION_NAME: str = "sales_agents"

    # OpenAI Configuration
    OPENAI_API_KEY: str
    OPENAI_MODEL: str = "gpt-3.5-turbo"  # ⚡ FASTEST MODEL
    OPENAI_TEMPERATURE: float = 0.7
    OPENAI_MAX_TOKENS: int = 120  # ⚡⚡ ULTRA SHORT RESPONSES for max speed

    # Firebase Configuration
    FIREBASE_PROJECT_ID: str

    # Optional: Telegram Bot
    TELEGRAM_BOT_TOKEN: Optional[str] = None

    # Optional: Translation API
    GOOGLE_TRANSLATE_API_KEY: Optional[str] = None

    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 100

    # CORS Origins (for frontend) - can be overridden via env var
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"

    @property
    def cors_origins_list(self) -> list:
        """Parse CORS_ORIGINS string into list"""
        if isinstance(self.CORS_ORIGINS, list):
            return self.CORS_ORIGINS
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    # Vector Search Configuration
    VECTOR_TOP_K: int = 3  # Number of similar documents to retrieve
    VECTOR_SIMILARITY_THRESHOLD: float = 0.7

    # Conversation Configuration
    MAX_CONVERSATION_HISTORY: int = 2  # ⚡⚡ MINIMAL CONTEXT for max speed

    # Document Processing
    CHUNK_SIZE: int = 1000  # Characters per chunk
    CHUNK_OVERLAP: int = 200
    MAX_FILE_SIZE_MB: int = 10

    # Supported Languages
    SUPPORTED_LANGUAGES: list = [
        "en", "es", "fr", "de", "it", "pt", "ru", "zh", "ja", "ko"
    ]

    class Config:
        env_file = str(ROOT_DIR / ".env")
        env_file_encoding = "utf-8"
        case_sensitive = True


# Singleton instance
_settings: Optional[Settings] = None


def get_settings() -> Settings:
    """Get application settings (singleton pattern)"""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings


# Convenience function
def reload_settings():
    """Reload settings from environment (useful for testing)"""
    global _settings
    _settings = None
    return get_settings()


# Validation function
def validate_settings() -> dict:
    """
    Validate all required settings are present
    Returns dict with validation results
    """
    try:
        settings = get_settings()

        results = {
            "valid": True,
            "missing": [],
            "warnings": []
        }

        # Check required fields
        required_fields = [
            "SUPABASE_URL",
            "SUPABASE_ANON_KEY",
            "SUPABASE_SERVICE_KEY",
            "OPENAI_API_KEY",
            "FIREBASE_PROJECT_ID"
        ]

        for field in required_fields:
            value = getattr(settings, field, None)
            if not value or value == "your-" + field.lower().replace("_", "-"):
                results["missing"].append(field)
                results["valid"] = False

        # Check optional fields
        optional_fields = [
            "TELEGRAM_BOT_TOKEN",
            "GOOGLE_TRANSLATE_API_KEY"
        ]

        for field in optional_fields:
            value = getattr(settings, field, None)
            if not value:
                results["warnings"].append(f"{field} not set (optional)")

        return results

    except Exception as e:
        return {
            "valid": False,
            "error": str(e),
            "missing": [],
            "warnings": []
        }


# Export settings instance for easy import
settings = get_settings()
