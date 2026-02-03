"""
Unit tests for security middleware.

Tests anti-Postman protections:
- Origin validation
- Custom header requirement
- Token binding
- Request validation
"""

import unittest
from unittest.mock import Mock
import re

from secure_auth.security_middleware import SecurityMiddleware
from secure_auth.config import Config


class TestSecurityMiddleware(unittest.TestCase):
    """Test cases for SecurityMiddleware"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.config = Mock(spec=Config)
        self.config.allowed_origins = [
            'https://example.azurestaticapps.net',
            'https://*.azurestaticapps.net',
            'http://localhost:5173',
            'http://localhost:3000'
        ]
        self.config.required_custom_header = 'X-SWA-Custom-Header'
        
        self.middleware = SecurityMiddleware(self.config)
    
    def test_normalize_origin_with_protocol(self):
        """Test normalizing origin with protocol"""
        normalized = self.middleware._normalize_origin('https://example.com/')
        self.assertEqual(normalized, 'example.com')
    
    def test_normalize_origin_without_protocol(self):
        """Test normalizing origin without protocol"""
        normalized = self.middleware._normalize_origin('example.com')
        self.assertEqual(normalized, 'example.com')
    
    def test_normalize_origin_case_insensitive(self):
        """Test that normalization is case insensitive"""
        normalized = self.middleware._normalize_origin('HTTPS://EXAMPLE.COM')
        self.assertEqual(normalized, 'example.com')
    
    def test_match_origin_pattern_exact_match(self):
        """Test exact origin match"""
        allowed = ['https://example.com']
        self.assertTrue(
            self.middleware._match_origin_pattern('https://example.com', allowed)
        )
    
    def test_match_origin_pattern_exact_no_match(self):
        """Test exact origin no match"""
        allowed = ['https://example.com']
        self.assertFalse(
            self.middleware._match_origin_pattern('https://other.com', allowed)
        )
    
    def test_match_origin_pattern_wildcard(self):
        """Test wildcard origin pattern"""
        allowed = ['https://*.azurestaticapps.net']
        
        self.assertTrue(
            self.middleware._match_origin_pattern(
                'https://app1.azurestaticapps.net',
                allowed
            )
        )
        self.assertTrue(
            self.middleware._match_origin_pattern(
                'https://app2.azurestaticapps.net',
                allowed
            )
        )
        self.assertFalse(
            self.middleware._match_origin_pattern(
                'https://evil.com',
                allowed
            )
        )
    
    def test_match_origin_pattern_nested_wildcard(self):
        """Test nested wildcard pattern"""
        allowed = ['https://*.example.azurestaticapps.net']
        
        self.assertTrue(
            self.middleware._match_origin_pattern(
                'https://dev.example.azurestaticapps.net',
                allowed
            )
        )
        self.assertTrue(
            self.middleware._match_origin_pattern(
                'https://prod.example.azurestaticapps.net',
                allowed
            )
        )
    
    def test_validate_origin_valid(self):
        """Test validating a valid origin"""
        is_valid, error = self.middleware.validate_origin(
            'https://example.azurestaticapps.net'
        )
        self.assertTrue(is_valid)
        self.assertIsNone(error)
    
    def test_validate_origin_invalid(self):
        """Test validating an invalid origin"""
        is_valid, error = self.middleware.validate_origin(
            'https://evil.com'
        )
        self.assertFalse(is_valid)
        self.assertIsNotNone(error)
    
    def test_validate_origin_with_valid_referer(self):
        """Test validating origin with valid referer"""
        is_valid, error = self.middleware.validate_origin(
            'https://example.azurestaticapps.net',
            'https://example.azurestaticapps.net/page'
        )
        self.assertTrue(is_valid)
    
    def test_validate_origin_with_invalid_referer(self):
        """Test validating origin with invalid referer"""
        is_valid, error = self.middleware.validate_origin(
            'https://example.azurestaticapps.net',
            'https://evil.com/page'
        )
        self.assertFalse(is_valid)
    
    def test_validate_custom_headers_present(self):
        """Test validating required custom header present"""
        headers = {
            'X-SWA-Custom-Header': 'swa-protected-request',
            'Content-Type': 'application/json'
        }
        
        is_valid, error = self.middleware.validate_custom_headers(headers)
        self.assertTrue(is_valid)
        self.assertIsNone(error)
    
    def test_validate_custom_headers_missing(self):
        """Test validating when required header is missing"""
        headers = {
            'Content-Type': 'application/json'
        }
        
        is_valid, error = self.middleware.validate_custom_headers(headers)
        self.assertFalse(is_valid)
        self.assertIn('missing', error.lower())
    
    def test_validate_custom_headers_empty_value(self):
        """Test validating when custom header has empty value"""
        headers = {
            'X-SWA-Custom-Header': '',
            'Content-Type': 'application/json'
        }
        
        is_valid, error = self.middleware.validate_custom_headers(headers)
        self.assertFalse(is_valid)
    
    def test_compute_client_fingerprint(self):
        """Test computing client fingerprint"""
        headers = {
            'User-Agent': 'Mozilla/5.0',
            'Accept-Language': 'en-US,en;q=0.9'
        }
        
        fingerprint = self.middleware.compute_client_fingerprint(headers)
        
        # Fingerprint should be a hex string
        self.assertIsInstance(fingerprint, str)
        self.assertTrue(all(c in '0123456789abcdef' for c in fingerprint))
        self.assertEqual(len(fingerprint), 64)  # SHA256 hex
    
    def test_compute_client_fingerprint_consistency(self):
        """Test that same client gets same fingerprint"""
        headers = {
            'User-Agent': 'Mozilla/5.0',
            'Accept-Language': 'en-US,en;q=0.9'
        }
        
        fp1 = self.middleware.compute_client_fingerprint(headers)
        fp2 = self.middleware.compute_client_fingerprint(headers)
        
        self.assertEqual(fp1, fp2)
    
    def test_compute_client_fingerprint_different(self):
        """Test that different clients get different fingerprints"""
        headers1 = {
            'User-Agent': 'Mozilla/5.0 Chrome',
            'Accept-Language': 'en-US'
        }
        headers2 = {
            'User-Agent': 'Mozilla/5.0 Firefox',
            'Accept-Language': 'en-US'
        }
        
        fp1 = self.middleware.compute_client_fingerprint(headers1)
        fp2 = self.middleware.compute_client_fingerprint(headers2)
        
        self.assertNotEqual(fp1, fp2)
    
    def test_validate_token_binding(self):
        """Test token binding validation"""
        request = Mock()
        request.headers = {
            'User-Agent': 'Mozilla/5.0',
            'Accept-Language': 'en-US'
        }
        
        token_data = {
            'oid': 'user-123',
            'preferred_username': 'user@example.com'
        }
        
        result = self.middleware.validate_token_binding(request, token_data)
        
        self.assertTrue(result['valid'])
    
    def test_validate_request_valid(self):
        """Test validating a valid request"""
        request = Mock()
        request.headers = {
            'Origin': 'https://example.azurestaticapps.net',
            'X-SWA-Custom-Header': 'swa-protected-request'
        }
        
        result = self.middleware.validate_request(request)
        
        self.assertTrue(result['valid'])
    
    def test_validate_request_invalid_origin(self):
        """Test validating request with invalid origin"""
        request = Mock()
        request.headers = {
            'Origin': 'https://evil.com',
            'X-SWA-Custom-Header': 'swa-protected-request'
        }
        
        result = self.middleware.validate_request(request)
        
        self.assertFalse(result['valid'])
        self.assertIn('origin', result['reason'].lower())
    
    def test_validate_request_missing_custom_header(self):
        """Test validating request without custom header"""
        request = Mock()
        request.headers = {
            'Origin': 'https://example.azurestaticapps.net'
        }
        
        result = self.middleware.validate_request(request)
        
        self.assertFalse(result['valid'])
        self.assertIn('header', result['reason'].lower())


class TestSecurityMiddlewareIntegration(unittest.TestCase):
    """Integration tests for SecurityMiddleware"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.config = Mock(spec=Config)
        self.config.allowed_origins = [
            'https://*.azurestaticapps.net',
            'http://localhost:5173'
        ]
        self.config.required_custom_header = 'X-SWA-Custom-Header'
        
        self.middleware = SecurityMiddleware(self.config)
    
    def test_legitimate_swa_request(self):
        """Test validation of a legitimate SWA request"""
        request = Mock()
        request.headers = {
            'Origin': 'https://myapp.azurestaticapps.net',
            'Referer': 'https://myapp.azurestaticapps.net/page',
            'X-SWA-Custom-Header': 'swa-protected-request',
            'User-Agent': 'Mozilla/5.0',
            'Accept-Language': 'en-US'
        }
        
        # Origin validation
        is_valid, _ = self.middleware.validate_origin(
            request.headers['Origin'],
            request.headers.get('Referer')
        )
        self.assertTrue(is_valid)
        
        # Custom header validation
        is_valid, _ = self.middleware.validate_custom_headers(request.headers)
        self.assertTrue(is_valid)
        
        # Full request validation
        result = self.middleware.validate_request(request)
        self.assertTrue(result['valid'])
    
    def test_postman_request_blocked(self):
        """Test that Postman requests are blocked"""
        request = Mock()
        request.headers = {
            'User-Agent': 'PostmanRuntime/7.32.0',
            'Accept-Language': 'en-US'
            # Missing Origin, Referer, and X-SWA-Custom-Header
        }
        
        # This should fail validation
        result = self.middleware.validate_request(request)
        self.assertFalse(result['valid'])
    
    def test_curl_request_blocked(self):
        """Test that curl requests are blocked"""
        request = Mock()
        request.headers = {
            'User-Agent': 'curl/7.68.0'
            # Missing Origin, Referer, and X-SWA-Custom-Header
        }
        
        result = self.middleware.validate_request(request)
        self.assertFalse(result['valid'])


if __name__ == '__main__':
    unittest.main()
