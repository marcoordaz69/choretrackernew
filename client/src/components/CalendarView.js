import React, { useState, useRef, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, startOfWeek, addDays } from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon, XIcon, CheckIcon, WandIcon } from 'lucide-react';
import { useTheme } from './ThemeContext';

const CalendarView = ({ chores, onDateClick, onDeleteChore, onClose }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isEditMode, setIsEditMode] = useState(false);
  const { theme } = useTheme();
  const calendarRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const toggleEditMode = () => setIsEditMode(!isEditMode);

  const renderChores = (day) => {
    const dayOfWeek = format(day, 'EEEE');
    const dateString = format(day, 'yyyy-MM-dd');
    
    // Get chores for this specific date
    const dayChores = chores[dateString] || [];
    
    // Get recurring chores for this day of the week
    const recurringChores = Object.values(chores)
      .flat()
      .filter(chore => chore.isRecurring && chore.days && chore.days.includes(dayOfWeek));

    // Combine one-time and recurring chores
    const allChores = [...dayChores, ...recurringChores];

    return allChores.map((chore) => (
      <div
        key={chore._id}
        className={`text-xs p-2 mb-1 rounded-full flex justify-between items-center shadow-sm ${
          chore.completed ? theme.completedChoreBubble : theme.choreBubble
        }`}
        title={chore.isRecurring ? `Recurring every ${dayOfWeek}` : `One-time on ${dateString}`}
      >
        <div className="flex items-center space-x-1 flex-grow">
          {chore.completed && <CheckIcon size={12} className="text-green-500" />}
          <span className="truncate">{chore.name}</span>
        </div>
        {isEditMode && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteChore(chore._id);
            }}
            className={`${theme.deleteButton} hover:${theme.deleteButtonHover} ml-2 rounded-full p-1`}
          >
            <XIcon size={12} />
          </button>
        )}
      </div>
    ));
  };

  const getDaysInMonth = (month) => {
    const start = startOfWeek(startOfMonth(month));
    const end = endOfMonth(month);
    const days = eachDayOfInterval({ start, end });
    
    // Add days to complete the last week
    while (days.length % 7 !== 0) {
      days.push(addDays(days[days.length - 1], 1));
    }
    
    return days;
  };

  const daysInMonth = getDaysInMonth(currentMonth);

  return (
    <div className={`fixed inset-0 flex items-center justify-center ${theme.modalOverlay} z-50`} onClick={onClose}>
      <div 
        ref={calendarRef}
        className={`w-11/12 h-5/6 ${theme.modalBackground} ${theme.text} rounded-lg p-6 overflow-auto shadow-lg`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <button onClick={prevMonth} className={`p-2 ${theme.button} rounded-full`}>
            <ChevronLeftIcon className="w-6 h-6" />
          </button>
          <h2 className={`text-2xl font-bold ${theme.text}`}>
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <div className="flex items-center space-x-2">
            <button onClick={toggleEditMode} className={`p-2 ${theme.button} rounded-full`}>
              <WandIcon className="w-6 h-6" />
            </button>
            <button onClick={nextMonth} className={`p-2 ${theme.button} rounded-full`}>
              <ChevronRightIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className={`text-center font-bold ${theme.text}`}>
              {day}
            </div>
          ))}
          {daysInMonth.map(day => (
            <div
              key={day.toString()}
              className={`min-h-[100px] p-2 ${theme.calendarDay} ${
                !isSameMonth(day, currentMonth) ? theme.calendarDayOutside : ''
              } ${isSameDay(day, new Date()) ? theme.calendarDayToday : ''}`}
              onClick={() => onDateClick(format(day, 'yyyy-MM-dd'))}
            >
              <div className={`text-right ${theme.text} mb-1`}>{format(day, 'd')}</div>
              <div className="space-y-1">
                {renderChores(day)}
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 ${theme.closeButton} hover:${theme.closeButtonHover} rounded-full p-1`}
        >
          <XIcon size={24} />
        </button>
      </div>
    </div>
  );
};

export default CalendarView;