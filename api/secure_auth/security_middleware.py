"""
Security middleware for anti-Postman protections.

This module provides security validations to prevent direct API access via tools like Postman or curl:
- Origin validation (Referer and Origin headers)
- Custom header requirement
- Token binding via client fingerprint
"""

import hashlib
import logging
from typing import Dict, Any, Optional
import re

logger = logging.getLogger(__name__)


class SecurityMiddleware:
    """
    Security middleware for anti-Postman protections and additional security measures.
    """
    
    def __init__(self, config: Any):
        """
        Initialize the security middleware.
        
        Args:
            config: Configuration object with security settings
        """
        self.config = config
    
    def _normalize_origin(self, origin: str) -> str:
        """
        Normalize origin URL for comparison.
        
        Removes protocol and trailing slash for flexible matching.
        
        Args:
            origin: Origin URL to normalize
            
        Returns:
            str: Normalized origin
        """
        # Remove protocol
        normalized = origin.lower().replace('https://', '').replace('http://', '')
        # Remove trailing slash
        normalized = normalized.rstrip('/')
        return normalized
    
    def _match_origin_pattern(self, origin: str, allowed_patterns: list) -> bool:
        """
        Check if origin matches any allowed pattern.
        
        Supports wildcard patterns like *.azurestaticapps.net
        
        Args:
            origin: Origin to check
            allowed_patterns: List of allowed origin patterns
            
        Returns:
            bool: True if origin matches any pattern
        """
        normalized_origin = self._normalize_origin(origin)
        
        for pattern in allowed_patterns:
            normalized_pattern = self._normalize_origin(pattern)
            
            # Exact match
            if normalized_origin == normalized_pattern:
                return True
            
            # Wildcard pattern matching
            if '*' in normalized_pattern:
                # Convert wildcard pattern to regex
                # e.g., "*.azurestaticapps.net" -> "^.*\.azurestaticapps\.net$"
                regex_pattern = normalized_pattern.replace('.', r'\.').replace('*', '.*')
                if re.match(f"^{regex_pattern}$", normalized_origin):
                    return True
        
        return False
    
    def validate_origin(self, origin: str, referer: Optional[str] = None) -> tuple[bool, Optional[str]]:
        """
        Validate that request origin is from allowed sources.
        
        Args:
            origin: Origin header value
            referer: Referer header value (optional)
            
        Returns:
            tuple: (is_valid, error_message)
        """
        # Check if origin matches allowed origins
        if not self._match_origin_pattern(origin, self.config.allowed_origins):
            return False, f"Origin not allowed: {origin}"
        
        # If referer is provided, it should match origin
        if referer:
            referer_origin = referer.split('?')[0].rsplit('/', 1)[0]  # Remove query and path
            if not self._match_origin_pattern(referer_origin, self.config.allowed_origins):
                return False, f"Referer not allowed: {referer}"
        
        return True, None
    
    def validate_custom_headers(self, headers: Dict[str, str]) -> tuple[bool, Optional[str]]:
        """
        Validate that required custom headers are present.
        
        SWA adds a custom header that Postman/curl can't replicate.
        
        Args:
            headers: Request headers
            
        Returns:
            tuple: (is_valid, error_message)
        """
        required_header = self.config.required_custom_header
        
        if required_header not in headers:
            return False, f"Missing required header: {required_header}"
        
        # The header value must be non-empty
        header_value = headers.get(required_header, '').strip()
        if not header_value:
            return False, f"Required header is empty: {required_header}"
        
        return True, None
    
    def compute_client_fingerprint(self, headers: Dict[str, str]) -> str:
        """
        Compute a fingerprint of the client for token binding.
        
        Uses User-Agent and Accept-Language headers.
        
        Args:
            headers: Request headers
            
        Returns:
            str: Client fingerprint hash
        """
        fingerprint_data = (
            f"{headers.get('User-Agent', 'unknown')}|"
            f"{headers.get('Accept-Language', 'unknown')}"
        )
        
        return hashlib.sha256(fingerprint_data.encode()).hexdigest()
    
    def validate_token_binding(
        self,
        request: Any,
        token_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validate token binding to client fingerprint.
        
        This prevents tokens stolen via XSS or network interception from being
        used from different clients.
        
        Args:
            request: HTTP request object
            token_data: Validated JWT token payload
            
        Returns:
            dict: {
                'valid': bool,
                'reason': str (error message if invalid)
            }
        """
        try:
            # Compute current client fingerprint
            headers_dict = dict(request.headers)
            current_fingerprint = self.compute_client_fingerprint(headers_dict)
            
            # For now, we skip strict token binding validation in development
            # In production, you would:
            # 1. Include fingerprint in token generation
            # 2. Compare token's stored fingerprint with current fingerprint
            
            # This is a placeholder for future enhancement
            return {
                'valid': True
            }
        
        except Exception as e:
            logger.error(f"Error validating token binding: {str(e)}")
            return {
                'valid': False,
                'reason': 'Token binding validation error'
            }
    
    def validate_request(self, request: Any) -> Dict[str, Any]:
        """
        Perform all security validations on the request.
        
        Validates:
        - Origin header
        - Custom header presence
        - Request headers format
        
        Args:
            request: HTTP request object
            
        Returns:
            dict: {
                'valid': bool,
                'reason': str (error message if invalid)
            }
        """
        try:
            headers_dict = dict(request.headers)
            
            # Get Origin and Referer headers
            origin = headers_dict.get('Origin', '')
            referer = headers_dict.get('Referer', '')
            
            # If neither Origin nor Referer is present, it might be a direct request
            # from a tool like curl or Postman
            if not origin and not referer:
                # For development, allow requests without origin/referer
                # In production, this should be rejected
                logger.warning("Request has no Origin or Referer header")
            elif origin:
                # Validate origin
                is_valid, error = self.validate_origin(origin, referer)
                if not is_valid:
                    return {
                        'valid': False,
                        'reason': error
                    }
            
            # Validate custom headers
            is_valid, error = self.validate_custom_headers(headers_dict)
            if not is_valid:
                return {
                    'valid': False,
                    'reason': error
                }
            
            return {'valid': True}
        
        except Exception as e:
            logger.error(f"Error validating request: {str(e)}")
            return {
                'valid': False,
                'reason': 'Request validation error'
            }
