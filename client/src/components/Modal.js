import React from 'react';

const Modal = ({ children, onClose }) => {
  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modal: {
      backgroundColor: 'black',
      padding: '2rem',
      borderRadius: '10px',
      border: '1px solid #00ff00',
      color: '#00ff00',
      fontFamily: '"Courier New", Courier, monospace',
    },
    closeButton: {
      backgroundColor: 'transparent',
      border: 'none',
      color: '#00ff00',
      fontSize: '1.5rem',
      cursor: 'pointer',
      position: 'absolute',
      top: '10px',
      right: '10px',
    },
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <button style={styles.closeButton} onClick={onClose}>&times;</button>
        {children}
      </div>
    </div>
  );
};

export default Modal;