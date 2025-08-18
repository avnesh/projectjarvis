// ===== src/pages/ChatPage.jsx =====
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Layout/Header';
import Sidebar from '../components/Layout/Sidebar';
import ChatInterface from '../components/Chat/ChatInterface';
import * as chatService from '../services/chatService';
import './ChatPage.css';
import '../styles/sidebar-layout.css';

const ChatPage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [currentChat, setCurrentChat] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [lastSessionId, setLastSessionId] = useState(null); // Track last session to prevent loops

  const fetchChat = useCallback(async () => {
    if (!sessionId || loading) return;
    
    // Prevent fetching the same session multiple times
    if (lastSessionId === sessionId) return;
    
    setLoading(true);
    try {
      const chat = await chatService.getChat(sessionId);
      setCurrentChat(chat);
      setLastSessionId(sessionId); // Update last session ID
    } catch (error) {
      if (error.message === 'Chat not found') {
        setCurrentChat(null);
        setLastSessionId(sessionId);
      } else {
        console.error('Error fetching chat:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [sessionId, loading, lastSessionId]);

  useEffect(() => {
    if (sessionId) {
      fetchChat();
    } else {
      setCurrentChat(null);
      setLastSessionId(null);
    }
  }, [sessionId]); // Remove fetchChat from dependencies to prevent loops

  const handleMessageSent = useCallback(() => {
    // Refresh the sidebar chat list when a message is sent
    // This ensures new chats appear in the sidebar and existing chats are updated
    if (sessionId) {
      // Don't refetch the current chat, just update the sidebar
      // The ChatInterface will handle updating its own messages
      setTimeout(() => {
        // Force sidebar refresh without affecting current chat display
        window.dispatchEvent(new CustomEvent('chat-sent'));
      }, 100);
    }
  }, [sessionId]);

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="chat-page">
      <Header 
        isSidebarOpen={!isSidebarCollapsed} 
        onToggleSidebar={handleToggleSidebar} 
      />
      <div className="main-content">
        <Sidebar isCollapsed={isSidebarCollapsed} />
        <div className={`page-content ${!isSidebarCollapsed ? 'sidebar-open' : ''}`}>
          <div className="chat-area">
          <ChatInterface 
            currentChat={currentChat} 
            onMessageSent={handleMessageSent}
            sessionId={sessionId}
            isSidebarOpen={!isSidebarCollapsed}
          />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;