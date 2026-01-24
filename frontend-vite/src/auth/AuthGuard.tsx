import React from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import './AuthGuard.css';

interface AuthGuardProps {
  children: ReactNode;
}

/**
 * Loading spinner component
 */
const LoadingSpinner: React.FC = () => (
  <div className="auth-guard-container">
    <div className="auth-guard-content">
      <div className="auth-spinner"></div>
      <h2 className="auth-title">Authenticating...</h2>
      <p className="auth-subtitle">Please wait while we verify your credentials</p>
    </div>
  </div>
);

/**
 * Authentication error component
 */
const AuthError: React.FC<{ error: Error; onRetry: () => void }> = ({ error, onRetry }) => (
  <div className="auth-guard-container">
    <div className="auth-guard-content error">
      <div className="auth-error-icon">⚠️</div>
      <h2 className="auth-title">Authentication Error</h2>
      <p className="auth-error-message">{error.message}</p>
      <button className="auth-retry-button" onClick={onRetry}>
        Try Again
      </button>
    </div>
  </div>
);

/**
 * Login prompt component (fallback if auto-redirect fails)
 */
const LoginPrompt: React.FC<{ onLogin: () => void }> = ({ onLogin }) => (
  <div className="auth-guard-container">
    <div className="auth-guard-content">
      <div className="auth-logo">DS</div>
      <h1 className="auth-app-title">RA CMC-GPT</h1>
      <h2 className="auth-title">Welcome</h2>
      <p className="auth-subtitle">Please sign in with your organizational account to continue</p>
      <button className="auth-login-button" onClick={onLogin}>
        Sign In with Microsoft
      </button>
      <p className="auth-notice">
        🔒 Secure authentication powered by Microsoft Entra ID
      </p>
    </div>
  </div>
);

/**
 * AuthGuard Component
 *
 * Protects routes that require authentication.
 * - Shows loading state while MSAL is initializing
 * - Shows error state if authentication fails
 * - Automatically redirects to login if not authenticated
 * - Renders children only when authenticated
 */
const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { isAuthenticated, isLoading, error, login } = useAuth();

  // Show loading state while authentication is in progress
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Show error state if authentication failed
  if (error) {
    return <AuthError error={error} onRetry={login} />;
  }

  // Show login prompt if not authenticated (fallback)
  if (!isAuthenticated) {
    return <LoginPrompt onLogin={login} />;
  }

  // User is authenticated, render protected content
  return <>{children}</>;
};

export default AuthGuard;
