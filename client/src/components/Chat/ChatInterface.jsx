// ===== src/components/Chat/ChatInterface.jsx =====
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as chatService from '../../services/chatService';
import LoadingSpinner from '../Common/LoadingSpinner';
import KeyboardShortcuts from '../Common/KeyboardShortcuts';
import MarkdownRenderer from '../Common/MarkdownRenderer';
import './ChatInterface.css';

const ChatInterface = ({ currentChat, onMessageSent, sessionId, isSidebarOpen }) => {
  const { sessionId: urlSessionId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState(null);
  const [hasUnsavedChat, setHasUnsavedChat] = useState(false);
  const [chatTitle, setChatTitle] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const messagesEndRef = useRef(null);
  const lastMessageRef = useRef(null);
  const textareaRef = useRef(null);
  const editTextareaRef = useRef(null);
  const searchInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null); // For cancelling requests
  const activeSessionId = sessionId || urlSessionId;
  
  // Initialize messages from currentChat if available
  useEffect(() => {
    if (currentChat && currentChat.messages) {
      setMessages(currentChat.messages);
      setChatTitle(currentChat.title || 'New Chat');
    }
  }, [currentChat]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + Enter to send message
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage(e);
      }
      
      // Ctrl/Cmd + K to focus input
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        textareaRef.current?.focus();
      }
      
      // Ctrl/Cmd + / to toggle shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setShowShortcuts(prev => !prev);
      }
      
      // Ctrl/Cmd + F to toggle search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch(prev => !prev);
        if (!showSearch) {
          setTimeout(() => searchInputRef.current?.focus(), 100);
        }
      }
      
      // Escape to close shortcuts
      if (e.key === 'Escape') {
        setShowShortcuts(false);
        setShowSearch(false);
        setSearchQuery('');
        setSearchResults([]);
        setCurrentSearchIndex(-1);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (activeSessionId) {
      // Clear messages immediately to prevent showing old chat content
      setMessages([]);
      setError(null);
      setIsLoading(false); // Reset loading state
      setChatTitle('New Chat'); // Reset title for new chat
      fetchMessages();
    } else {
      // No active session - show welcome screen
      setMessages([]);
      setError(null);
      setIsLoading(false);
      setStreamingMessage('');
      setIsStreaming(false);
      setChatTitle('New Chat'); // Reset title for welcome screen
      setHasUnsavedChat(false);
    }
  }, [activeSessionId]);

  const fetchMessages = async (retryCount = 0) => {
    if (!activeSessionId) return;
    
    try {
      setIsLoading(true);
      // Only clear error on first attempt, not retries
      if (retryCount === 0) setError(null);
      
      const response = await chatService.getChat(activeSessionId);
      
      if (response && (response.success !== false)) {
        // Handle both direct response and wrapped success responses
        const messages = response.messages || response.data?.messages || [];
        const chatTitle = response.title || response.data?.title || 'New Chat';
        setMessages(messages);
        setChatTitle(chatTitle); // Set the chat-specific title
        setError(null); // Clear any previous errors on success
      } else {
        console.error('Failed to fetch messages:', response);
        // Only show error for non-404 responses after retries
        if (response?.error?.includes('not found') || response?.error?.includes('Chat not found')) {
          console.log('Chat not found - this is normal for new chats');
          setMessages([]);
          setError(null);
        } else if (retryCount >= 2) {
          setError('Unable to load chat. Please try again later.');
        } else {
          // Retry after a short delay
          setTimeout(() => fetchMessages(retryCount + 1), 1000 * (retryCount + 1));
          return;
        }
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      
      // Handle different error types with automatic retry
      if (error.response?.status === 404) {
        // 404 is normal for new chats - don't show error
        console.log('Chat not found - this is normal for new chats');
        setMessages([]);
        setError(null);
      } else if (error.response?.status === 401) {
        setError('Please log in again to access your chats.');
        setMessages([]);
      } else if (retryCount < 2) {
        // Auto-retry for network errors, 500 errors, etc.
        console.log(`Retrying fetch messages (attempt ${retryCount + 1}/3)...`);
        setTimeout(() => fetchMessages(retryCount + 1), 1000 * (retryCount + 1));
        return;
      } else {
        // Only show error after all retries exhausted
        if (error.response?.status >= 500) {
          setError('Server temporarily unavailable. Please try again later.');
        } else if (error.request) {
          setError('Connection issue. Please check your network and try again.');
        } else {
          setError('Unable to load chat. Please try again later.');
        }
        setMessages([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = useCallback(async (e) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isLoading || isStreaming) return;
    
    // Prevent duplicate messages
    if (lastMessageRef.current === inputValue.trim()) return;
    
    const userMessage = {
      id: Date.now(),
      content: inputValue.trim(),
      role: 'user',
      timestamp: new Date().toISOString()
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setError(null);
    lastMessageRef.current = inputValue.trim();
    
    // Create a placeholder streaming message
    const streamingId = Date.now() + 1;
    setStreamingMessageId(streamingId);
    setIsStreaming(true);
    setStreamingMessage('');
    
    // If this is the first message and no active session, mark as unsaved
    if (!activeSessionId) {
      setHasUnsavedChat(true);
    }

    try {
      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();
      
      let accumulatedMessage = '';
      let finalSessionId = activeSessionId;
      
      await chatService.sendMessageStream(
        inputValue.trim(),
        activeSessionId,
        // onChunk
        (chunk, isLast) => {
          if (chunk && chunk !== '[DONE]') {
            accumulatedMessage += chunk;
            setStreamingMessage(accumulatedMessage);
          }
          
          if (isLast || chunk === '[DONE]') {
            // Finalize the streaming message
            const botMessage = {
              id: streamingId,
              content: accumulatedMessage,
              role: 'assistant',
              timestamp: new Date().toISOString()
            };
            
            setMessages(prev => [...prev, botMessage]);
            setIsStreaming(false);
            setStreamingMessage('');
            setStreamingMessageId(null);
          }
        },
        // onModel
        (modelData) => {
          console.log('Using model:', modelData.model);
        },
        // onComplete
        (data) => {
          if (data.sessionId) {
            finalSessionId = data.sessionId;
            // If we created a new chat, navigate to it
            if (!activeSessionId && data.sessionId) {
              navigate(`/chat/${data.sessionId}`, { replace: true });
            }
          }
          
          setHasUnsavedChat(false);
          
          if (onMessageSent) {
            onMessageSent();
          }
        },
        // onError
        (error) => {
          console.error('Streaming error:', error);
          setError(error || 'Failed to send message. Please try again.');
          setIsStreaming(false);
          setStreamingMessage('');
          setStreamingMessageId(null);
          // Remove the user message if there was an error
          setMessages(prev => prev.slice(0, -1));
        },
        // Pass abort signal
        abortControllerRef.current.signal
      );
      
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // More specific error messages
      if (error.message.includes('Rate limit')) {
        setError('Please wait a moment before sending another message.');
      } else if (error.message.includes('timeout')) {
        setError('Request timed out. The AI might be experiencing high load.');
      } else {
        setError('Failed to send message. Please check your connection and try again.');
      }
      
      setIsStreaming(false);
      setStreamingMessage('');
      setStreamingMessageId(null);
      // Remove the user message if there was an error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
      // Clear the last message ref after a delay
      setTimeout(() => {
        lastMessageRef.current = null;
      }, 1000);
    }
  }, [inputValue, isLoading, isStreaming, activeSessionId, onMessageSent, navigate]);

  const handleStopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Stop the streaming state
    setIsStreaming(false);
    
    // If there's accumulated message, save it as complete
    if (streamingMessage) {
      const botMessage = {
        id: streamingMessageId,
        content: streamingMessage + ' [Response stopped by user]',
        role: 'assistant',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, botMessage]);
      setStreamingMessage('');
      setStreamingMessageId(null);
    }
    
    setIsLoading(false);
  }, [streamingMessage, streamingMessageId]);

  const handleEditMessage = (messageId, currentContent) => {
    setEditingMessageId(messageId);
    setEditValue(currentContent);
  };

  const handleSaveEdit = async (messageId) => {
    if (!editValue.trim()) return;
    
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, content: editValue.trim() }
        : msg
    ));
    
    setEditingMessageId(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditValue('');
  };

  // Message deletion removed - only available from sidebar
  // Individual messages can be edited but not deleted from main chat interface

  const handleCopyMessage = async (content) => {
    try {
      await navigator.clipboard.writeText(content);
      // Show a brief success indicator
      const originalText = document.title;
      document.title = 'Message copied!';
      setTimeout(() => {
        document.title = originalText;
      }, 1000);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      setCurrentSearchIndex(-1);
      return;
    }
    
    const results = messages
      .map((message, index) => ({
        messageId: message.id,
        messageIndex: index,
        content: message.content,
        role: message.role
      }))
      .filter(item => 
        item.content.toLowerCase().includes(query.toLowerCase())
      );
    
    setSearchResults(results);
    setCurrentSearchIndex(results.length > 0 ? 0 : -1);
  };

  const handleNextSearch = () => {
    if (searchResults.length === 0) return;
    const nextIndex = (currentSearchIndex + 1) % searchResults.length;
    setCurrentSearchIndex(nextIndex);
    scrollToMessage(searchResults[nextIndex].messageIndex);
  };

  const handlePrevSearch = () => {
    if (searchResults.length === 0) return;
    const prevIndex = currentSearchIndex <= 0 ? searchResults.length - 1 : currentSearchIndex - 1;
    setCurrentSearchIndex(prevIndex);
    scrollToMessage(searchResults[prevIndex].messageIndex);
  };

  const scrollToMessage = (messageIndex) => {
    const messageElements = document.querySelectorAll('.message-container');
    if (messageElements[messageIndex]) {
      messageElements[messageIndex].scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
      // Highlight the message briefly
      messageElements[messageIndex].style.background = 'rgba(102, 126, 234, 0.1)';
      setTimeout(() => {
        messageElements[messageIndex].style.background = 'transparent';
      }, 2000);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    setIsTyping(e.target.value.length > 0);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const handleNewChat = () => {
    navigate('/chat');
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (error) {
      return '';
    }
  };

  return (
    <div className="chat-interface">
      {/* Chat Title Header */}
      {activeSessionId && (
        <div className="chat-title-header">
          {isEditingTitle ? (
            <div className="chat-title-edit-form">
              <input
                type="text"
                value={chatTitle}
                onChange={(e) => setChatTitle(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    try {
                      await chatService.updateChatTitle(activeSessionId, chatTitle);
                      setIsEditingTitle(false);
                      // Trigger sidebar refresh
                      window.dispatchEvent(new CustomEvent('chat-title-updated'));
                    } catch (error) {
                      console.error('Failed to update title:', error);
                    }
                  } else if (e.key === 'Escape') {
                    setIsEditingTitle(false);
                    setChatTitle(currentChat?.title || 'New Chat');
                  }
                }}
                className="chat-title-input"
                placeholder="Enter chat name..."
                autoFocus
              />
              <button
                onClick={async () => {
                  try {
                    await chatService.updateChatTitle(activeSessionId, chatTitle);
                    setIsEditingTitle(false);
                    // Trigger sidebar refresh
                    window.dispatchEvent(new CustomEvent('chat-title-updated'));
                  } catch (error) {
                    console.error('Failed to update title:', error);
                  }
                }}
                className="message-edit-save"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditingTitle(false);
                  setChatTitle(currentChat?.title || 'New Chat');
                }}
                className="message-edit-cancel"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div
              onClick={() => {
                setIsEditingTitle(true);
                setChatTitle(currentChat?.title || 'New Chat');
              }}
              className="chat-title-display"
              title="Click to rename chat"
            >
              <h2 className="chat-title">
                {currentChat?.title || chatTitle || 'New Chat'}
              </h2>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{
                color: 'var(--text-tertiary)',
                flexShrink: 0
              }}>
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </div>
          )}
          
          <div className="chat-info-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px'}}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            {(() => {
              const userMessages = messages.filter(msg => msg.role === 'user').length;
              const totalMessages = messages.length;
              if (totalMessages === 0) return '0 messages';
              if (userMessages === 1 && totalMessages <= 2) return '1 exchange';
              return `${userMessages} ${userMessages === 1 ? 'exchange' : 'exchanges'} • ${totalMessages} total`;
            })()}
          </div>
        </div>
      )}
      {/* Loading Overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <LoadingSpinner />
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div style={{
          position: 'fixed',
          top: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--surface-overlay)',
          border: '1px solid var(--border-primary)',
          color: 'var(--text-primary)',
          padding: 'var(--spacing-md) var(--spacing-lg)',
          borderRadius: 'var(--radius-md)',
          zIndex: 'var(--z-tooltip)',
          maxWidth: '500px',
          textAlign: 'center',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px var(--shadow-overlay)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-sm)',
          alignItems: 'center'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-sm)',
            color: 'var(--status-error)'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            <span style={{ fontWeight: '600' }}>Error</span>
          </div>
          <span>{error}</span>
          <button
            onClick={() => {
              setError(null);
              fetchMessages();
            }}
            style={{
              background: 'var(--primary-gradient)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--spacing-xs) var(--spacing-md)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'var(--primary-gradient-hover)';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'var(--primary-gradient)';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            Retry
          </button>
        </div>
      )}

      <div className="chat-messages" style={{
        flex: 1,
        overflowY: 'auto',
        padding: 'var(--spacing-xl) var(--spacing-lg)',
        scrollBehavior: 'smooth',
        position: 'relative',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '0' // Remove gap, we'll add custom spacing
      }}>
        {/* Search Bar */}
        {showSearch && (
          <div style={{
            position: 'sticky',
            top: 0,
            background: 'var(--surface-overlay)',
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--spacing-md)',
            marginBottom: 'var(--spacing-md)',
            backdropFilter: 'blur(20px)',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-sm)'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: '14px'
              }}
            />
            {searchResults.length > 0 && (
              <span style={{
                fontSize: '12px',
                color: 'var(--text-tertiary)',
                marginRight: 'var(--spacing-sm)'
              }}>
                {currentSearchIndex + 1} of {searchResults.length}
              </span>
            )}
            <button
              onClick={handlePrevSearch}
              disabled={searchResults.length === 0}
              style={{
                background: 'none',
                border: 'none',
                color: searchResults.length > 0 ? 'var(--text-secondary)' : 'var(--text-quaternary)',
                cursor: searchResults.length > 0 ? 'pointer' : 'default',
                padding: 'var(--spacing-xs)',
                borderRadius: 'var(--radius-sm)'
              }}
              title="Previous result"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15,18 9,12 15,6"></polyline>
              </svg>
            </button>
            <button
              onClick={handleNextSearch}
              disabled={searchResults.length === 0}
              style={{
                background: 'none',
                border: 'none',
                color: searchResults.length > 0 ? 'var(--text-secondary)' : 'var(--text-quaternary)',
                cursor: searchResults.length > 0 ? 'pointer' : 'default',
                padding: 'var(--spacing-xs)',
                borderRadius: 'var(--radius-sm)'
              }}
              title="Next result"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9,18 15,12 9,6"></polyline>
              </svg>
            </button>
            <button
              onClick={() => {
                setShowSearch(false);
                setSearchQuery('');
                setSearchResults([]);
                setCurrentSearchIndex(-1);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                padding: 'var(--spacing-xs)',
                borderRadius: 'var(--radius-sm)'
              }}
              title="Close search"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        )}
        
        {!error && messages.length === 0 ? (
          <div className="empty-chat-state" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            padding: 'var(--spacing-2xl) var(--spacing-lg)',
            minHeight: 0,
            textAlign: 'center'
          }}>
            <div className="empty-chat-content" style={{
              maxWidth: '500px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                background: 'var(--primary-gradient)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 'var(--spacing-lg)',
                boxShadow: '0 8px 32px var(--shadow-primary)'
              }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </div>
              
              <h2 style={{
                fontSize: '2rem',
                fontWeight: '700',
                color: 'var(--text-primary)',
                marginBottom: 'var(--spacing-md)',
                lineHeight: '1.2',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                whiteSpace: 'normal',
                textAlign: 'center',
                width: '100%',
                maxWidth: '100%'
              }}>
                Welcome to Jarvis
              </h2>
              
              <p style={{
                fontSize: '1.1rem',
                color: 'var(--text-secondary)',
                lineHeight: '1.6',
                margin: '0',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                whiteSpace: 'normal',
                textAlign: 'center',
                width: '100%',
                maxWidth: '100%'
              }}>
                Start a conversation to begin chatting with your AI assistant. I can help you with various tasks, answer questions, and provide insights.
              </p>
              
              <div style={{
                marginTop: 'var(--spacing-lg)',
                display: 'flex',
                gap: 'var(--spacing-md)',
                flexWrap: 'wrap',
                justifyContent: 'center'
              }}>
                <button
                  onClick={handleNewChat}
                  style={{
                    background: 'var(--primary-gradient)',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--spacing-md) var(--spacing-lg)',
                    color: 'var(--text-primary)',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-sm)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'var(--primary-gradient-hover)';
                    e.target.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'var(--primary-gradient)';
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  New Chat
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <React.Fragment key={message.id}>
                <div
                  className={`message-container ${message.role}`}
                  style={{
                    display: 'flex',
                    gap: 'var(--spacing-md)',
                    padding: 'var(--spacing-xl) 0',
                    opacity: index === messages.length - 1 ? 1 : 0.9,
                    flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
                    justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                    position: 'relative',
                    borderBottom: index < messages.length - 1 ? '1px solid var(--border-tertiary)' : 'none',
                    marginBottom: index < messages.length - 1 ? 'var(--spacing-lg)' : '0',
                    paddingBottom: index < messages.length - 1 ? 'var(--spacing-xl)' : 'var(--spacing-lg)'
                  }}
                  onMouseEnter={() => setHoveredMessageId(message.id)}
                  onMouseLeave={() => setHoveredMessageId(null)}
                >
              {/* Avatar */}
              <div className="message-avatar" style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: message.role === 'user' ? 'var(--primary-gradient)' : 'var(--status-success)',
                flexShrink: 0,
                boxShadow: '0 4px 16px var(--shadow-secondary)',
                border: '2px solid var(--border-secondary)'
              }}>
                {message.role === 'user' ? (
                  <img 
                    src="/assets/user.svg" 
                    alt="User" 
                    style={{
                      width: '20px',
                      height: '20px',
                      filter: 'brightness(0) invert(1)'
                    }}
                  />
                ) : (
                  <img 
                    src="/assets/bot.svg" 
                    alt="AI Assistant" 
                    style={{
                      width: '20px',
                      height: '20px',
                      filter: 'brightness(0) invert(1)'
                    }}
                  />
                )}
              </div>
              
              {/* Message Content */}
              <div className="message-content-wrapper" style={{
                display: 'flex',
                flexDirection: 'column',
                maxWidth: '70%',
                alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
                position: 'relative'
              }}>
                {editingMessageId === message.id ? (
                  <div style={{
                    background: 'var(--surface-primary)',
                    border: '2px solid var(--border-focus)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--spacing-md)',
                    width: '100%',
                    boxShadow: '0 4px 16px var(--shadow-secondary)'
                  }}>
                    <textarea
                      ref={editTextareaRef}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        resize: 'none',
                        fontSize: '14px',
                        lineHeight: '1.6',
                        color: 'var(--text-primary)',
                        fontFamily: 'inherit',
                        minHeight: '60px',
                        maxHeight: '200px'
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSaveEdit(message.id);
                        }
                        if (e.key === 'Escape') {
                          handleCancelEdit();
                        }
                      }}
                      autoFocus
                    />
                    <div style={{
                      display: 'flex',
                      gap: 'var(--spacing-sm)',
                      marginTop: 'var(--spacing-sm)',
                      justifyContent: 'flex-end'
                    }}>
                      <button
                        onClick={() => handleSaveEdit(message.id)}
                        style={{
                          background: 'var(--status-success)',
                          border: 'none',
                          borderRadius: 'var(--radius-sm)',
                          padding: 'var(--spacing-xs) var(--spacing-sm)',
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        style={{
                          background: 'var(--surface-secondary)',
                          border: '1px solid var(--border-primary)',
                          borderRadius: 'var(--radius-sm)',
                          padding: 'var(--spacing-xs) var(--spacing-sm)',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="message-content" style={{
                    background: message.role === 'user' ? 'var(--primary-gradient)' : 'var(--surface-primary)',
                    border: `1px solid ${message.role === 'user' ? 'var(--primary-color)' : 'var(--border-primary)'}`,
                    borderRadius: message.role === 'user' ? 'var(--radius-lg) var(--radius-sm) var(--radius-lg) var(--radius-lg)' : 'var(--radius-sm) var(--radius-lg) var(--radius-lg) var(--radius-lg)',
                    padding: 'var(--spacing-md) var(--spacing-lg)',
                    color: 'var(--text-primary)',
                    lineHeight: '1.6',
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word',
                    whiteSpace: 'pre-wrap',
                    maxWidth: '100%',
                    boxShadow: message.role === 'user' ? '0 4px 16px var(--shadow-primary)' : '0 2px 8px var(--shadow-secondary)',
                    position: 'relative'
                  }}>
                    <MarkdownRenderer content={message.content} />
                  </div>
                )}
                
                {/* Message Actions */}
                {hoveredMessageId === message.id && editingMessageId !== message.id && (
                  <div className="message-actions" style={{
                    position: 'absolute',
                    top: '-8px',
                    right: message.role === 'user' ? '0' : 'auto',
                    left: message.role === 'user' ? 'auto' : '0',
                    background: 'var(--surface-overlay)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--spacing-xs)',
                    display: 'flex',
                    gap: 'var(--spacing-xs)',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 4px 16px var(--shadow-overlay)',
                    zIndex: 10
                  }}>
                    <button
                      onClick={() => handleCopyMessage(message.content)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: 'var(--spacing-xs)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = 'var(--surface-primary)';
                        e.target.style.color = 'var(--text-primary)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'transparent';
                        e.target.style.color = 'var(--text-secondary)';
                      }}
                      title="Copy message"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    </button>
                    
                    {message.role === 'user' && (
                      <button
                        onClick={() => handleEditMessage(message.id, message.content)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          padding: 'var(--spacing-xs)',
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'var(--surface-primary)';
                          e.target.style.color = 'var(--text-primary)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'transparent';
                          e.target.style.color = 'var(--text-secondary)';
                        }}
                        title="Edit message"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </button>
                    )}
                    
                    {/* Delete message functionality removed - chat deletion only available from sidebar */}
                  </div>
                )}
                
                {/* Timestamp */}
                <div className="message-timestamp" style={{
                  fontSize: '11px',
                  color: 'var(--text-quaternary)',
                  marginTop: 'var(--spacing-xs)',
                  padding: '0 var(--spacing-sm)',
                  textAlign: message.role === 'user' ? 'right' : 'left'
                }}>
                  {formatTimestamp(message.timestamp)}
                </div>
              </div>
                </div>
              </React.Fragment>
            ))}
            
            {/* Streaming Message */}
            {isStreaming && streamingMessage && (
              <div className="message-container assistant streaming" style={{
                display: 'flex',
                gap: 'var(--spacing-md)',
                padding: 'var(--spacing-xl) 0',
                opacity: 1,
                flexDirection: 'row',
                justifyContent: 'flex-start',
                position: 'relative',
                marginTop: messages.length > 0 ? 'var(--spacing-lg)' : '0',
                borderTop: messages.length > 0 ? '1px solid var(--border-tertiary)' : 'none',
                paddingTop: messages.length > 0 ? 'var(--spacing-xl)' : 'var(--spacing-lg)'
              }}>
                <div className="message-avatar" style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--status-success)',
                  flexShrink: 0,
                  boxShadow: '0 4px 16px var(--shadow-secondary)',
                  border: '2px solid var(--border-secondary)'
                }}>
                  <img 
                    src="/bot.svg" 
                    alt="AI Assistant" 
                    style={{
                      width: '20px',
                      height: '20px',
                      filter: 'brightness(0) invert(1)'
                    }}
                  />
                </div>
                
                <div className="message-content-wrapper" style={{
                  display: 'flex',
                  flexDirection: 'column',
                  maxWidth: '70%',
                  alignItems: 'flex-start',
                  position: 'relative'
                }}>
                  <div className="message-content streaming" style={{
                    background: 'var(--surface-primary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 'var(--radius-sm) var(--radius-lg) var(--radius-lg) var(--radius-lg)',
                    padding: 'var(--spacing-md) var(--spacing-lg)',
                    color: 'var(--text-primary)',
                    lineHeight: '1.6',
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word',
                    whiteSpace: 'pre-wrap',
                    maxWidth: '100%',
                    boxShadow: '0 2px 8px var(--shadow-secondary)',
                    position: 'relative',
                    minHeight: '24px'
                  }}>
                    <MarkdownRenderer content={streamingMessage} />
                    <span style={{
                      opacity: 0.7,
                      animation: 'typing-cursor 1s infinite'
                    }}>|</span>
                  </div>
                  
                  <div className="message-timestamp" style={{
                    fontSize: '11px',
                    color: 'var(--text-quaternary)',
                    marginTop: 'var(--spacing-xs)',
                    padding: '0 var(--spacing-sm)',
                    textAlign: 'left'
                  }}>
                    {formatTimestamp(new Date().toISOString())}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        
        {/* Loading indicator for bot response */}
        {isLoading && messages.length > 0 && (
          <div className="message-container assistant" style={{
            display: 'flex',
            gap: 'var(--spacing-md)',
            padding: 'var(--spacing-lg) 0',
            opacity: 0.7,
            flexDirection: 'row',
            justifyContent: 'flex-start'
          }}>
            <div className="message-avatar" style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--status-success)',
              flexShrink: 0,
              border: '2px solid var(--border-secondary)'
            }}>
              <img 
                src="/bot.svg" 
                alt="AI Assistant" 
                style={{
                  width: '20px',
                  height: '20px',
                  filter: 'brightness(0) invert(1)'
                }}
              />
            </div>
            
            <div className="message-content-wrapper" style={{
              display: 'flex',
              flexDirection: 'column',
              maxWidth: '70%',
              alignItems: 'flex-start'
            }}>
              <div className="message-content" style={{
                background: 'var(--surface-primary)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-sm) var(--radius-lg) var(--radius-lg) var(--radius-lg)',
                padding: 'var(--spacing-md) var(--spacing-lg)',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-sm)',
                minWidth: '120px'
              }}>
                <LoadingSpinner size="small" />
                <span>Jarvis is thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className={`chat-input-container ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        <form className="chat-input-form" onSubmit={handleSendMessage} style={{
          maxWidth: '800px',
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <div className="input-wrapper" style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 'var(--spacing-md)',
            background: 'var(--surface-primary)',
            border: '2px solid var(--border-primary)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--spacing-lg) var(--spacing-xl)',
            transition: 'all 0.3s ease',
            backdropFilter: 'blur(10px)',
            width: '100%',
            boxSizing: 'border-box',
            minHeight: '64px',
            boxShadow: '0 4px 16px var(--shadow-secondary)'
          }}>
            {/* File Upload Button */}
            <button
              type="button"
              onClick={handleFileUpload}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                padding: 'var(--spacing-sm)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'var(--surface-secondary)';
                e.target.style.color = 'var(--text-secondary)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.color = 'var(--text-tertiary)';
              }}
              title="Attach file"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
              </svg>
            </button>
            
            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              accept="image/*,.pdf,.doc,.docx,.txt"
            />
            
            {/* Selected File Display */}
            {selectedFile && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-sm)',
                background: 'var(--surface-secondary)',
                border: '1px solid var(--border-secondary)',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--spacing-xs) var(--spacing-sm)',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                maxWidth: '200px',
                overflow: 'hidden'
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14,2 14,8 20,8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10,9 9,9 8,9"></polyline>
                </svg>
                <span style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {selectedFile.name}
                </span>
                <button
                  onClick={removeSelectedFile}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-quaternary)',
                    cursor: 'pointer',
                    padding: '2px',
                    borderRadius: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Remove file"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            )}
            
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Message Jarvis... (Ctrl+Enter to send, Ctrl+K to focus, Ctrl+F to search)"
              disabled={isLoading}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                resize: 'none',
                fontSize: '16px',
                lineHeight: '1.5',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                minHeight: '32px',
                maxHeight: '120px',
                width: '100%',
                boxSizing: 'border-box',
                padding: '0',
                margin: '0'
              }}
              onFocus={(e) => {
                e.target.parentElement.style.border = '2px solid var(--border-focus)';
                e.target.parentElement.style.boxShadow = '0 0 0 4px rgba(102, 126, 234, 0.15)';
                e.target.parentElement.style.background = 'var(--surface-secondary)';
                e.target.parentElement.style.transform = 'translateY(-1px)';
              }}
              onBlur={(e) => {
                e.target.parentElement.style.border = '2px solid var(--border-primary)';
                e.target.parentElement.style.boxShadow = '0 4px 16px var(--shadow-secondary)';
                e.target.parentElement.style.background = 'var(--surface-primary)';
                e.target.parentElement.style.transform = 'translateY(0)';
              }}
              aria-label="Message input"
            />
            
            {/* Typing Indicator */}
            {isTyping && !isLoading && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-xs)',
                color: 'var(--text-tertiary)',
                fontSize: '12px',
                fontStyle: 'italic',
                marginRight: 'var(--spacing-sm)'
              }}>
                <span>typing</span>
                <div style={{
                  display: 'flex',
                  gap: '2px'
                }}>
                  <div style={{
                    width: '4px',
                    height: '4px',
                    background: 'var(--text-tertiary)',
                    borderRadius: '50%',
                    animation: 'typing 1.4s infinite ease-in-out'
                  }}></div>
                  <div style={{
                    width: '4px',
                    height: '4px',
                    background: 'var(--text-tertiary)',
                    borderRadius: '50%',
                    animation: 'typing 1.4s infinite ease-in-out 0.2s'
                  }}></div>
                  <div style={{
                    width: '4px',
                    height: '4px',
                    background: 'var(--text-tertiary)',
                    borderRadius: '50%',
                    animation: 'typing 1.4s infinite ease-in-out 0.4s'
                  }}></div>
                </div>
              </div>
            )}
            
            <button 
              type={isStreaming ? "button" : "submit"}
              onClick={isStreaming ? handleStopStreaming : undefined}
              disabled={isLoading || (!isStreaming && !inputValue.trim() && !selectedFile)}
              style={{
                background: isStreaming ? 'var(--status-error)' : 'var(--primary-gradient)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--spacing-md)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '48px',
                height: '48px',
                flexShrink: 0,
                opacity: isLoading || (!isStreaming && !inputValue.trim() && !selectedFile) ? 0.6 : 1,
                boxShadow: isStreaming ? '0 4px 16px rgba(239, 68, 68, 0.5)' : '0 4px 16px var(--shadow-primary)',
                fontWeight: '600'
              }}
              onMouseEnter={(e) => {
                if (!isLoading && (isStreaming || inputValue.trim() || selectedFile)) {
                  e.target.style.background = isStreaming ? 'rgba(239, 68, 68, 0.9)' : 'var(--primary-gradient-hover)';
                  e.target.style.transform = 'scale(1.05) translateY(-1px)';
                  e.target.style.boxShadow = isStreaming ? '0 6px 20px rgba(239, 68, 68, 0.6)' : '0 6px 20px var(--shadow-primary)';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.background = isStreaming ? 'var(--status-error)' : 'var(--primary-gradient)';
                e.target.style.transform = 'scale(1) translateY(0)';
                e.target.style.boxShadow = isStreaming ? '0 4px 16px rgba(239, 68, 68, 0.5)' : '0 4px 16px var(--shadow-primary)';
              }}
              onMouseDown={(e) => {
                if (!isLoading && (isStreaming || inputValue.trim() || selectedFile)) {
                  e.target.style.transform = 'scale(0.95) translateY(0)';
                }
              }}
              onMouseUp={(e) => {
                if (!isLoading && (isStreaming || inputValue.trim() || selectedFile)) {
                  e.target.style.transform = 'scale(1.05) translateY(-1px)';
                }
              }}
              aria-label={isStreaming ? "Stop response" : "Send message"}
              title={isStreaming ? "Stop response" : "Send message"}
            >
              {isLoading ? (
                <LoadingSpinner size="small" />
              ) : isStreaming ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'brightness(0) invert(1)' }}>
                  <rect x="6" y="6" width="12" height="12"></rect>
                </svg>
              ) : (
                <img src="/assets/send.svg" alt="Send" style={{ width: '24px', height: '24px', filter: 'brightness(0) invert(1)' }} />
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Keyboard Shortcuts Display */}
      {showShortcuts && (
        <KeyboardShortcuts onClose={() => setShowShortcuts(false)} />
      )}
    </div>
  );
};


export default ChatInterface;