// ===== src/components/Layout/Header.jsx =====
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Header.css';

const Header = ({ onToggleSidebar, isSidebarOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState('bottom');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    console.log('🚪 Logout button clicked');
    logout();
    setShowDropdown(false);
  };

  const handleProfileClick = () => {
    setShowDropdown(false);
    navigate('/profile');
  };

  const handleSettingsClick = () => {
    setShowDropdown(false);
    navigate('/settings');
  };

  const handleDropdownToggle = () => {
    if (!showDropdown) {
      // Calculate if dropdown should appear above or below
      const buttonRect = dropdownRef.current?.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = 300; // Approximate dropdown height
      
      if (buttonRect && buttonRect.bottom + dropdownHeight > viewportHeight) {
        setDropdownPosition('top');
      } else {
        setDropdownPosition('bottom');
      }
    }
    setShowDropdown(!showDropdown);
  };

  // Generate user initials from username or full name
  const getUserInitials = () => {
    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('User data for initials:', user);
    }
    
    if (!user) return 'U';
    
    // Try to get initials from firstName + lastName first
    if (user.firstName && user.lastName) {
      return (user.firstName.charAt(0) + user.lastName.charAt(0)).toUpperCase();
    }
    
    // Fall back to username
    if (user.username) {
      const name = user.username.trim();
      const words = name.split(' ');
      
      if (words.length >= 2) {
        return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
      }
      
      return name.charAt(0).toUpperCase();
    }
    
    // Final fallback to email if available
    if (user.email) {
      return user.email.charAt(0).toUpperCase();
    }
    
    return 'U';
  };

  return (
    <header className="header">
      <div className="header-left">
        <button 
          className={`sidebar-toggle ${isSidebarOpen ? 'open' : ''}`}
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          title="Toggle menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        
        <div className="logo">
          <div className="logo-icon">
            <img src="/Jarvislogo.png" alt="Jarvis" width="48" height="48" />
          </div>
        </div>
      </div>

      <div className="header-right">
        <div className="user-profile" ref={dropdownRef}>
          <button 
            className="avatar-button"
            onClick={handleDropdownToggle}
            aria-label="User profile"
            aria-expanded={showDropdown}
            aria-haspopup="true"
          >
            {user?.avatar ? (
              <img 
                src={user.avatar} 
                alt={user.username} 
                className="avatar"
              />
            ) : (
              <div className="avatar-initial">
                {getUserInitials()}
              </div>
            )}
          </button>
          
          {showDropdown && (
            <div className={`dropdown-menu ${dropdownPosition === 'top' ? 'dropdown-top' : ''}`}>
              <div className="dropdown-header">
                <div className="username">
                  {user?.username || 'User'}
                </div>
                <div className="email">
                  {user?.email || 'user@example.com'}
                </div>
              </div>
              
              <button 
                className="dropdown-item"
                onClick={handleProfileClick}
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Edit Profile</span>
              </button>
              
              <button 
                className="dropdown-item"
                onClick={handleSettingsClick}
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Settings</span>
              </button>
              
              <div className="dropdown-divider"></div>
              
              <button 
                className="dropdown-item logout"
                onClick={handleLogout}
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;