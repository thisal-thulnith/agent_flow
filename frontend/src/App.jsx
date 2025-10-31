import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Lazy load all pages for code splitting (faster page loads)
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CreateAgent = lazy(() => import('./pages/CreateAgent'));
const ConversationalAgentBuilder = lazy(() => import('./pages/ConversationalAgentBuilder'));
const AgentDetail = lazy(() => import('./pages/AgentDetail'));
const Analytics = lazy(() => import('./pages/Analytics'));
const PublicChat = lazy(() => import('./pages/PublicChat'));
const UnifiedChat = lazy(() => import('./pages/UnifiedChat'));
const OrderTracking = lazy(() => import('./pages/OrderTracking'));

// Loading component with progress bar
const PageLoader = () => (
  <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center">
    <div className="w-64 mb-4">
      <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full animate-loading-bar"></div>
      </div>
    </div>
    <div className="text-slate-400 text-sm">Loading...</div>
  </div>
);

// Navigation progress bar component
const NavigationProgress = () => {
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  if (!loading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-slate-800">
      <div className="h-full bg-gradient-to-r from-primary-500 via-primary-400 to-primary-500 animate-loading-bar"></div>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
};

// Public Route Component (redirect to dashboard if logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return user ? <Navigate to="/dashboard" /> : children;
};

// Wrapper component for routes with navigation progress
const AppRoutes = () => {
  return (
    <>
      <NavigationProgress />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicRoute>
                <Signup />
              </PublicRoute>
            }
          />

          {/* Public Chat (no auth required) */}
          <Route path="/chat/:agentId" element={<PublicChat />} />

          {/* Public Order Tracking (no auth required) */}
          <Route path="/track" element={<OrderTracking />} />
          <Route path="/track/:orderNumber" element={<OrderTracking />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/agents/create"
            element={
              <ProtectedRoute>
                <CreateAgent />
              </ProtectedRoute>
            }
          />
          <Route
            path="/agents/create-chat"
            element={
              <ProtectedRoute>
                <ConversationalAgentBuilder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/agents/:agentId"
            element={
              <ProtectedRoute>
                <AgentDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/unified-chat"
            element={
              <ProtectedRoute>
                <UnifiedChat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/unified-chat/:agentId"
            element={
              <ProtectedRoute>
                <UnifiedChat />
              </ProtectedRoute>
            }
          />

          {/* Default Route */}
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Suspense>
    </>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
