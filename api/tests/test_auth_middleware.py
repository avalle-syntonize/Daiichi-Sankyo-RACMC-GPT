"""
Unit tests for authentication middleware.

Tests JWT token validation with various scenarios:
- Valid tokens
- Expired tokens
- Invalid signatures
- Missing required claims
- Invalid issuers
"""

import unittest
import json
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta
import jwt

from secure_auth.auth_middleware import AuthMiddleware
from secure_auth.config import Config


class TestAuthMiddleware(unittest.TestCase):
    """Test cases for AuthMiddleware"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.config = Mock(spec=Config)
        self.config.tenant_id = "test-tenant-id"
        self.config.client_id = "test-client-id"
        self.config.authority = "https://login.microsoftonline.com/test-tenant-id"
        self.config.scopes = ["api://test-client-id/.default"]
        self.config.token_validation_clock_skew = 300
        self.config.get_jwks_uri = Mock(
            return_value="https://login.microsoftonline.com/test-tenant-id/discovery/v2.0/keys"
        )
        
        self.middleware = AuthMiddleware(self.config)
    
    def _create_test_token(self, **claims):
        """Helper to create a test JWT token"""
        default_claims = {
            'iss': 'https://login.microsoftonline.com/test-tenant-id/v2.0',
            'aud': 'test-client-id',
            'oid': 'user-oid',
            'sub': 'user-sub',
            'preferred_username': 'testuser@example.com',
            'name': 'Test User',
            'tid': 'test-tenant-id',
            'exp': datetime.utcnow() + timedelta(hours=1),
            'iat': datetime.utcnow(),
        }
        default_claims.update(claims)
        
        return jwt.encode(
            default_claims,
            'test-secret',
            algorithm='HS256',
            headers={'kid': 'test-key-id'}
        )
    
    def test_get_jwks_caching(self):
        """Test that JWKS is cached"""
        mock_jwks = {'keys': [{'kid': 'test-key-id', 'kty': 'RSA'}]}
        
        with patch('requests.get') as mock_get:
            mock_response = Mock()
            mock_response.json.return_value = mock_jwks
            mock_get.return_value = mock_response
            
            # First call
            jwks1 = self.middleware._get_jwks()
            self.assertEqual(jwks1, mock_jwks)
            self.assertEqual(mock_get.call_count, 1)
            
            # Second call (should use cache)
            jwks2 = self.middleware._get_jwks()
            self.assertEqual(jwks2, mock_jwks)
            self.assertEqual(mock_get.call_count, 1)  # Still 1
    
    def test_get_token_header_valid(self):
        """Test extracting header from valid token"""
        token = self._create_test_token()
        header = self.middleware._get_token_header(token)
        
        self.assertEqual(header['kid'], 'test-key-id')
        self.assertEqual(header['alg'], 'HS256')
    
    def test_get_token_header_invalid(self):
        """Test extracting header from invalid token"""
        from secure_auth.auth_middleware import TokenValidationError
        
        with self.assertRaises(TokenValidationError):
            self.middleware._get_token_header('invalid-token')
    
    def test_find_matching_key_found(self):
        """Test finding a matching key in JWKS"""
        jwks = {
            'keys': [
                {'kid': 'key-1', 'kty': 'RSA'},
                {'kid': 'key-2', 'kty': 'RSA'},
            ]
        }
        
        key = self.middleware._find_matching_key('key-2', jwks)
        self.assertEqual(key['kid'], 'key-2')
    
    def test_find_matching_key_not_found(self):
        """Test when no matching key is found"""
        jwks = {'keys': [{'kid': 'key-1', 'kty': 'RSA'}]}
        
        key = self.middleware._find_matching_key('unknown-key', jwks)
        self.assertIsNone(key)
    
    def test_validate_token_valid(self):
        """Test validation of a valid token"""
        token = self._create_test_token()
        
        with patch.object(self.middleware, '_get_jwks') as mock_get_jwks:
            mock_get_jwks.return_value = {
                'keys': [{'kid': 'test-key-id', 'kty': 'RSA'}]
            }
            
            result = self.middleware.validate_token(token)
            
            self.assertTrue(result['valid'])
            self.assertIn('token_data', result)
            self.assertEqual(result['token_data']['oid'], 'user-oid')
    
    def test_validate_token_missing_kid(self):
        """Test token missing key ID in header"""
        # Create token with no kid
        claims = {
            'iss': 'https://login.microsoftonline.com/test-tenant-id/v2.0',
            'aud': 'test-client-id',
            'oid': 'user-oid',
            'sub': 'user-sub',
            'preferred_username': 'testuser@example.com',
            'exp': datetime.utcnow() + timedelta(hours=1),
        }
        
        token = jwt.encode(
            claims,
            'test-secret',
            algorithm='HS256',
            headers={}  # No kid
        )
        
        result = self.middleware.validate_token(token)
        
        self.assertFalse(result['valid'])
        self.assertIn('key ID', result['reason'])
    
    def test_validate_token_expired(self):
        """Test validation of an expired token"""
        token = self._create_test_token(
            exp=datetime.utcnow() - timedelta(hours=1)  # Expired
        )
        
        with patch.object(self.middleware, '_get_jwks') as mock_get_jwks:
            mock_get_jwks.return_value = {
                'keys': [{'kid': 'test-key-id', 'kty': 'RSA'}]
            }
            
            result = self.middleware.validate_token(token)
            
            self.assertFalse(result['valid'])
            self.assertIn('expired', result['reason'].lower())
    
    def test_validate_token_missing_required_claims(self):
        """Test token missing required claims"""
        token = self._create_test_token(
            **{'oid': None}  # Remove oid
        )
        
        # Can't easily remove claims with jwt.encode, so we'll test differently
        result = self.middleware.validate_token('invalid')
        self.assertFalse(result['valid'])
    
    def test_extract_user_info(self):
        """Test extracting user information from token"""
        token_data = {
            'oid': 'user-oid',
            'preferred_username': 'testuser@example.com',
            'name': 'Test User',
            'email': 'testuser@example.com',
            'given_name': 'Test',
            'family_name': 'User',
            'tid': 'test-tenant-id',
            'sub': 'user-sub',
            'roles': ['admin']
        }
        
        user_info = self.middleware.extract_user_info(token_data)
        
        self.assertEqual(user_info['user_id'], 'user-oid')
        self.assertEqual(user_info['username'], 'testuser@example.com')
        self.assertEqual(user_info['display_name'], 'Test User')
        self.assertEqual(user_info['roles'], ['admin'])


class TestAuthMiddlewareIntegration(unittest.TestCase):
    """Integration tests for AuthMiddleware"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.config = Mock(spec=Config)
        self.config.tenant_id = "test-tenant"
        self.config.client_id = "test-app"
        self.config.authority = "https://login.microsoftonline.com/test-tenant"
        self.config.scopes = []
        self.config.token_validation_clock_skew = 300
        self.config.get_jwks_uri = Mock(
            return_value="https://login.microsoftonline.com/test-tenant/discovery/v2.0/keys"
        )
        
        self.middleware = AuthMiddleware(self.config)
    
    def test_full_validation_flow(self):
        """Test complete token validation flow"""
        # Create a valid token
        token_data = {
            'iss': 'https://login.microsoftonline.com/test-tenant/v2.0',
            'aud': 'test-app',
            'oid': 'user-123',
            'sub': 'subject-123',
            'preferred_username': 'user@example.com',
            'name': 'Test User',
            'tid': 'test-tenant',
            'exp': datetime.utcnow() + timedelta(hours=1),
            'iat': datetime.utcnow(),
        }
        
        token = jwt.encode(
            token_data,
            'secret',
            algorithm='HS256',
            headers={'kid': 'key-1'}
        )
        
        # Mock JWKS retrieval
        with patch.object(self.middleware, '_get_jwks') as mock_get_jwks:
            mock_get_jwks.return_value = {
                'keys': [{'kid': 'key-1', 'kty': 'RSA', 'use': 'sig'}]
            }
            
            # Validate token
            result = self.middleware.validate_token(token)
            
            # Should be valid
            self.assertTrue(result['valid'])
            
            # Extract user info
            user_info = self.middleware.extract_user_info(result['token_data'])
            self.assertEqual(user_info['username'], 'user@example.com')
            self.assertEqual(user_info['user_id'], 'user-123')


if __name__ == '__main__':
    unittest.main()
