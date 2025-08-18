// src/test/smoke.test.jsx - Basic smoke tests for client
import { render, screen } from '@testing-library/react';
import App from '../App';

// Mock the AuthContext
vi.mock('../context/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    loading: false,
    clearError: vi.fn() // Add missing clearError function
  })
}));

// Mock the ChatContext
vi.mock('../context/ChatContext', () => ({
  ChatProvider: ({ children }) => children,
  useChat: () => ({
    messages: [],
    sendMessage: vi.fn(),
    loading: false
  })
}));

describe('Client Smoke Tests', () => {
  test('renders app without crashing', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: /Jarvis/i })).toBeInTheDocument();
  });

  test('renders login form', () => {
    render(<App />);
    expect(screen.getByText(/Welcome Back/i)).toBeInTheDocument();
    expect(screen.getByText(/Sign in to your Jarvis account/i)).toBeInTheDocument();
  });

  test('renders form inputs', () => {
    render(<App />);
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter your email/i)).toBeInTheDocument();
  });
});
