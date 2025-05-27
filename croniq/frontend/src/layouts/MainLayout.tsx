import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const MainLayout: React.FC = () => {
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login'); // Redirect to login after logout
  };
  
  // If loading authentication state, show a loader or nothing
  if (isLoading) {
    return <div>Loading application...</div>;
  }

  // If not authenticated and not loading, redirect to login (though ProtectedRoute should also handle this)
  // This is an additional safeguard.
  if (!isAuthenticated) {
     // This might cause a flicker if ProtectedRoute also redirects.
     // Consider if this check is truly needed here vs solely relying on ProtectedRoute.
     // For now, let's keep it simple. If ProtectedRoute handles it, this might be redundant.
     // navigate('/login'); // Commenting out to avoid potential double redirect / flicker
     return <div>Redirecting to login...</div>; // Or a more sophisticated loading/redirect component
  }

  return (
    <div>
      <header style={{ background: '#007bff', padding: '10px 20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/" style={{ color: 'white', textDecoration: 'none', fontSize: '1.5rem' }}>
          Croniq
        </Link>
        <nav>
          {isAuthenticated && user && (
            <span style={{ marginRight: '20px' }}>
              Welcome, {user.email}!
            </span>
          )}
          <Link to="/" style={{ color: 'white', marginRight: '15px' }}>Dashboard</Link>
          <Link to="/notification-channels" style={{ color: 'white', marginRight: '15px' }}>Notification Channels</Link>
          {/* Example other links:
          <Link to="/settings" style={{ color: 'white', marginRight: '15px' }}>Settings</Link> 
          */}
          <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid white', color: 'white', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>
            Logout
          </button>
        </nav>
      </header>
      <main style={{ padding: '20px' }}>
        <Outlet /> {/* Content for specific authenticated pages will render here */}
      </main>
      <footer style={{ textAlign: 'center', padding: '10px', borderTop: '1px solid #eee', marginTop: '20px' }}>
        <p>&copy; {new Date().getFullYear()} Croniq Monitoring. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default MainLayout;
