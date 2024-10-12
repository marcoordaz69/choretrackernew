import React, { useState, useEffect, useRef } from 'react';
import { LockIcon, PlusIcon, XIcon, HomeIcon, CalendarIcon, MessageSquareIcon, DollarSignIcon, ActivityIcon } from "lucide-react";

const LayoutControls = ({ 
  isLayoutLocked, 
  setIsLayoutLocked, 
  theme, 
  setIsAddChoreModalOpen, 
  hiddenComponents, 
  toggleComponentVisibility,
  saveCurrentLayout,
  resetLayout
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const componentIcons = {
    greeting: HomeIcon,
    contributionGraph: CalendarIcon,
    weeklyCalendar: CalendarIcon,
    chatInput: MessageSquareIcon,
    allowanceTracker: DollarSignIcon,
    realtime: ActivityIcon
  };

  return (
    <div className="fixed top-2 right-2 flex flex-col items-end z-10 space-y-2">
      <div className="flex items-center space-x-2">
        {!isLayoutLocked && (
          <>
            <button
              className={`px-2 py-1 text-xs ${theme.button} rounded-md hover:bg-opacity-80`}
              onClick={() => {
                saveCurrentLayout();
                // Optional: Add some visual feedback here
              }}
            >
              Save Layout
            </button>
            <button
              className={`px-2 py-1 text-xs ${theme.button} rounded-md hover:bg-opacity-80`}
              onClick={() => {
                resetLayout();
                // Optional: Add some visual feedback here
              }}
            >
              Reset Layout
            </button>
          </>
        )}
        <button
          onClick={() => setIsLayoutLocked(!isLayoutLocked)}
          className={`flex items-center justify-center w-8 h-8 focus:outline-none ${isLayoutLocked ? 'bg-black text-white' : theme.button} rounded-full`}
          aria-label={isLayoutLocked ? "Unlock layout" : "Lock layout"}
        >
          <LockIcon size={16} />
        </button>
      </div>
      <div className="relative" ref={menuRef}>
        <button
          className={`p-2 ${theme.button} rounded-full shadow-md hover:bg-opacity-80 transition-colors`}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <XIcon size={24} /> : <PlusIcon size={24} />}
        </button>
        {isMenuOpen && (
          <div className={`absolute right-0 mt-2 p-2 rounded-md shadow-lg ${theme.secondary} ring-1 ring-black ring-opacity-5 flex flex-col space-y-2`}>
            <button
              className={`flex items-center justify-center p-2 ${theme.button} hover:bg-opacity-80 rounded-full`}
              onClick={() => {
                setIsAddChoreModalOpen(true);
                setIsMenuOpen(false);
              }}
              title="Add Chore"
            >
              <PlusIcon size={20} />
            </button>
            {Object.entries(hiddenComponents).map(([key, isHidden]) => {
              const Icon = componentIcons[key];
              return (
                <button
                  key={key}
                  className={`flex items-center justify-center p-2 ${theme.button} hover:bg-opacity-80 rounded-full relative`}
                  onClick={() => {
                    toggleComponentVisibility(key);
                    setIsMenuOpen(false);
                  }}
                  title={`${isHidden ? 'Show' : 'Hide'} ${key.charAt(0).toUpperCase() + key.slice(1)}`}
                >
                  {!isHidden && (
                    <div className="absolute inset-0 bg-black rounded-full opacity-20"></div>
                  )}
                  <Icon size={20} className={isHidden ? '' : 'z-10'} />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LayoutControls;