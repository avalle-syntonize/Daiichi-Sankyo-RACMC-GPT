import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, AuthGuard, useAuth } from './auth';
import { ChatProvider } from './context/ChatContext';
import { initializeApiService } from './services';
import ChatPage from './pages/ChatPage';
import './App.css';

/**
 * Inner App component that has access to AuthContext
 */
function AppContent() {
  // const { getAccessToken } = useAuth();

  // Initialize API service with the getAccessToken function
  // useEffect(() => {
  //   // initializeApiService(getAccessToken);
  // }, [getAccessToken]);

  return (
    <ChatProvider>
      <Router>
        <Routes>
          <Route
            path="/"
            element={
              <AuthGuard>
                <ChatPage />
              </AuthGuard>
            }
          />
          <Route
            path="/chat"
            element={
              <AuthGuard>
                <ChatPage />
              </AuthGuard>
            }
          />
        </Routes>
      </Router>
    </ChatProvider>
  );
}

/**
 * Main App component wrapped with AuthProvider
 */
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
