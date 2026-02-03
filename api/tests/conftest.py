"""
Pytest configuration and shared fixtures for tests.
"""

import pytest
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@pytest.fixture
def mock_config():
    """Fixture for mock configuration"""
    from unittest.mock import Mock
    from secure_auth.config import Config
    
    config = Mock(spec=Config)
    config.tenant_id = "test-tenant-id"
    config.client_id = "test-client-id"
    config.authority = "https://login.microsoftonline.com/test-tenant-id"
    config.allowed_origins = [
        "https://test.azurestaticapps.net",
        "https://*.azurestaticapps.net",
        "http://localhost:5173"
    ]
    config.required_custom_header = "X-SWA-Custom-Header"
    config.token_validation_clock_skew = 300
    config.nonce_expiration_seconds = 900
    config.scopes = ["api://test-client-id/.default"]
    config.get_jwks_uri = Mock(
        return_value="https://login.microsoftonline.com/test-tenant-id/discovery/v2.0/keys"
    )
    
    return config


@pytest.fixture
def mock_request():
    """Fixture for mock HTTP request"""
    from unittest.mock import Mock
    
    request = Mock()
    request.headers = {
        "Authorization": "Bearer valid-token",
        "X-SWA-Custom-Header": "swa-protected-request",
        "X-Request-Nonce": "test-nonce-12345",
        "X-Request-ID": "req-001",
        "Origin": "https://test.azurestaticapps.net",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept-Language": "en-US,en;q=0.9"
    }
    request.get_json = Mock(return_value={})
    
    return request


@pytest.fixture
def mock_token_data():
    """Fixture for mock JWT token data"""
    from datetime import datetime, timedelta
    
    return {
        "iss": "https://login.microsoftonline.com/test-tenant-id/v2.0",
        "aud": "test-client-id",
        "oid": "user-123",
        "sub": "subject-123",
        "preferred_username": "testuser@example.com",
        "name": "Test User",
        "email": "testuser@example.com",
        "given_name": "Test",
        "family_name": "User",
        "tid": "test-tenant-id",
        "exp": datetime.utcnow() + timedelta(hours=1),
        "iat": datetime.utcnow(),
        "roles": ["user"]
    }
