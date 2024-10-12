import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeContext';
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import SignUp from './components/SignUp';
import CreateFamilyProfile from './components/CreateFamilyProfile';
import FamilyProfile from './components/FamilyProfile';
import AvatarDashboard from './components/AvatarDashboard';
import './scrollbar.css';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/create-family-profile" element={<CreateFamilyProfile />} />
          <Route path="/family-profile" element={<FamilyProfile />} />
          <Route path="/avatar-dashboard/:avatarId" element={<AvatarDashboard />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;