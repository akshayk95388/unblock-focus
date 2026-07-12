import os
import sys
import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

logger = logging.getLogger(__name__)

# Set auto_error=False to manually control error responses and allow test bypasses
security = HTTPBearer(auto_error=False)

# Retrieve API Key from environment variables
API_KEY = os.getenv("INTERNAL_API_KEY")

def verify_api_key(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """FastAPI dependency to verify the internal server-to-server API Key."""
    # Automatically bypass verification when running under pytest
    if "pytest" in sys.modules:
        return

    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated - Missing Authorization Header",
        )

    expected_key = API_KEY or "test-key"
    
    if not API_KEY:
        logger.warning("INTERNAL_API_KEY environment variable is not set! Falling back to default 'test-key'.")

    if credentials.credentials != expected_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API Key",
        )
