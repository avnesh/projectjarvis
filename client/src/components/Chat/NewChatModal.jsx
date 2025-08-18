// ===== src/components/Chat/NewChatModal.jsx =====
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as chatService from '../../services/chatService';
import LoadingSpinner from '../Common/LoadingSpinner';

const NewChatModal = ({ chatHistory, onClose, onChatCreated }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    model: 'groq',
    tags: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const availableModels = [
    { id: 'groq', name: 'Groq (Fast)', description: 'Lightning-fast responses' },
    { id: 'gemini', name: 'Google Gemini', description: 'Advanced reasoning' },
    { id: 'tavily', name: 'Tavily', description: 'Web search enhanced' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const chatOptions = {
        title: formData.title.trim() || undefined,
        model: formData.model,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : []
      };

      const newChat = await chatService.createNewChat(chatOptions);
      
      if (onChatCreated) {
        onChatCreated(newChat);
      }

      navigate(`/chat/${newChat.sessionId}`);
      onClose();
    } catch (error) {
      console.error('Failed to create new chat:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickStart = async (model) => {
    setIsLoading(true);
    setError(null);

    try {
      const newChat = await chatService.createNewChat({ model });
      
      if (onChatCreated) {
        onChatCreated(newChat);
      }

      navigate(`/chat/${newChat.sessionId}`);
      onClose();
    } catch (error) {
      console.error('Failed to create quick chat:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content new-chat-modal">
        <div className="modal-header">
          <h2>Start New Chat</h2>
          <button 
            className="modal-close"
            onClick={onClose}
            disabled={isLoading}
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="quick-start-section">
            <h3>Quick Start</h3>
            <div className="quick-start-grid">
              {availableModels.map((model) => (
                <button
                  key={model.id}
                  className="quick-start-card"
                  onClick={() => handleQuickStart(model.id)}
                  disabled={isLoading}
                >
                  <div className="model-name">{model.name}</div>
                  <div className="model-description">{model.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="divider">
            <span>OR</span>
          </div>

          <div className="custom-chat-section">
            <h3>Customize Your Chat</h3>
            
            <form onSubmit={handleSubmit} className="new-chat-form">
              <div className="form-group">
                <label htmlFor="title">Chat Title (Optional)</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g., Marketing Strategy Discussion"
                  disabled={isLoading}
                />
                <small>Leave empty for auto-generated title</small>
              </div>

              <div className="form-group">
                <label htmlFor="model">AI Model</label>
                <select
                  id="model"
                  name="model"
                  value={formData.model}
                  onChange={handleInputChange}
                  disabled={isLoading}
                >
                  {availableModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} - {model.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="tags">Tags (Optional)</label>
                <input
                  type="text"
                  id="tags"
                  name="tags"
                  value={formData.tags}
                  onChange={handleInputChange}
                  placeholder="work, project, brainstorm"
                  disabled={isLoading}
                />
                <small>Separate tags with commas</small>
              </div>

              {error && (
                <div className="error-message">
                  ⚠️ {error}
                </div>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <LoadingSpinner size="small" />
                      Creating...
                    </>
                  ) : (
                    'Create Chat'
                  )}
                </button>
              </div>
            </form>
          </div>

          {chatHistory.length > 0 && (
            <div className="recent-chats-preview">
              <h3>Continue Recent Chat</h3>
              <div className="recent-chats-list">
                {chatHistory.slice(0, 3).map((chat) => (
                  <button
                    key={chat.sessionId}
                    className="recent-chat-item"
                    onClick={() => {
                      navigate(`/chat/${chat.sessionId}`);
                      onClose();
                    }}
                    disabled={isLoading}
                  >
                    <div className="chat-title">
                      {chat.title || 'Untitled Chat'}
                    </div>
                    <div className="chat-preview">
                      {chat.lastMessage || 'No messages yet'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewChatModal;