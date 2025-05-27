import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AuthLayout from './layouts/AuthLayout';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import CreateJobPage from './pages/CreateJobPage';
import EditJobPage from './pages/EditJobPage';
import NotificationChannelsPage from './pages/NotificationChannelsPage'; // Import NotificationChannelsPage
import CreateNotificationChannelPage from './pages/CreateNotificationChannelPage'; // Import CreateNotificationChannelPage
import EditNotificationChannelPage from './pages/EditNotificationChannelPage';   // Import EditNotificationChannelPage

// A small component to handle redirection for already authenticated users
const AuthRedirector: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div>Loading...</div>; // Or some loading spinner
  return isAuthenticated ? <Navigate to="/" replace /> : <AuthLayout />;
};


const AppRoutes: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Routes for unauthenticated users (login, register) */}
        <Route element={<AuthRedirector />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Protected routes for authenticated users */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<DashboardPage />} />
            {/* Job Routes */}
            <Route path="/jobs/new" element={<CreateJobPage />} />
            <Route path="/jobs/edit/:jobId" element={<EditJobPage />} />
            {/* Optional: <Route path="/jobs/:jobId" element={<JobDetailPage />} /> */}

            {/* Notification Channel Routes */}
            <Route path="/notification-channels" element={<NotificationChannelsPage />} />
            <Route path="/notification-channels/new" element={<CreateNotificationChannelPage />} />
            <Route path="/notification-channels/edit/:channelId" element={<EditNotificationChannelPage />} />
            
            {/* Add other protected routes here, e.g.:
            <Route path="/settings" element={<SettingsPage />} />
            */}
          </Route>
        </Route>
        
        {/* Fallback for unknown routes (optional) - redirect to dashboard if authenticated, else to login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
};

export default App;
