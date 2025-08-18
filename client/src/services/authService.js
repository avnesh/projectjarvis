import api from './api';

export const register = async (userData) => {
  try {
    const response = await api.post('/api/auth/register', userData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Registration failed');
  }
};

export const login = async (email, password) => {
  try {
    const response = await api.post('/api/auth/login', { email, password });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Login failed');
  }
};

export const logout = async () => {
  try {
    await api.post('/api/auth/logout');
  } catch (error) {
    console.warn('Logout request failed:', error.message);
  }
};

export const getCurrentUser = async () => {
  try {
    const response = await api.get('/api/auth/me');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to get user data');
  }
};

export const forgotPassword = async (email) => {
  try {
    const response = await api.post('/api/auth/forgot-password', { email });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to send reset email');
  }
};

export const resetPassword = async (token, password) => {
  try {
    const response = await api.post('/api/auth/reset-password', {
      token,
      password
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Password reset failed');
  }
};

export const updateProfile = async (profileData) => {
  try {
    const response = await api.put('/api/auth/profile', profileData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Profile update failed');
  }
};

export const changePassword = async (currentPassword, newPassword) => {
  try {
    const response = await api.put('/api/auth/password', {
      currentPassword,
      newPassword
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Password change failed');
  }
};

export const updatePreferences = async (preferences) => {
  try {
    const response = await api.put('/api/auth/preferences', preferences);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Preferences update failed');
  }
};