from typing import Optional

from fastapi import HTTPException, Request, Response
from jose import JWTError, jwt
from starlette.middleware.base import BaseHTTPMiddleware

from api.config import JWT_PUBLIC_KEY_PATH


class JWTAuthMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, exclude_paths: Optional[list] = None):
        super().__init__(app)
        self.public_key = self._load_public_key()
        # Paths that don't require authentication
        self.exclude_paths = exclude_paths or ["/health", "/docs", "/redoc", "/openapi.json"]

    def _load_public_key(self) -> str:
        """Load the RSA public key from the specified file"""
        try:
            with open(JWT_PUBLIC_KEY_PATH, 'r') as key_file:
                return key_file.read()
        except FileNotFoundError:
            raise RuntimeError(f"Public key file not found at {JWT_PUBLIC_KEY_PATH}")
        except Exception as e:
            raise RuntimeError(f"Error reading public key: {str(e)}")

    def _verify_jwt(self, token: str) -> bool:
        """Verify the JWT token using the RSA public key"""
        try:
            # Decode and verify the JWT using RS256 algorithm
            jwt.decode(
                token, 
                self.public_key, 
                algorithms=["RS256"]
            )
            return True
        except JWTError as e:
            print(f"JWT verification failed: {str(e)}")
            return False
        except Exception as e:
            print(f"Unexpected error during JWT verification: {str(e)}")
            return False

    def _extract_token_from_header(self, authorization: str) -> Optional[str]:
        """Extract the token from Authorization header"""
        if not authorization:
            return None
        
        parts = authorization.split(' ')
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return None
            
        return parts[1]

    async def dispatch(self, request: Request, call_next):
        # Skip authentication for excluded paths
        if request.url.path in self.exclude_paths:
            return await call_next(request)

        # Get the Authorization header
        authorization = request.headers.get("authorization")
        
        if not authorization:
            return Response(
                content='{"detail": "Authorization header is required"}',
                status_code=401,
                media_type="application/json"
            )

        # Extract token from Authorization header
        token = self._extract_token_from_header(authorization)
        
        if not token:
            return Response(
                content='{"detail": "Invalid authorization header format. Expected: Bearer <token>"}',
                status_code=401,
                media_type="application/json"
            )

        # Verify the JWT token
        if not self._verify_jwt(token):
            return Response(
                content='{"detail": "Invalid or expired token"}',
                status_code=403,
                media_type="application/json"
            )

        # Add the token to request state for potential use in routes
        request.state.token = token
        
        # Continue with the request
        return await call_next(request)


def get_current_user(request: Request) -> Optional[dict]:
    """
    Extract user information from the JWT token in the request.
    This function can be used as a dependency to get user info in routes.
    """
    if not hasattr(request.state, 'token'):
        raise HTTPException(
            status_code=403, 
            detail="No token found in request state"
        )
    
    try:
        with open(JWT_PUBLIC_KEY_PATH, 'r') as key_file:
            public_key = key_file.read()
        
        payload = jwt.decode(
            request.state.token, 
            public_key, 
            algorithms=["RS256"]
        )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=403, 
            detail="Could not validate credentials"
        )
