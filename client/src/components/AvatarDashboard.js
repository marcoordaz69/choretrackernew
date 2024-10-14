const LOCAL_RELAY_SERVER_URL =
  process.env.REACT_APP_LOCAL_RELAY_SERVER_URL || '';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Checkbox } from "../components/UI/checkbox";
import { CalendarIcon, XIcon, SendIcon, ChevronDownIcon, ChevronUpIcon, Moon, Sun, LockIcon, PlusIcon, BarChartIcon, HomeIcon, MessageSquareIcon, DollarSignIcon, ActivityIcon,Save, RotateCcw, WandIcon } from "lucide-react";
import Calendar from 'react-github-contribution-calendar';
import { format, parse, parseISO, isValid, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./UI/dialog";
import { Button } from "./UI/button";
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Input } from "../components/UI/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/UI/card";
import { Switch } from "../components/UI/switch";
import AllowanceTracker from './AllowanceTracker';
import { useTheme } from './ThemeContext';  // Make sure this path is correct
import ChatbotComponent from './ChatbotComponent';
import { Label } from "./UI/label";
import CalendarView from './CalendarView';
import RealtimeComponent from './RealtimeComponent';
import { X, Check } from "lucide-react";
import AddChoreModal from './AddChoreModal';
import LayoutControls from './LayoutControls';  // Adjust the import path as needed


const ResponsiveGridLayout = WidthProvider(Responsive);

const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const useResizeObserverFix = () => {
  useEffect(() => {
    const debounce = (fn, delay) => {
      let timeoutId;
      return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
      };
    };

    const handleError = debounce((e) => {
      if (e.message === 'ResizeObserver loop completed with undelivered notifications.' ||
          e.message === 'ResizeObserver loop limit exceeded') {
        const resizeObserverErrDiv = document.getElementById(
          'webpack-dev-server-client-overlay-div'
        );
        const resizeObserverErr = document.getElementById(
          'webpack-dev-server-client-overlay'
        );
        if (resizeObserverErr) {
          resizeObserverErr.style.display = 'none';
        }
        if (resizeObserverErrDiv) {
          resizeObserverErrDiv.style.display = 'none';
        }
      }
    }, 100);

    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);
};

