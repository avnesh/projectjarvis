// ===== src/components/Layout/Sidebar.jsx =====
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import * as chatService from '../../services/chatService';
import './Sidebar.css';

const Sidebar = ({ isCollapsed }) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [navigating, setNavigating] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [hoveredChatId, setHoveredChatId] = useState(null);
  const [deletingChatId, setDeletingChatId] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [chatTooltip, setChatTooltip] = useState({ show: false, chatId: null, title: '', position: { x: 0, y: 0 } });

  useEffect(() => {
    fetchChats();
    
    // Listen for chat updates
    const handleChatSent = () => {
      setTimeout(() => fetchChats(), 500);
    };
    
    const handleTitleUpdated = () => {
      fetchChats(); // Refresh immediately when title is updated
    };
    
    window.addEventListener('chat-sent', handleChatSent);
    window.addEventListener('chat-title-updated', handleTitleUpdated);
    
    // Real connection status monitoring
    const checkConnection = async () => {
      try {
        // API health check
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/health`, { 
          method: 'GET',
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.status === 'healthy') {
            setConnectionStatus('connected');
          } else {
            setConnectionStatus('disconnected');
          }
        } else {
          setConnectionStatus('disconnected');
        }
      } catch (error) {
        console.log('Connection check failed:', error.message);
        setConnectionStatus('disconnected');
      }
      setLastUpdate(new Date());
    };

    // Initial connection check
    checkConnection();
    
    // Periodic connection checks
    const connectionInterval = setInterval(checkConnection, 30000); // Every 30 seconds
    
    // Cleanup interval on unmount
    return () => {
      clearInterval(connectionInterval);
      window.removeEventListener('chat-sent', handleChatSent);
      window.removeEventListener('chat-title-updated', handleTitleUpdated);
    };
  }, []); // Empty dependency array to run only once

  const fetchChats = async () => {
    try {
      setLoading(true);
      const response = await chatService.getChats();
      
      if (response.success && response.chats) {
        setChats(response.chats);
      } else {
        console.error('Invalid response format:', response);
        setChats([]);
      }
    } catch (error) {
      console.error('Failed to fetch chats:', error);
      setChats([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChatClick = (chatId) => {
    setNavigating(true);
    navigate(`/chat/${chatId}`);
    
    // Clear navigating state after navigation
    setTimeout(() => {
      setNavigating(false);
    }, 500);
  };

  const handleDeleteChat = async (chatId, e) => {
    e.stopPropagation(); // Prevent chat selection
    
    if (window.confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      setDeletingChatId(chatId);
      
      try {
        // Call API to delete chat
        await chatService.deleteChat(chatId, true); // permanent = true
        
        // Remove from local state
        setChats(prev => prev.filter(chat => chat._id !== chatId));
        
        // If we're currently viewing this chat, create and navigate to new chat
        if (location.pathname === `/chat/${chatId}`) {
          try {
            const newChat = await chatService.createNewChat();
            navigate(`/chat/${newChat.sessionId}`);
          } catch (error) {
            // Fallback to basic /chat route if creating new chat fails
            navigate('/chat');
          }
        }
      } catch (error) {
        console.error('Failed to delete chat:', error);
        alert('Failed to delete conversation. Please try again.');
      } finally {
        setDeletingChatId(null);
      }
    }
  };

  const getChatTitle = (chat) => {
    // Use server-generated title if available
    if (chat.title && chat.title.trim() !== '' && chat.title !== 'New Conversation') {
      return chat.title;
    }
    
    // Fallback to client-side title generation
    if (chat.messages && chat.messages.length > 0) {
      const firstMessage = chat.messages[0];
      if (firstMessage.content && firstMessage.content.trim() !== '') {
        const content = firstMessage.content.trim();
        // Skip generic messages
        const genericMessages = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'test'];
        if (!genericMessages.includes(content.toLowerCase())) {
          return content.length > 25 ? content.substring(0, 25) + '...' : content;
        }
      }
    }
    
    // If no meaningful content, use timestamp
    if (chat.updatedAt) {
      const date = new Date(chat.updatedAt);
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) return 'Today\'s Chat';
      if (diffDays === 2) return 'Yesterday\'s Chat';
      if (diffDays <= 7) return `${diffDays - 1} days ago`;
      return date.toLocaleDateString();
    }
    
    return 'New Conversation';
  };

  const getChatPreview = (chat) => {
    if (chat.messages && chat.messages.length > 0) {
      const lastMessage = chat.messages[chat.messages.length - 1];
      if (lastMessage.content && lastMessage.content.trim() !== '') {
        const content = lastMessage.content.trim();
        return content.length > 40 ? content.substring(0, 40) + '...' : content;
      }
    }
    return 'No messages yet';
  };

  const getMessageCount = (chat) => {
    const count = chat.totalMessages || chat.messages?.length || 0;
    if (count === 0) return 'No messages';
    if (count === 1) return '1 message';
    return `${count} messages`;
  };

  const isActiveChat = (chatId) => {
    return location.pathname === `/chat/${chatId}`;
  };

  const getConnectionStatusText = (status) => {
    switch (status) {
      case 'connected':
        return 'Online';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Offline';
      default:
        return 'Unknown';
    }
  };

  const getConnectionStatusColor = (status) => {
    switch (status) {
      case 'connected':
        return 'var(--status-success)';
      case 'connecting':
        return 'var(--status-warning)';
      case 'disconnected':
        return 'var(--status-error)';
      default:
        return 'var(--text-quaternary)';
    }
  };

  const formatLastUpdate = (date) => {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 min ago';
    if (minutes < 60) return `${minutes} mins ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    
    const days = Math.floor(hours / 24);
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  };

  return (
    <div 
      className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}
      onMouseEnter={() => isCollapsed && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="sidebar-content">
        {/* New Chat Section */}
        <div className="new-chat-section">
          <button
            onClick={() => {
              // Simply navigate to the clean chat page without creating a session
              // Session will be created when user sends their first message
              navigate('/chat');
            }}
            className="new-chat-button"
            disabled={loading}
            aria-label={isCollapsed ? "New Chat" : undefined}
            title={isCollapsed ? "New Chat" : undefined}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>{loading ? 'Creating...' : 'New Chat'}</span>
          </button>
        </div>

        {/* Chat List Section */}
        <div className="chat-list-section">
          <div className="section-header">
            <h3 id="conversations-heading">Recent Conversations</h3>
            <button
              onClick={fetchChats}
              disabled={loading}
              className="refresh-button"
              title="Refresh conversations"
              aria-label="Refresh conversations"
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
            >
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                style={{
                  transform: loading ? 'rotate(360deg)' : 'rotate(0deg)',
                  transition: 'transform 0.5s ease'
                }}
              >
                <polyline points="23,4 23,10 17,10"></polyline>
                <polyline points="1,20 1,14 7,14"></polyline>
                <path d="M20.49,9A9,9 0 0,0 5.64,5.64L1,10m22,4l-4.64,4.36A9,9 0 0,1 3.51,15"></path>
              </svg>
            </button>
          </div>
          
          <div className="chat-list" role="list" aria-labelledby="conversations-heading">
            {loading ? (
              <div className="loading-chats">
                <div className="loading-spinner"></div>
                <span>Loading conversations...</span>
              </div>
            ) : chats.length === 0 ? (
              <div className="empty-state">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <p>No conversations yet</p>
                <span>Start a new chat to begin</span>
              </div>
            ) : (
              chats.map((chat) => (
                <div
                  key={chat._id}
                  className={`chat-item ${isActiveChat(chat._id) ? 'active' : ''} ${navigating ? 'navigating' : ''}`}
                  onClick={() => handleChatClick(chat._id)}
                  onMouseEnter={(e) => {
                    setHoveredChatId(chat._id);
                    const title = getChatTitle(chat);
                    const titleElement = e.currentTarget.querySelector('.chat-title');
                    if (titleElement && titleElement.scrollWidth > titleElement.clientWidth) {
                      const rect = titleElement.getBoundingClientRect();
                      setChatTooltip({
                        show: true,
                        chatId: chat._id,
                        title: title,
                        position: {
                          x: rect.right + 10,
                          y: rect.top + (rect.height / 2)
                        }
                      });
                    }
                  }}
                  onMouseLeave={() => {
                    setHoveredChatId(null);
                    setChatTooltip({ show: false, chatId: null, title: '', position: { x: 0, y: 0 } });
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleChatClick(chat._id);
                    }
                  }}
                  aria-label={`Chat: ${getChatTitle(chat)}`}
                >
                  <div className="chat-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                  </div>
                  
                  <div className="chat-info">
                    <div className="chat-title" title={getChatTitle(chat)}>{getChatTitle(chat)}</div>
                    <div className="chat-preview" title={getChatPreview(chat)}>{getChatPreview(chat)}</div>
                    <div className="chat-meta">
                      <span className="chat-count">
                        {getMessageCount(chat)}
                      </span>
                      <span className="chat-date">
                        {chat.updatedAt ? new Date(chat.updatedAt).toLocaleDateString() : 'New'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Delete Button - Always Reserve Space */}
                  <div className="delete-button-container">
                    <button
                      onClick={(e) => handleDeleteChat(chat._id, e)}
                      disabled={deletingChatId === chat._id}
                      className={`delete-button ${hoveredChatId === chat._id ? 'visible' : 'hidden'}`}
                      title={`Delete conversation: ${getChatTitle(chat)}`}
                      aria-label={`Delete conversation: ${getChatTitle(chat)}`}
                      role="button"
                      tabIndex={hoveredChatId === chat._id ? 0 : -1}
                    >
                      {deletingChatId === chat._id ? (
                        <div className="delete-spinner"></div>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3,6 5,6 21,6"></polyline>
                          <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Status Section */}
        <div className="status-section">
          <div className="status-indicator">
            <div 
              className="status-dot" 
              style={{ 
                background: getConnectionStatusColor(connectionStatus),
                boxShadow: `0 0 8px ${getConnectionStatusColor(connectionStatus)}40`
              }}
            ></div>
            <span className="status-text">
              Jarvis {getConnectionStatusText(connectionStatus)}
            </span>
          </div>
          
          <div className="status-details">
            <div className="timestamp">
              Last updated: {formatLastUpdate(lastUpdate)}
            </div>
            
            <div className="version-info">
              v1.0.0
            </div>
          </div>
        </div>
      </div>
      
      {/* Tooltip for collapsed state */}
      {showTooltip && isCollapsed && (
        <div className="sidebar-tooltip">
          <span>Menu</span>
        </div>
      )}
      
      {/* Chat title tooltip */}
      {chatTooltip.show && (
        <div 
          className="chat-title-tooltip" 
          style={{
            position: 'fixed',
            left: `${chatTooltip.position.x}px`,
            top: `${chatTooltip.position.y}px`,
            transform: 'translateY(-50%)',
            background: 'var(--surface-overlay)',
            color: 'var(--text-primary)',
            padding: 'var(--spacing-sm) var(--spacing-md)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px',
            fontWeight: '500',
            maxWidth: '300px',
            wordWrap: 'break-word',
            boxShadow: '0 4px 16px var(--shadow-overlay)',
            border: '1px solid var(--border-primary)',
            backdropFilter: 'blur(20px)',
            zIndex: 'var(--z-dropdown)',
            pointerEvents: 'none',
            whiteSpace: 'normal'
          }}
        >
          {chatTooltip.title}
        </div>
      )}
    </div>
  );
};

export default Sidebar;