// ThemeContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(darkTheme); // Set dark theme as default

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setTheme(savedTheme === 'dark' ? darkTheme : lightTheme);
    }
    // If no saved theme, it will default to dark mode
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', theme.name);
    document.body.classList.toggle('dark-mode', theme.name === 'dark');
  }, [theme]);

  const toggleTheme = () => {
    setTheme(currentTheme =>
      currentTheme.name === 'light' ? darkTheme : lightTheme
    );
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

const lightTheme = {
  name: 'light',
  background: '#f0f0f0',
  text: '#333',
  modalOverlay: 'bg-black bg-opacity-50',
  modalBackground: 'bg-white',
  calendarDay: 'bg-gray-100 border border-gray-200',
  choreBubble: 'bg-white border border-gray-300 text-gray-800',
  completedChoreBubble: 'bg-gray-100 border border-gray-400 text-gray-600',
  deleteButton: 'text-gray-500',
  deleteButtonHover: 'text-gray-700',
};

const darkTheme = {
  name: 'dark',
  background: '#333',
  text: '#f0f0f0',
  modalOverlay: 'bg-black bg-opacity-75',
  modalBackground: 'bg-[#333]',
  calendarDay: 'bg-[#333] border border-gray-600',
  choreBubble: 'bg-[#333] border border-[#f0f0f0]',
  completedChoreBubble: 'bg-gray-500 border border-gray-500 text-gray-300',
  deleteButton: 'text-gray-400',
  deleteButtonHover: 'text-gray-200',
};