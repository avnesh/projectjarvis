import React from 'react';

const KeyboardShortcuts = ({ onClose }) => {
  const shortcuts = [
    { key: 'Ctrl + Enter', description: 'Send message' },
    { key: 'Ctrl + K', description: 'Focus input' },
    { key: 'Ctrl + F', description: 'Search messages' },
    { key: 'Ctrl + /', description: 'Show/hide shortcuts' },
    { key: 'Escape', description: 'Close dialogs' },
    { key: 'Shift + Enter', description: 'New line in input' }
  ];

  return (
    <div className="keyboard-shortcuts-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)'
    }}>
      <div className="keyboard-shortcuts-modal" style={{
        background: 'var(--surface-primary)',
        border: '1px solid var(--border-primary)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--spacing-xl)',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 20px 60px var(--shadow-overlay)',
        backdropFilter: 'blur(20px)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--spacing-lg)'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: '600',
            color: 'var(--text-primary)'
          }}>
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
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
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'var(--surface-secondary)';
              e.target.style.color = 'var(--text-secondary)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent';
              e.target.style.color = 'var(--text-tertiary)';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-md)'
        }}>
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 'var(--spacing-md)',
                background: 'var(--surface-secondary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-secondary)'
              }}
            >
              <span style={{
                color: 'var(--text-secondary)',
                fontSize: '0.9rem'
              }}>
                {shortcut.description}
              </span>
              <kbd style={{
                background: 'var(--surface-primary)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--spacing-xs) var(--spacing-sm)',
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                color: 'var(--text-primary)',
                boxShadow: '0 2px 4px var(--shadow-secondary)'
              }}>
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 'var(--spacing-lg)',
          padding: 'var(--spacing-md)',
          background: 'var(--surface-secondary)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-secondary)'
        }}>
          <p style={{
            margin: 0,
            fontSize: '0.9rem',
            color: 'var(--text-tertiary)',
            textAlign: 'center'
          }}>
            Press <kbd style={{
              background: 'var(--surface-primary)',
              border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-sm)',
              padding: '2px 6px',
              fontSize: '0.8rem',
              fontFamily: 'monospace'
            }}>Escape</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcuts;
