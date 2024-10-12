import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const CreateFamilyProfile = () => {
  const [familyName, setFamilyName] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const userId = localStorage.getItem('userId');
      console.log('Sending request with userId:', userId, 'and familyName:', familyName);
      const response = await axios.post('http://localhost:5000/api/auth/update-family-profile', {
        userId,
        familyName
      });
      console.log('Family profile updated:', response.data);
      setMessage('Family profile updated successfully!');
      // Navigate to the FamilyProfile page after successful creation
      navigate('/family-profile');
    } catch (error) {
      console.error('Error updating family profile:', error.response?.data || error.message);
      console.error('Full error object:', error);
      setMessage(`Error updating family profile: ${error.response?.data?.message || error.message}`);
    }
  };

  const styles = {
    container: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: 'black',
      color: '#00ff00',
      fontFamily: '"Courier New", Courier, monospace',
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '2rem',
      backgroundColor: 'rgba(0, 255, 0, 0.1)',
      borderRadius: '10px',
      boxShadow: '0 0 10px #00ff00',
    },
    input: {
      width: '300px',
      padding: '10px',
      margin: '10px 0',
      backgroundColor: 'black',
      border: '1px solid #00ff00',
      color: '#00ff00',
      fontSize: '16px',
      fontFamily: 'inherit',
    },
    button: {
      padding: '10px 20px',
      backgroundColor: '#00ff00',
      color: 'black',
      border: 'none',
      borderRadius: '5px',
      fontSize: '16px',
      fontFamily: 'inherit',
      cursor: 'pointer',
      transition: 'background-color 0.3s',
    },
    message: {
      color: '#00ff00',
      fontSize: '16px',
      fontFamily: 'inherit',
      marginTop: '10px',
    },
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          value={familyName}
          onChange={(e) => setFamilyName(e.target.value)}
          placeholder="Enter Family Name"
          required
          style={styles.input}
        />
        <button type="submit" style={styles.button}>Create Family Profile</button>
        {message && <p style={styles.message}>{message}</p>}
      </form>
    </div>
  );
};

export default CreateFamilyProfile;