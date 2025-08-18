// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check for existing token on app load
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        // Clear any stored sessionId to ensure fresh chat on app reload
        localStorage.removeItem('currentSessionId');
        setUser(parsedUser);
        setIsAuthenticated(true);
        
        // Verify token is still valid
        verifyToken(token);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        clearAuthData();
      }
    }
    setIsLoading(false);
  }, []);

  const verifyToken = async (token) => {
    try {
      const response = await api.get('/api/auth/verify');
      
      if (response.status !== 200) {
        clearAuthData();
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      clearAuthData();
    }
  };

  const clearAuthData = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  };

  const clearError = () => {
    setError(null);
  };

  const login = async (email, password) => {
    try {
      setError(null);
      console.log('🔐 AuthContext: Attempting login for:', email);
      console.log('🌐 API URL:', import.meta.env.VITE_API_URL);
      
      const response = await api.post('/api/auth/login', {
        email,
        password
      });

      console.log('📡 Login response:', response.status, response.data);
      const data = response.data;

      if (data.success && data.user && data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        // Clear any stored sessionId to ensure fresh chat on login
        localStorage.removeItem('currentSessionId');
        setUser(data.user);
        setIsAuthenticated(true);
        console.log('✅ Login successful');
        return data;
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('❌ Login error details:', {
        message: error.message,
        response: error.response,
        request: error.request,
        code: error.code,
        config: error.config
      });
      
      const errorMessage = error.response?.data?.error || error.message || 'Login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const register = async (userData) => {
    try {
      setError(null);
      const response = await api.post('/api/auth/register', userData);

      const data = response.data;

      if (data.success && data.user && data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        setIsAuthenticated(true);
        return data;
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Registration failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const logout = () => {
    clearAuthData();
    setError(null);
    // Clear any stored sessionId to ensure fresh chat on next login
    localStorage.removeItem('currentSessionId');
    // Force navigation to clean /chat route
    window.location.href = '/chat';
  };

  const forgotPassword = async (email) => {
    try {
      setError(null);
      const response = await api.post('/api/auth/forgot-password', { email });

      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to send reset email';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const resetPassword = async (token, password) => {
    try {
      setError(null);
      console.log('🔍 AuthContext resetPassword called with:', { token: token ? 'Present' : 'Missing', password: password ? 'Present' : 'Missing' });
      
      const requestData = { token, password };
      console.log('🔍 Sending request data:', requestData);
      
      const response = await api.post('/api/auth/reset-password', requestData);
      
      console.log('🔍 Response received:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Reset password error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to reset password';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const updateProfile = async (profileData) => {
    try {
      setError(null);
      const response = await api.put('/api/auth/profile', profileData);
      
      const data = response.data;
      
      if (data.success && data.user) {
        // Update local storage and state
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        
        // Update token if provided (for updated username in JWT)
        if (data.token) {
          localStorage.setItem('token', data.token);
        }
        
        return data;
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to update profile';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const updatePassword = async (currentPassword, newPassword) => {
    try {
      setError(null);
      const response = await api.put('/api/auth/password', {
        currentPassword,
        newPassword
      });
      
      const data = response.data;
      
      if (data.success) {
        return data;
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to update password';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const value = {
    user,
    isAuthenticated,
    loading: isLoading,
    error,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    updateProfile,
    updatePassword,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};