import React, { createContext, useState } from 'react';

export const ThemeContext = createContext();

const themes = {
  dark: {
    background: 'bg-black',
    secondary: 'bg-black/50',
    tertiary: 'bg-gray-900/50',
    primary: 'text-cyan-400',
    text: 'text-white',
    textMuted: 'text-gray-300',
    progressBg: 'bg-gray-700',
    progressBar: 'bg-gradient-to-r from-red-500 via-yellow-500 to-green-500',
    checkbox: 'text-cyan-400',
    input: 'bg-gray-800 text-white',
    button: 'bg-blue-500 hover:bg-blue-600',
    calendarColors: ['#1e1e1e', '#ff0000', '#ffff00', '#00ff00', '#00ff00'],
  },
  // You can add more themes here
};

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('dark');

  const theme = themes[currentTheme];

  return (
    <ThemeContext.Provider value={{ ...theme, setCurrentTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};