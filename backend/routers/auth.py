"""
Authentication Router - Firebase token verification
"""

from fastapi import APIRouter, Depends, HTTPException, Header, status
from firebase_admin import credentials, initialize_app, auth as firebase_auth
from typing import Optional
from pydantic import BaseModel
from config import settings
import os

router = APIRouter()

# Initialize Firebase Admin SDK
_firebase_initialized = False

def init_firebase():
    """Initialize Firebase Admin SDK with proper credentials"""
    global _firebase_initialized

    if _firebase_initialized:
        return

    try:
        # Option 1: Use service account JSON file (recommended for production)
        firebase_cred_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH')

        if firebase_cred_path and os.path.exists(firebase_cred_path):
            cred = credentials.Certificate(firebase_cred_path)
            initialize_app(cred)
            print("✅ Firebase Admin SDK initialized with service account")
        else:
            # Option 2: Use Application Default Credentials (for development)
            # This works if GOOGLE_APPLICATION_CREDENTIALS env var is set
            # Or if running on Google Cloud
            try:
                initialize_app(options={'projectId': settings.FIREBASE_PROJECT_ID})
                print("✅ Firebase Admin SDK initialized with project ID")
            except Exception as e:
                # Option 3: Development mode - no credentials
                if settings.ENVIRONMENT == "development":
                    print(f"⚠️  Firebase Admin SDK: Running in DEV MODE without credentials")
                    print(f"   Firebase auth verification will use fallback mode")
                    print(f"   To enable full verification, set FIREBASE_SERVICE_ACCOUNT_PATH or GOOGLE_APPLICATION_CREDENTIALS")
                else:
                    raise

        _firebase_initialized = True

    except Exception as e:
        if settings.ENVIRONMENT == "development":
            print(f"⚠️  Firebase Admin SDK: {str(e)}")
            print(f"   Running in DEV MODE - auth verification will use fallback")
            _firebase_initialized = True  # Mark as initialized to prevent retries
        else:
            raise

# Initialize on module load
init_firebase()


# Dependency to verify Firebase token
async def verify_token(authorization: str = Header(None)) -> dict:
    """
    Verify Firebase ID token from Authorization header

    Args:
        authorization: Bearer token from header

    Returns:
        dict: Decoded token with user info

    Raises:
        HTTPException: If token is invalid
    """
    # DEV MODE: Allow bypass in development
    if settings.ENVIRONMENT == "development" and not authorization:
        print("⚠️  DEV MODE: Using mock authentication")
        return {
            "uid": "dev-user-123",
            "email": "dev@test.com",
            "email_verified": True
        }

    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No authorization header provided"
        )

    try:
        # Extract token from "Bearer <token>"
        scheme, token = authorization.split()

        if scheme.lower() != 'bearer':
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication scheme"
            )

        # Verify token with Firebase
        decoded_token = firebase_auth.verify_id_token(token)

        return decoded_token

    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format"
        )
    except firebase_auth.InvalidIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    except Exception as e:
        # DEV MODE: Fallback to decoding token without verification
        if settings.ENVIRONMENT == "development":
            try:
                # Decode JWT without verification to get user info
                import jwt
                decoded = jwt.decode(token, options={"verify_signature": False})
                # Silently use the decoded token (warning shown at startup)
                return {
                    "uid": decoded.get('user_id') or decoded.get('sub'),
                    "email": decoded.get('email', 'unknown@test.com'),
                    "email_verified": decoded.get('email_verified', False)
                }
            except:
                # Absolute fallback
                return {
                    "uid": "dev-user-123",
                    "email": "dev@test.com",
                    "email_verified": True
                }
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}"
        )


# Optional: Dependency for routes that can work with or without auth
async def optional_verify_token(authorization: str = Header(None)) -> Optional[dict]:
    """
    Optionally verify Firebase token
    Returns None if no token provided, otherwise verifies and returns decoded token
    """
    if not authorization:
        return None

    return await verify_token(authorization)


# Models
class TokenVerifyRequest(BaseModel):
    """Request to verify a token"""
    token: str


class TokenVerifyResponse(BaseModel):
    """Response for token verification"""
    success: bool
    user_id: Optional[str] = None
    email: Optional[str] = None
    error: Optional[str] = None


# Routes
@router.post("/verify", response_model=TokenVerifyResponse)
async def verify_firebase_token(request: TokenVerifyRequest):
    """
    Verify a Firebase ID token

    This endpoint allows frontend to verify tokens before making other requests
    """
    try:
        decoded_token = firebase_auth.verify_id_token(request.token)

        return TokenVerifyResponse(
            success=True,
            user_id=decoded_token.get('uid'),
            email=decoded_token.get('email')
        )

    except Exception as e:
        return TokenVerifyResponse(
            success=False,
            error=str(e)
        )


@router.get("/me")
async def get_current_user(token_data: dict = Depends(verify_token)):
    """
    Get current user information from token

    Requires valid Firebase token in Authorization header
    """
    return {
        "success": True,
        "user": {
            "id": token_data.get('uid'),
            "email": token_data.get('email'),
            "email_verified": token_data.get('email_verified', False)
        }
    }


@router.get("/health")
async def auth_health():
    """Health check for auth service"""
    return {
        "success": True,
        "service": "authentication",
        "firebase_project": settings.FIREBASE_PROJECT_ID
    }
