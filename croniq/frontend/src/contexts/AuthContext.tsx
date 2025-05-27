import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import apiClient from '../services/api';

// Define the shape of the user object and context
interface User {
  id: number;
  email: string;
  // Add any other user properties you expect from your backend
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  login: (email_param: string, password_param: string) => Promise<void>; // Renamed params to avoid conflict
  register: (email_param: string, password_param: string) => Promise<void>; // Renamed params to avoid conflict
  logout: () => void;
  isLoading: boolean; // To handle loading state during auth operations
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('authToken'));
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start with loading true to check token

  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      setToken(storedToken);
      // You might want to verify the token here by fetching user profile
      // For simplicity, we'll assume the token is valid if it exists
      // and decode it or fetch user data.
      // This example doesn't include token decoding or immediate profile fetching.
      // A common practice is to fetch user profile if token exists.
      apiClient.get('/auth/profile') // Assuming you have a profile route
        .then(response => {
          setUser(response.data.user); // Adjust based on your profile endpoint response
        })
        .catch(() => {
          // Token might be invalid or expired
          localStorage.removeItem('authToken');
          setToken(null);
          setUser(null);
        })
        .finally(() => {
            setIsLoading(false);
        });
    } else {
        setIsLoading(false);
    }
  }, []);

  const login = async (email_param: string, password_param: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/auth/login', { email: email_param, password: password_param });
      const { token: newToken, user: loggedInUser } = response.data; // Adjust based on your login response
      
      localStorage.setItem('authToken', newToken);
      setToken(newToken);
      // If your login response includes the user object:
      setUser(loggedInUser || null); // Set user if available in response
      // If not, you might need another call to fetch user profile here
      // Example: fetch profile after successful login
      if (!loggedInUser && newToken) {
        const profileResponse = await apiClient.get('/auth/profile'); // Assuming profile route exists
        setUser(profileResponse.data.user);
      }

    } catch (error) {
      console.error('Login failed:', error);
      localStorage.removeItem('authToken'); // Clear any potentially bad token
      setToken(null);
      setUser(null);
      throw error; // Re-throw to be caught by the UI component
    } finally {
        setIsLoading(false);
    }
  };

  const register = async (email_param: string, password_param: string) => {
    setIsLoading(true);
    try {
      // Assuming your register endpoint does not automatically log the user in
      // or return a token. If it does, adjust accordingly like the login function.
      await apiClient.post('/auth/register', { email: email_param, password: password_param });
      // Optionally, you could log the user in directly after registration
      // await login(email_param, password_param);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error; // Re-throw
    } finally {
        setIsLoading(false);
    }
  };

  const logout = () => {
    setIsLoading(true);
    localStorage.removeItem('authToken');
    setToken(null);
    setUser(null);
    // Optionally, notify backend about logout if needed
    // apiClient.post('/auth/logout').catch(err => console.error("Logout API call failed", err));
    setIsLoading(false);
  };
  
  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, token, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