const AvatarDashboard = ({ userId }) => {
  useResizeObserverFix();
  const layoutRef = useRef(null);
  const { theme, toggleTheme } = useTheme();
  
  const { avatarId } = useParams();
  const location = useLocation();
  const avatar = location.state?.avatar;
  const [chores, setChores] = useState({});
  const [currentWeek, setCurrentWeek] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [newChore, setNewChore] = useState("");

  const [isAddChoreModalOpen, setIsAddChoreModalOpen] = useState(false);
  const [newChoreDetails, setNewChoreDetails] = useState({
    name: '',
    isRecurring: false,
    daysOfWeek: [],
    date: null,
  });

  const [isCalendarView, setIsCalendarView] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [todayCompletedChores, setTodayCompletedChores] = useState(0);
  const [todayTotalChores, setTodayTotalChores] = useState(0);

  const [calendarValues, setCalendarValues] = useState({});
  const [choresByDate, setChoresByDate] = useState({});
  const [hoveredDate, setHoveredDate] = useState(null);

  const [chatMessages, setChatMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');

  const [layout, setLayout] = useState(() => {
    const savedLayout = localStorage.getItem('dashboardLayout');
    return savedLayout ? JSON.parse(savedLayout) : {
      lg: [
        { i: 'greeting', x: 0, y: 0, w: 12, h: 1 },
        { i: 'contributionGraph', x: 0, y: 1, w: 12, h: 3 },
        { i: 'weeklyCalendar', x: 0, y: 4, w: 8, h: 2 },
        { i: 'chatInput', x: 8, y: 4, w: 4, h: 2 },
        { i: 'allowanceTracker', x: 0, y: 6, w: 6, h: 2 },
        { i: 'realtime', x: 6, y: 6, w: 6, h: 4 }, // Added RealtimeComponent with more height
      ]
    };
  });

  const [isLayoutLocked, setIsLayoutLocked] = useState(true);

  const [weather, setWeather] = useState(null);

  const [expandedDays, setExpandedDays] = useState({});

  const [choreUpdateTrigger, setChoreUpdateTrigger] = useState(0);

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! I'm your friendly AI assistant. How can I help you with your chores today?", isAi: true },
  ]);

  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [isWeeklyCalendarMinimized, setIsWeeklyCalendarMinimized] = useState(false);

  const [hiddenComponents, setHiddenComponents] = useState({
    greeting: false,
    contributionGraph: false,
    weeklyCalendar: false,
    chatInput: false,
    allowanceTracker: false,
    realtime: false
  });

  const toggleComponentVisibility = (componentKey) => {
    setHiddenComponents(prev => ({
      ...prev,
      [componentKey]: !prev[componentKey]
    }));
  };

  useEffect(() => {
    fetchChores();
    setCurrentWeek(getCurrentWeek());
    fetchWeather();
  }, [avatarId]);

  useEffect(() => {
    const chatContainer = document.getElementById('chat-container');
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }, [chatMessages]);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const fetchChores = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/chores/${avatarId}`);
      const fetchedChores = response.data.chores || {};
      console.log('Fetched chores:', fetchedChores);
  
      const choresByDate = {};
      Object.entries(fetchedChores).forEach(([day, dayChores]) => {
        dayChores.forEach(chore => {
          const choreDate = chore.date || format(parse(day, 'EEEE', new Date()), 'yyyy-MM-dd');
          if (!choresByDate[choreDate]) {
            choresByDate[choreDate] = [];
          }
          choresByDate[choreDate].push(chore);
        });
      });
  
      setChoresByDate(choresByDate);
      setChores(choresByDate);
      updateTodayChores(choresByDate);
      updateCalendarValues(choresByDate);
  
      // Update current week chores
      setCurrentWeek(getCurrentWeek());
  
      // Trigger a re-render of components that depend on chore data
      setChoreUpdateTrigger(prev => prev + 1);
  
    } catch (error) {
      console.error('Error fetching chores:', error);
      setChoresByDate({});
      setChores({});
      setTodayTotalChores(0);
      setTodayCompletedChores(0);
    }
  };

  const handleSendMessage = async (message) => {
    if (message.trim() === '') return;
  
    const userMessage = { id: messages.length + 1, text: message, isAi: false };
    setMessages(prev => [...prev, userMessage]);
  
    try {
      const response = await axios.post('http://localhost:5000/api/chat', {
        message: message,
        avatarId
      });
  
      if (response.data && response.data.message) {
        const aiMessage = { id: messages.length + 2, text: response.data.message, isAi: true };
        setMessages(prev => [...prev, aiMessage]);
  
        if (response.data.choreAdded) {
          console.log('Chore added, updating local state');
          const newChore = response.data.newChore;
          setChores(prevChores => {
            const newChores = { ...prevChores };
            const choreDate = newChore.date || format(new Date(), 'yyyy-MM-dd');
            if (!newChores[choreDate]) {
              newChores[choreDate] = [];
            }
            newChores[choreDate].push(newChore);
            return newChores;
          });
  
          // Update other related states
          updateTodayChores(chores);
          updateCalendarValues(chores);
          setCurrentWeek(getCurrentWeek());
  
          // Trigger a re-render of components that depend on chore data
          setChoreUpdateTrigger(prev => prev + 1);
        }
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Error sending message to server:', error);
      const errorMessage = { id: messages.length + 2, text: "Sorry, I encountered an error. Please try again.", isAi: true };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const getCurrentWeek = () => {
    const today = new Date();
    const currentDay = today.getDay();
    return daysOfWeek.map((day, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - currentDay + index);
      return {
        day,
        date: format(date, 'yyyy-MM-dd')
      };
    });
  };

  const updateTodayChores = (choresByDate) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayChores = choresByDate[today] || [];
    const completedCount = todayChores.filter(chore => chore.completed).length;
    
    setTodayTotalChores(todayChores.length);
    setTodayCompletedChores(completedCount);
    
    console.log(`Today's chores: ${todayChores.length}, Completed: ${completedCount}`);
  };

  const handleToggleChore = async (choreId, date) => {
    try {
      setChores(prevChores => {
        const updatedChores = {
          ...prevChores,
          [date]: (prevChores[date] || []).map(chore => 
            chore._id === choreId ? { ...chore, completed: !chore.completed } : chore
          )
        };
        
        updateTodayChores(updatedChores);
        updateCalendarValues(updatedChores);
        
        return updatedChores;
      });

      await axios.post(`http://localhost:5000/api/chores/${avatarId}/toggle`, {
        choreId,
        completed: !chores[date].find(chore => chore._id === choreId).completed
      });

      // Trigger AllowanceTracker update
      setChoreUpdateTrigger(prev => prev + 1);

    } catch (error) {
      console.error('Error toggling chore:', error);
      fetchChores();
    }
  };

  const handleAddChore = async () => {
    if (newChore.name) {
      try {
        let choreData;
  
        if (newChore.isRecurring) {
          if (newChore.daysOfWeek.length === 0) {
            console.error('No days selected for recurring chore');
            return;
          }
          choreData = {
            choreName: newChore.name,
            days: newChore.daysOfWeek,
            isRecurring: true
          };
        } else {
          if (!newChore.date) {
            console.error('No date selected for non-recurring chore');
            return;
          }
          
          const parsedDate = parseISO(newChore.date);
          if (!isValid(parsedDate)) {
            console.error('Invalid date format');
            return;
          }
          
          choreData = {
            choreName: newChore.name,
            date: format(parsedDate, 'yyyy-MM-dd'),
            isRecurring: false
          };
        }
  
        console.log('Sending chore data:', choreData);
  
        const response = await axios.post(`http://localhost:5000/api/chores/${avatarId}/add`, choreData);
        
        // Immediately fetch updated chores after successful addition
        await fetchChores();
  
        setNewChore({
          name: '',
          isRecurring: false,
          daysOfWeek: [],
          date: format(new Date(), 'yyyy-MM-dd'),
        });
        setIsAddChoreModalOpen(false);
        
        console.log('Chore added successfully:', response.data);
      } catch (error) {
        console.error('Error adding chore:', error.response ? error.response.data : error.message);
      }
    } else {
      console.error('Chore name is required');
    }
  };

  const handleDeleteChore = async (choreId) => {
    if (!choreId) {
      console.error('No chore ID provided for deletion');
      return;
    }
    try {
      const response = await axios.delete(`http://localhost:5000/api/chores/${avatarId}/${choreId}`);
      console.log('Chore deletion response:', response.data);
      fetchChores();
    } catch (error) {
      console.error('Error deleting chore:', error.response ? error.response.data : error.message);
    }
  };

  const handleDayClick = useCallback((date) => {
    let dateObj;
    if (typeof date === 'string') {
      dateObj = parseISO(date);
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      console.error('Invalid date format:', date);
      return;
    }
  
    if (!isValid(dateObj)) {
      console.error('Invalid date:', date);
      return;
    }
  
    const dateString = format(dateObj, 'yyyy-MM-dd');
    setSelectedDay(dateString);
    setNewChore(prev => ({
      ...prev,
      date: dateString,
      isRecurring: false
    }));
    setIsAddChoreModalOpen(true);
  }, []);

  const handleCloseModal = () => {
    setIsAddChoreModalOpen(false);
    setNewChoreDetails({
      name: '',
      isRecurring: false,
      daysOfWeek: [],
      date: null,
    });
  };

  const getEmoji = (percentage) => {
    if (percentage < 33) return "😈"
    if (percentage < 66) return "😐"
    return "😇"
  }

  const fetchWeather = async () => {
    try {
      const apiKey = 'YOUR_OPENWEATHERMAP_API_KEY'; // Replace with your actual API key
      const city = 'Your City'; // Replace with your city name
      const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`);
      setWeather(response.data);
    } catch (error) {
      console.error('Error fetching weather:', error);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    let greeting = '';
    if (hour < 12) greeting = "Good morning";
    else if (hour < 18) greeting = "Good afternoon";
    else greeting = "Good evening";

    const today = format(new Date(), 'EEEE, MMMM do');
    let weatherInfo = '';
    if (weather) {
      weatherInfo = `It's ${Math.round(weather.main.temp)}°C (${weather.weather[0].description})`;
    }

    return `${greeting}! Today is ${today}. ${weatherInfo}`;
  };

  const updateCalendarValues = (choresByDate) => {
    const values = {};
    Object.entries(choresByDate).forEach(([date, dayChores]) => {
      if (dayChores.length === 0) {
        values[date] = 0;
      } else {
        const completedCount = dayChores.filter(chore => chore.completed).length;
        const completionRate = completedCount / dayChores.length;
        values[date] = Math.round(completionRate * 4);
      }
    });
    setCalendarValues(values);
  };

  const getChoreDetailsForDate = (dateString) => {
    const dayChores = choresByDate[dateString] || [];
    const completedChores = dayChores.filter(chore => chore.completed);
    const completionRate = dayChores.length > 0 ? completedChores.length / dayChores.length : 0;
    
    return {
      total: dayChores.length,
      completed: completedChores.length,
      completionRate: completionRate,
      choreList: dayChores.map(chore => ({
        name: chore.name,
        completed: chore.completed
      }))
    };
  };

  const adjustLayout = (layout, cols) => {
    return layout.map(item => {
      const newItem = { ...item };
      if (newItem.x + newItem.w > cols) {
        newItem.x = Math.max(0, cols - newItem.w);
      }
      if (newItem.x < 0) {
        newItem.x = 0;
      }
      if (newItem.y < 0) {
        newItem.y = 0;
      }
      return newItem;
    });
  };

  const onLayoutChange = useCallback((currentLayout) => {
    setLayout({ lg: currentLayout });
    localStorage.setItem('dashboardLayout', JSON.stringify({ lg: currentLayout }));
  }, []);

  const saveLayout = (currentLayout) => {
    localStorage.setItem('dashboardLayout', JSON.stringify({ lg: currentLayout }));
  };

  

  const saveCurrentLayout = () => {
    localStorage.setItem('dashboardLayout', JSON.stringify(layout));
    // Optional: Add some visual feedback here, like a toast notification
    console.log('Layout saved');
  };
  
  const resetLayout = () => {
    const defaultLayout = {
      lg: [
        { i: 'greeting', x: 4, y: 0, w: 4, h: 1 },
        { i: 'contributionGraph', x: 4, y: 1, w: 4, h: 2 },
        { i: 'weeklyCalendar', x: 2, y: 3, w: 8, h: 2.5 },
        { i: 'chatInput', x: 10, y: 7, w: 2, h: 2 },
        { i: 'allowanceTracker', x: 0, y: 0, w: 2, h: 3 },

      ]
    };
    setLayout(defaultLayout);
    localStorage.setItem('dashboardLayout', JSON.stringify(defaultLayout));
    // Optional: Add some visual feedback here, like a toast notification
    console.log('Layout reset to default');
  };

  const ContributionGraph = () => (
    <Card className={`w-full h-full ${theme.secondary} rounded-xl overflow-hidden border-0 flex flex-col`}>
      <CardHeader className="py-0.5 px-1">
        <CardTitle className={`text-xs font-semibold ${theme.primary}`}>Chore Completion</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex items-center justify-center p-0.5 w-full h-full">
        <div className="w-full h-full">
          <Calendar 
            values={calendarValues}
            until={format(new Date(), 'yyyy-MM-dd')}
            weekNames={['', 'M', '', 'W', '', 'F', '']}
            monthNames={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']}
            panelColors={theme.calendarColors}
            panelAttributes={{ rx: 1, ry: 1 }}
            weekLabelAttributes={{ 'font-size': 6, 'text-anchor': 'middle', 'dominant-baseline': 'middle', fill: theme.text }}
            monthLabelAttributes={{ 'font-size': 8, 'text-anchor': 'start', 'dominant-baseline': 'middle', fill: theme.text }}
            onMouseEnter={(date) => setHoveredDate(date)}
            onMouseLeave={() => setHoveredDate(null)}
            onClick={(date) => handleDayClick(new Date(date))}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </CardContent>
    </Card>
  );

  const Greeting = () => (
    <Card className={`w-full h-full ${theme.secondary}`}>
      <CardContent className="flex flex-col items-center justify-center text-center">
        <h2 className={`text-sm font-medium ${theme.primary} mb-0.5`}>
          {getGreeting()}
        </h2>
        <h3 className={`text-lg font-bold ${theme.text} mb-1`}>
          Hello, {avatar ? avatar.name : 'DAD'}
        </h3>
        <div className="flex items-center space-x-1">
          <div className="text-xl">{getEmoji((todayCompletedChores / todayTotalChores) * 100)}</div>
          <div className={`text-xs ${theme.textMuted}`}>
            {todayCompletedChores}/{todayTotalChores} chores
          </div>
          <div className={`w-16 h-1.5 ${theme.progressBg} rounded-full overflow-hidden`}>
            <div 
              className={`h-full rounded-full ${theme.progressBar} transition-all duration-500 ease-out`}
              style={{ width: `${(todayCompletedChores / todayTotalChores) * 100}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const WeeklyCalendar = () => {
    const [localChores, setLocalChores] = useState(chores);
  
    useEffect(() => {
      setLocalChores(chores);
    }, [chores]);
  
    const handleDeleteChore = async (choreId, date) => {
      try {
        await axios.delete(`http://localhost:5000/api/chores/${avatarId}/${choreId}`);
        setLocalChores(prevChores => {
          const updatedChores = { ...prevChores };
          updatedChores[date] = updatedChores[date].filter(chore => chore._id !== choreId);
          return updatedChores;
        });
        // Optionally, you can call fetchChores() here to refresh all chores from the server
      } catch (error) {
        console.error('Error deleting chore:', error);
      }
    };
  
    return (
      <Card className={`w-full h-full ${theme.secondary}`}>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className={`text-xs font-semibold ${theme.primary}`}>Weekly Objectives</CardTitle>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsCalendarModalOpen(true)}
                className={`p-1 rounded-full ${theme.button}`}
              >
                <CalendarIcon size={16} />
              </button>
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className={`p-1 rounded-full ${theme.button}`}
              >
                <WandIcon size={16} />
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-y-auto" style={{ maxHeight: 'calc(100% - 1.5rem)' }}>
          <div className="grid grid-cols-7 gap-0.5">
            {currentWeek.map(({ day, date }) => {
              const dayChores = localChores[date] || [];
              const isExpanded = expandedDays[date];
              const formattedDate = format(parseISO(date), 'MMM-d');
              return (
                <div 
                  key={day} 
                  className={`${theme.tertiary} rounded-md p-1 cursor-pointer`}
                >
                  <div 
                    className="flex justify-between items-center mb-1"
                    onClick={() => handleDayClick(date)}
                  >
                    <h3 className={`text-xs font-bold ${theme.primary}`}>{day.slice(0, 3).toUpperCase()}</h3>
                    <div className="flex items-center">
                      <p className={`text-xs ${theme.textMuted} mr-1`}>{formattedDate}</p>
                      {isExpanded ? <ChevronUpIcon size={12} /> : <ChevronDownIcon size={12} />}
                    </div>
                  </div>
                  <div className="space-y-1">
                    {dayChores.length > 0 ? (
                      (isExpanded ? dayChores : dayChores.slice(0, 2)).map((chore) => (
                        <div key={chore._id} className="flex items-center justify-between">
                          <label className="flex items-center space-x-1 text-xs">
                            <Checkbox
                              checked={chore.completed || false}
                              onCheckedChange={() => handleToggleChore(chore._id, date)}
                              className={`w-3 h-3 ${theme.checkbox} rounded-sm`}
                            />
                            <span className={`truncate ${chore.completed ? `${theme.textMuted} line-through` : theme.text}`}>
                              {chore.name}
                            </span>
                          </label>
                          {isEditMode && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteChore(chore._id, date);
                              }}
                              className={`text-xs ${theme.button} p-0.5 rounded`}
                            >
                              <XIcon size={12} />
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className={`text-xs ${theme.textMuted}`}>No objectives</p>
                    )}
                    {!isExpanded && dayChores.length > 2 && (
                      <p className={`text-xs ${theme.textMuted} cursor-pointer`} onClick={(e) => {
                        e.stopPropagation();
                        setExpandedDays(prev => ({ ...prev, [date]: true }));
                      }}>
                        +{dayChores.length - 2} more
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };
  const ChatInput = () => {
    const [localMessage, setLocalMessage] = useState('');

    const handleLocalSendMessage = () => {
      if (localMessage.trim() !== '') {
        handleSendMessage(localMessage);
        setLocalMessage('');
      }
    };

    return (
      <Card className={`w-full h-full ${theme.secondary}`}>
        <CardHeader>
          <CardTitle className={`text-xs font-semibold ${theme.primary}`}>Chat Assistant</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center">
            <Input 
              type="text" 
              value={localMessage}
              onChange={(e) => setLocalMessage(e.target.value)}
              placeholder="Ask me anything..." 
              className="flex-grow bg-white border-none text-black text-xs placeholder-gray-400 rounded-full mr-1"
              onKeyPress={(e) => e.key === 'Enter' && handleLocalSendMessage()}
            />
            <Button 
              onClick={handleLocalSendMessage} 
              className={`${theme.button} rounded-full p-1`}
            >
              <SendIcon size={12} />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const formattedChores = useMemo(() => {
    const formatted = {};
    if (chores && typeof chores === 'object') {
      Object.entries(chores).forEach(([date, dayChores]) => {
        if (Array.isArray(dayChores)) {
          dayChores.forEach(chore => {
            const dateString = chore.date ? chore.date.split('T')[0] : date;
            if (!formatted[dateString]) {
              formatted[dateString] = [];
            }
            formatted[dateString].push(chore);
          });
        }
      });
    }
    return formatted;
  }, [chores]);

  const memoizedLayout = useMemo(() => [
    { i: 'greeting', x: 0, y: 0, w: 12, h: 1 },
    { i: 'contributionGraph', x: 0, y: 1, w: 12, h: 4 },
    { i: 'weeklyCalendar', x: 0, y: 5, w: 8, h: 2 },
    { i: 'chatInput', x: 8, y: 5, w: 4, h: 2 },
    { i: 'allowanceTracker', x: 0, y: 7, w: 6, h: 2 },
    { i: 'realtime', x: 6, y: 7, w: 6, h: 2 }, // Added RealtimeComponent
  ], []);

  useResizeObserverFix();

  return (
    <div className={`h-screen w-full ${theme.background}`}>
      <LayoutControls 
        isLayoutLocked={isLayoutLocked}
        setIsLayoutLocked={setIsLayoutLocked}
        theme={theme}
        setIsAddChoreModalOpen={setIsAddChoreModalOpen}
        hiddenComponents={hiddenComponents}
        toggleComponentVisibility={toggleComponentVisibility}
        saveCurrentLayout={saveCurrentLayout}
        resetLayout={resetLayout}
      />
      <ResponsiveGridLayout
        className="layout"
        layouts={layout}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={100}
        onLayoutChange={onLayoutChange}
        isDraggable={!isLayoutLocked}
        isResizable={!isLayoutLocked}
        margin={[4, 4]}
        compactType={null}
        preventCollision={true}
        width={windowWidth}
        containerPadding={[0, 0]}
      >
        <div key="greeting" style={{ display: hiddenComponents.greeting ? 'none' : 'block' }}><Greeting /></div>
        <div key="contributionGraph" style={{ display: hiddenComponents.contributionGraph ? 'none' : 'block' }}><ContributionGraph /></div>
        <div key="weeklyCalendar" style={{ display: hiddenComponents.weeklyCalendar ? 'none' : 'block' }}>
          <WeeklyCalendar />
        </div>
        <div key="chatInput" style={{ display: hiddenComponents.chatInput ? 'none' : 'block' }} className="h-full overflow-hidden">
          <ChatbotComponent theme={theme} messages={messages} handleSendMessage={handleSendMessage} />
        </div>
        <div key="allowanceTracker" style={{ display: hiddenComponents.allowanceTracker ? 'none' : 'block' }}>
          <Card className={`w-full h-full ${theme.secondary} rounded-xl overflow-hidden border-0`}>
            <CardHeader className="py-0.5">
              <CardTitle className={`text-xs font-semibold ${theme.primary}`}>Family Allowance Tracker</CardTitle>
            </CardHeader>
            <CardContent className="p-0.5 overflow-y-auto" style={{ maxHeight: 'calc(100% - 1.5rem)' }}>
              <AllowanceTracker choreUpdateTrigger={choreUpdateTrigger} chores={formattedChores} />
            </CardContent>
          </Card>
        </div>
        <div key="realtime" style={{ display: hiddenComponents.realtime ? 'none' : 'block' }}>
          <RealtimeComponent theme={theme} avatarId={avatarId} />
        </div>
      </ResponsiveGridLayout>

      {isCalendarModalOpen && (
        <CalendarView
          chores={chores}
          onDateClick={handleDayClick}
          isEditMode={isEditMode}
          onDeleteChore={handleDeleteChore}
          onClose={() => setIsCalendarModalOpen(false)}
        />
      )}

      <AddChoreModal
        isOpen={isAddChoreModalOpen}
        onClose={() => setIsAddChoreModalOpen(false)}
        onAddChore={handleAddChore}
        newChore={newChore}
        setNewChore={setNewChore}
        daysOfWeek={daysOfWeek}
        theme={theme}
      />

      {/* Move the theme toggle button to bottom right */}
      <button 
        onClick={toggleTheme} 
        className={`fixed bottom-2 right-2 z-20 p-1.5 rounded-full ${theme.button} shadow-lg`}
      >
        {theme.name === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <style jsx global>{`
        body, html {
          font-family: 'Handjet', sans-serif;
          background-color: ${theme.background};
          color: ${theme.text};
        }
        .react-grid-item {
          transition: all 200ms ease;
          transition-property: left, top;
          display: flex;
          flex-direction: column;
          padding: 0 !important;
          border: none !important;
          background: transparent !important;
        }
        .react-grid-item > div {
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 100%;
          background: ${theme.secondary} !important;
          border: none !important;
        }
        .react-grid-item.react-draggable-dragging {
          transition: none;
          z-index: 100;
          opacity: 0.9;
          outline: 2px dashed ${theme.primary};
          background: ${theme.tertiary} !important;
        }
        .react-grid-item.resizing {
          border: 1px dashed ${theme.primary} !important;
          opacity: 0.8;
        }
        .react-grid-item.react-draggable-dragging {
          border: 1px solid ${theme.primary} !important;
          opacity: 0.8;
        }
        .react-grid-item > .react-resizable-handle {
          width: 10px;
          height: 10px;
          bottom: 0;
          right: 0;
          background: none;
          &::after {
            content: "";
            position: absolute;
            right: 3px;
            bottom: 3px;
            width: 5px;
            height: 5px;
            border-right: 2px solid ${theme.primary};
            border-bottom: 2px solid ${theme.primary};
          }
        }
        .layout-locked .react-grid-item > .react-resizable-handle {
          display: none;
        }
        .greeting-text {
          font-family: 'Handjet', sans-serif;
          letter-spacing: 0.05em;
          text-shadow: 0 0 10px ${theme.primary};
        }
        .text-xxs {
          font-size: 0.625rem;
        }
        .react-github-calendar {
          width: 100% !important;
          height: 100% !important;
        }
        .react-github-calendar svg {
          width: 100%;
          height: 100%;
        }
      `}</style>
    </div>
  );
};

export default AvatarDashboard;