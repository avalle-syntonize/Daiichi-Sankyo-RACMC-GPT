"""
Configuration module for Azure AD and security settings.

Loads configuration from environment variables and local.settings.json.
"""

import os
import json
from typing import Dict, Any, Optional


class Config:
    """
    Configuration class for Azure AD and security settings.
    
    Loads settings from:
    1. local.settings.json (development)
    2. Environment variables (Azure deployment)
    """
    
    def __init__(self):
        """Initialize configuration from environment and files."""
        self._load_config()
    
    def _load_config(self) -> None:
        """Load configuration from local.settings.json or environment."""
        config_data = {}
        
        # Try to load from local.settings.json
        try:
            settings_file = os.path.join(
                os.path.dirname(os.path.dirname(__file__)),
                'local.settings.json'
            )
            if os.path.exists(settings_file):
                with open(settings_file, 'r') as f:
                    data = json.load(f)
                    config_data = data.get('Values', {})
                    config_data.update(data.get('AzureAd', {}))
                    config_data.update(data.get('Security', {}))
        except Exception as e:
            print(f"Warning: Could not load local.settings.json: {e}")
        
        # Override with environment variables
        self.tenant_id = os.environ.get('AZURE_TENANT_ID') or config_data.get('TenantId')
        self.client_id = os.environ.get('AZURE_CLIENT_ID') or config_data.get('ClientId')
        self.authority = os.environ.get('AZURE_AUTHORITY') or config_data.get(
            'Authority',
            f"https://login.microsoftonline.com/{self.tenant_id}" if self.tenant_id else ""
        )
        
        # Security settings
        self.allowed_origins = (
            os.environ.get('ALLOWED_ORIGINS') or 
            config_data.get('AllowedOrigins', '')
        ).split(',')
        self.allowed_origins = [origin.strip() for origin in self.allowed_origins if origin.strip()]
        
        self.required_custom_header = (
            os.environ.get('REQUIRED_CUSTOM_HEADER') or
            config_data.get('RequiredCustomHeader', 'X-SWA-Custom-Header')
        )
        
        self.token_validation_clock_skew = int(
            os.environ.get('TOKEN_VALIDATION_CLOCK_SKEW') or
            config_data.get('TokenValidationClockSkew', 300)
        )
        
        self.nonce_expiration_seconds = int(
            os.environ.get('NONCE_EXPIRATION_SECONDS') or
            config_data.get('NonceExpirationSeconds', 900)
        )
        
        # Scopes
        self.scopes = os.environ.get('API_SCOPES', '').split(',')
        self.scopes = [scope.strip() for scope in self.scopes if scope.strip()]
    
    def validate(self) -> tuple[bool, Optional[str]]:
        """
        Validate that required configuration is present.
        
        Returns:
            tuple: (is_valid, error_message)
        """
        if not self.tenant_id:
            return False, "AZURE_TENANT_ID is required"
        
        if not self.client_id:
            return False, "AZURE_CLIENT_ID is required"
        
        if not self.authority:
            return False, "AZURE_AUTHORITY is required"
        
        return True, None
    
    def get_jwks_uri(self) -> str:
        """
        Get the JWKS (JSON Web Key Set) URI for token validation.
        
        Returns:
            str: JWKS URI for the Azure AD tenant
        """
        return f"{self.authority}/discovery/v2.0/keys"
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert configuration to dictionary.
        
        Returns:
            dict: Configuration as dictionary
        """
        return {
            'tenant_id': self.tenant_id,
            'client_id': self.client_id,
            'authority': self.authority,
            'allowed_origins': self.allowed_origins,
            'required_custom_header': self.required_custom_header,
            'token_validation_clock_skew': self.token_validation_clock_skew,
            'nonce_expiration_seconds': self.nonce_expiration_seconds,
            'scopes': self.scopes
        }
