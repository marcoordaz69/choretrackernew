import React, { useState } from 'react';
import axios from 'axios';
import Modal from './Modal';  // Assuming Modal is in the same directory

const AddChorePopup = ({ avatarId, onClose, onChoreAdded }) => {
  const [choreName, setChoreName] = useState('');
  const [choreDate, setChoreDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDays, setRecurringDays] = useState([]);
  const [choreTime, setChoreTime] = useState('');

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const choreData = {
        name: choreName,
        isRecurring: isRecurring,
        time: choreTime,
      };

      if (isRecurring) {
        choreData.days = recurringDays;
      } else {
        choreData.date = choreDate;
      }

      const response = await axios.post(`/api/chores/${avatarId}/add`, choreData);
      onChoreAdded(response.data);
      onClose();
    } catch (error) {
      console.error('Error adding chore:', error);
    }
  };

  const toggleRecurringDay = (day) => {
    setRecurringDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const styles = {
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
    },
    input: {
      backgroundColor: 'black',
      border: '1px solid #00ff00',
      color: '#00ff00',
      padding: '0.5rem',
      fontFamily: '"Courier New", Courier, monospace',
    },
    label: {
      color: '#00ff00',
      marginBottom: '0.25rem',
    },
    button: {
      backgroundColor: 'black',
      border: '1px solid #00ff00',
      color: '#00ff00',
      padding: '0.5rem 1rem',
      cursor: 'pointer',
      fontFamily: '"Courier New", Courier, monospace',
      marginTop: '1rem',
    },
    dayButton: {
      backgroundColor: 'black',
      border: '1px solid #00ff00',
      color: '#00ff00',
      padding: '0.25rem 0.5rem',
      margin: '0.25rem',
      cursor: 'pointer',
      fontFamily: '"Courier New", Courier, monospace',
    },
    activeDay: {
      backgroundColor: '#00ff00',
      color: 'black',
    },
  };

  return (
    <Modal onClose={onClose}>
      <h2 style={{ color: '#00ff00', marginBottom: '1rem' }}>Add New Chore</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        <div>
          <label htmlFor="choreName" style={styles.label}>Chore Name</label>
          <input
            id="choreName"
            type="text"
            value={choreName}
            onChange={(e) => setChoreName(e.target.value)}
            required
            style={styles.input}
          />
        </div>
        <div>
          <label style={styles.label}>
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              style={{ marginRight: '0.5rem' }}
            />
            Recurring Chore
          </label>
        </div>
        {isRecurring ? (
          <div>
            <label style={styles.label}>Select Days</label>
            <div>
              {daysOfWeek.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleRecurringDay(day)}
                  style={{
                    ...styles.dayButton,
                    ...(recurringDays.includes(day) ? styles.activeDay : {})
                  }}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <label htmlFor="choreDate" style={styles.label}>Date</label>
            <input
              id="choreDate"
              type="date"
              value={choreDate}
              onChange={(e) => setChoreDate(e.target.value)}
              required={!isRecurring}
              style={styles.input}
            />
          </div>
        )}
        <div>
          <label htmlFor="choreTime" style={styles.label}>Time (optional)</label>
          <input
            id="choreTime"
            type="time"
            value={choreTime}
            onChange={(e) => setChoreTime(e.target.value)}
            style={styles.input}
          />
        </div>
        <button type="submit" style={styles.button}>Add Chore</button>
      </form>
    </Modal>
  );
};

export default AddChorePopup;