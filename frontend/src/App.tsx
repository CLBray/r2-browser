// Main App component with routing and global state management

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryProvider } from './providers/QueryProvider';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import { Layout } from './components/Layout';
import { AuthForm } from './components/AuthForm';
import { FileExplorer } from './components/FileExplorer';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';

// Public route component (redirects to explorer if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <Navigate to="/explorer" replace /> : <>{children}</>;
};

// App routes component
const AppRoutes: React.FC = () => {
  return (
    <Layout>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <AuthForm />
            </PublicRoute>
          }
        />
        <Route
          path="/explorer"
          element={
            <ProtectedRoute>
              <FileExplorer />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/explorer" replace />} />
        <Route path="*" element={<Navigate to="/explorer" replace />} />
      </Routes>
    </Layout>
  );
};

// Main App component
const App: React.FC = () => {
  React.useEffect(() => {
    // Initialize performance monitoring
    import('./utils/performance-monitor').then(({ performanceMonitor }) => {
      performanceMonitor.init({
        flushIntervalMs: 30000, // Send metrics every 30 seconds
      });
      
      // Track initial page load
      performanceMonitor.trackPageLoad('app_init');
    });
    
    // Cleanup on unmount
    return () => {
      import('./utils/performance-monitor').then(({ performanceMonitor }) => {
        performanceMonitor.destroy();
      });
    };
  }, []);
  
  return (
    <QueryProvider>
      <AuthProvider>
        <Router>
          <ErrorBoundary componentName="AppRoutes">
            <AppRoutes />
          </ErrorBoundary>
        </Router>
      </AuthProvider>
    </QueryProvider>
  );
};

export default App;
