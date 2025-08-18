// src/test/setup.js - Test setup for client
import '@testing-library/jest-dom';

// Mock environment variables
import.meta.env.VITE_API_URL = 'http://localhost:5000';
import.meta.env.VITE_APP_NAME = 'Jarvis AI';
import.meta.env.VITE_APP_VERSION = '1.0.0';

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;
