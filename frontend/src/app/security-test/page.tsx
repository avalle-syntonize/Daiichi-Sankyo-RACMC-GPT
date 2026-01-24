'use client';

import { useState } from 'react';
import { secureGet } from '@/services/secureApi';

/**
 * Security Test Component
 * 
 * This component demonstrates how to use the secure API client
 * and tests the secure endpoint with all security validations.
 */
export default function SecurityTestPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testSecureEndpoint = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await secureGet('/api/secure-test');
      
      if (response.errorCode) {
        setError(`Error: ${response.status} - ${response.errorCode}`);
      } else {
        setResult(response.data);
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Test failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const testUnsafeEndpoint = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Test without security headers (should fail)
      const response = await fetch('/api/secure-test', {
        method: 'GET',
        credentials: 'include',
      });

      const data = await response.json();
      
      if (!response.ok) {
        setError(`Expected failure: ${response.status} - ${data.error}`);
        setResult(data);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Test failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Security Test Dashboard
          </h1>

          <div className="space-y-4 mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-blue-900 mb-2">
                Security Features Tested
              </h2>
              <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                <li>JWT token validation (NextAuth session)</li>
                <li>Custom security header validation (X-SWA-Custom-Header)</li>
                <li>Request nonce validation (anti-replay)</li>
                <li>Token binding (User-Agent + Accept-Language)</li>
                <li>Origin header validation</li>
                <li>JWT claims validation (expiration, issuer, audience)</li>
              </ul>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <button
              onClick={testSecureEndpoint}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Testing...' : 'Test Secure Endpoint (With Security Headers)'}
            </button>

            <button
              onClick={testUnsafeEndpoint}
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Testing...' : 'Test Without Security Headers (Should Fail)'}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <h3 className="text-red-900 font-semibold mb-2">Error</h3>
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {result && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-gray-900 font-semibold mb-2">Response</h3>
              <pre className="text-xs text-gray-800 overflow-auto bg-white p-4 rounded border border-gray-300">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          <div className="mt-8 border-t pt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Manual Testing Instructions
            </h2>
            
            <div className="space-y-4 text-sm text-gray-700">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Test 1: Postman/curl without authentication</h3>
                <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
{`curl http://localhost:3000/api/secure-test
Expected: 401 Unauthorized (no session)`}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Test 2: Postman/curl with token but no custom header</h3>
                <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
{`curl http://localhost:3000/api/secure-test \\
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"
Expected: 403 Forbidden (missing custom header)`}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Test 3: Replay attack simulation</h3>
                <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
{`# Capture a valid request from browser dev tools
# Replay it with the same nonce twice
Expected: Second request fails with 403 (nonce already used)`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
