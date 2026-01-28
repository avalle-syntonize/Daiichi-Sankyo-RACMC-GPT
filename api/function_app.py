"""
Azure Function App with secure authentication and anti-Postman protections.

This Function App implements a secure communication channel between Static Web App (SWA)
and Azure Functions with the following security measures:
- JWT token validation via Azure AD/Entra ID
- Custom header requirement for SWA identification
- Origin validation to prevent cross-origin attacks
- Token binding via client fingerprint
- Nonce validation to prevent replay attacks
"""

import azure.functions as func
import logging
import json
import hashlib
import time
from datetime import datetime, timedelta
from functools import wraps
from typing import Callable, Optional, Dict, Any

from secure_auth.auth_middleware import AuthMiddleware
from secure_auth.security_middleware import SecurityMiddleware
from secure_auth.config import Config

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize middlewares
config = Config()
auth_middleware = AuthMiddleware(config)
security_middleware = SecurityMiddleware(config)

# Create the Function App
app = func.FunctionApp()

# Store for used nonces (in production, use Redis or Cosmos DB)
used_nonces: Dict[str, float] = {}


def cleanup_old_nonces():
    """Remove nonces older than 15 minutes."""
    current_time = time.time()
    expired_nonces = [
        nonce for nonce, timestamp in used_nonces.items()
        if current_time - timestamp > 900  # 15 minutes
    ]
    for nonce in expired_nonces:
        del used_nonces[nonce]


def secure_endpoint(func_to_decorate: Callable) -> Callable:
    """
    Decorator to enforce security on Azure Function endpoints.
    
    Validates:
    1. JWT token from Azure AD
    2. Required security headers
    3. Origin and Referer headers
    4. Request nonce for replay protection
    5. Token binding via client fingerprint
    """
    @wraps(func_to_decorate)
    async def wrapper(req: func.HttpRequest) -> func.HttpResponse:
        try:
            # Clean up expired nonces periodically
            if len(used_nonces) % 100 == 0:
                cleanup_old_nonces()
            
            # Step 1: Validate security headers and origin
            security_validation = security_middleware.validate_request(req)
            if not security_validation['valid']:
                logger.warning(
                    f"Security validation failed: {security_validation['reason']}",
                    extra={"request_id": req.headers.get('X-Request-ID')}
                )
                return func.HttpResponse(
                    json.dumps({
                        "error": "Forbidden",
                        "message": "Request validation failed"
                    }),
                    status_code=403,
                    mimetype="application/json"
                )
            
            # Step 2: Extract and validate JWT token
            auth_header = req.headers.get('Authorization', '')
            if not auth_header.startswith('Bearer '):
                logger.warning("Missing or invalid Authorization header")
                return func.HttpResponse(
                    json.dumps({
                        "error": "Unauthorized",
                        "message": "Missing or invalid token"
                    }),
                    status_code=401,
                    mimetype="application/json"
                )
            
            token = auth_header[7:]  # Remove "Bearer " prefix
            
            # Step 3: Validate token
            token_validation = auth_middleware.validate_token(token)
            if not token_validation['valid']:
                logger.warning(f"Token validation failed: {token_validation.get('reason')}")
                return func.HttpResponse(
                    json.dumps({
                        "error": "Unauthorized",
                        "message": token_validation.get('reason', 'Invalid token')
                    }),
                    status_code=401,
                    mimetype="application/json"
                )
            
            # Step 4: Validate nonce for replay protection
            nonce = req.headers.get('X-Request-Nonce')
            if not nonce:
                logger.warning("Missing X-Request-Nonce header")
                return func.HttpResponse(
                    json.dumps({
                        "error": "Forbidden",
                        "message": "Request nonce required"
                    }),
                    status_code=403,
                    mimetype="application/json"
                )
            
            if nonce in used_nonces:
                logger.warning(f"Replay attack detected: Nonce {nonce} already used")
                return func.HttpResponse(
                    json.dumps({
                        "error": "Forbidden",
                        "message": "Request already processed"
                    }),
                    status_code=403,
                    mimetype="application/json"
                )
            
            # Register nonce as used
            used_nonces[nonce] = time.time()
            
            # Step 5: Validate token binding via client fingerprint
            token_binding_result = security_middleware.validate_token_binding(
                req, token_validation.get('token_data', {})
            )
            if not token_binding_result['valid']:
                logger.warning(f"Token binding validation failed: {token_binding_result['reason']}")
                return func.HttpResponse(
                    json.dumps({
                        "error": "Forbidden",
                        "message": "Token binding validation failed"
                    }),
                    status_code=403,
                    mimetype="application/json"
                )
            
            # All security checks passed, add user context to request
            req.user_info = token_validation.get('token_data', {})
            req.nonce = nonce
            
            # Call the actual endpoint handler
            return await func_to_decorate(req)
        
        except Exception as e:
            logger.error(f"Unexpected error in secure_endpoint: {str(e)}")
            return func.HttpResponse(
                json.dumps({
                    "error": "Internal Server Error",
                    "message": "An unexpected error occurred"
                }),
                status_code=500,
                mimetype="application/json"
            )
    
    return wrapper


@app.function_name("secure_test")
@app.route("secure-test", methods=["GET"])
async def secure_test(req: func.HttpRequest) -> func.HttpResponse:
    """
    Test endpoint to validate secure SWA-to-Function App communication.
    
    This endpoint:
    - Validates all security measures
    - Returns authenticated user information
    - Logs security validation results
    
    Returns:
        200 OK: User information if all security checks pass
        401 Unauthorized: If token is missing or invalid
        403 Forbidden: If security headers or binding fail
    """
    # Apply security decorator
    @secure_endpoint
    async def handler(req: func.HttpRequest) -> func.HttpResponse:
        try:
            user_info = req.user_info
            
            logger.info(
                f"Secure endpoint accessed by user: {user_info.get('preferred_username')}",
                extra={
                    "user_id": user_info.get('oid'),
                    "nonce": req.nonce
                }
            )
            
            response_data = {
                "success": True,
                "message": "Secure endpoint accessed successfully",
                "user": {
                    "display_name": user_info.get('name', 'Unknown'),
                    "email": user_info.get('preferred_username', ''),
                    "user_id": user_info.get('oid', ''),
                    "tenant_id": user_info.get('tid', '')
                },
                "timestamp": datetime.utcnow().isoformat(),
                "security_validations": {
                    "jwt_validated": True,
                    "origin_validated": True,
                    "custom_headers_present": True,
                    "nonce_validated": True,
                    "token_binding_validated": True
                }
            }
            
            return func.HttpResponse(
                json.dumps(response_data),
                status_code=200,
                mimetype="application/json"
            )
        
        except Exception as e:
            logger.error(f"Error in secure_test handler: {str(e)}")
            return func.HttpResponse(
                json.dumps({
                    "error": "Internal Server Error",
                    "message": "An unexpected error occurred"
                }),
                status_code=500,
                mimetype="application/json"
            )
    
    return await handler(req)


@app.function_name("health_check")
@app.route("health", methods=["GET"])
async def health_check(req: func.HttpRequest) -> func.HttpResponse:
    """
    Public health check endpoint (no authentication required).
    """
    return func.HttpResponse(
        json.dumps({
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0"
        }),
        status_code=200,
        mimetype="application/json"
    )
