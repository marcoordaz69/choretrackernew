// components/Sidebar.js
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Users } from 'lucide-react';
import { useTheme } from './ThemeContext';

const Sidebar = ({ avatars }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();

  return (
    <div className={`${theme.secondary} w-16 min-h-screen fixed left-0 top-0 flex flex-col items-center p-3 border-r ${theme.border}`}>
      {/* Family Profile Button */}
      <button
        onClick={() => navigate('/family-profile')} // Updated to match your route
        className={`${theme.button} p-3 rounded-lg mb-6 w-full hover:bg-opacity-80 transition-all
          ${location.pathname === '/family-profile' ? 'bg-opacity-100' : 'bg-opacity-50'}`}
      >
        <Users size={20} />
      </button>

      {/* Divider */}
      <div className={`w-full h-px ${theme.border} mb-6`}></div>

      {/* Avatar List */}
      <div className="flex flex-col gap-4 items-center">
        {avatars?.map((avatar) => (
          <button
            key={avatar._id}
            onClick={() => navigate(`/avatar-dashboard/${avatar._id}`, { state: { avatar } })} // Updated to match your route
            className={`${theme.button} p-2 rounded-lg w-full hover:bg-opacity-80 transition-all
              ${location.pathname.includes(avatar._id) ? 'bg-opacity-100' : 'bg-opacity-50'}`}
          >
            <div className={`${theme.primary} w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold`}>
              {avatar.name?.charAt(0)}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;