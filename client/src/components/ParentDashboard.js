import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Checkbox } from "../components/UI/checkbox";
import { CalendarIcon, CheckCircleIcon, PlusCircleIcon, XIcon, Clipboard, SendIcon } from "lucide-react";
import Calendar from 'react-github-contribution-calendar';
import { format, parse, parseISO, isValid } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../components/UI/dialog";
import { Button } from "../components/UI/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/UI/card";
import { Input } from "../components/UI/input";

const ResponsiveGridLayout = WidthProvider(Responsive);

const ParentDashboard = () => {
  // ... (keep all the existing state variables and useEffect hooks)

  const ContributionGraph = () => (
    <Card className="w-full h-full bg-black/50 backdrop-blur-md rounded-lg shadow-lg overflow-hidden border border-gray-800">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-white">Contribution Graph</CardTitle>
      </CardHeader>
      <CardContent>
        <Calendar 
          values={calendarValues}
          until={format(new Date(), 'yyyy-MM-dd')}
          weekNames={['', 'M', '', 'W', '', 'F', '']}
          monthNames={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']}
          panelColors={['#1e1e1e', '#ff0000', '#ffff00', '#00ff00', '#00ff00']}
          panelAttributes={{ rx: 1, ry: 1 }}
          weekLabelAttributes={{ 'font-size': 7, 'text-anchor': 'middle', 'dominant-baseline': 'middle' }}
          monthLabelAttributes={{ 'font-size': 8, 'text-anchor': 'start', 'dominant-baseline': 'middle' }}
        />
      </CardContent>
    </Card>
  );

  const Greeting = () => (
    <Card className="w-full h-full bg-black/50 backdrop-blur-md rounded-lg shadow-lg overflow-hidden border border-gray-800">
      <CardContent className="flex items-center justify-between h-full p-4">
        <h2 className="text-sm font-bold text-white">
          {getGreeting()}, <span className="text-cyan-400">{avatar ? avatar.name : 'Avatar'}</span>
        </h2>
        <div className="text-sm">
          {todayCompletedChores}/{todayTotalChores} chores completed
        </div>
      </CardContent>
    </Card>
  );

  const WeeklyView = () => (
    <Card className="w-full h-full bg-black/50 backdrop-blur-md rounded-lg shadow-lg overflow-hidden border border-gray-800">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-white">Weekly View</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {currentWeek.map(({ day, date }) => {
            const dayChores = chores[date] || [];
            return (
              <div key={day} className="text-center p-1 bg-black/50 rounded-lg">
                <div className="text-xs font-semibold text-white">{day.slice(0, 3)}</div>
                <div className="text-xxs text-gray-400">{format(parseISO(date), 'MMM d')}</div>
                <div className="mt-1">
                  {dayChores.length > 0 ? (
                    <div className="text-xxs">{dayChores.length} chores</div>
                  ) : (
                    <div className="text-xxs text-gray-400">No chores</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );

  const Chatbot = () => (
    <Card className="w-full h-full bg-black/50 backdrop-blur-md rounded-lg shadow-lg overflow-hidden border border-gray-800">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-white">Chatbot</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col h-full">
        <div className="flex-grow overflow-y-auto mb-2">
          {chatMessages.map((msg, index) => (
            <div key={index} className={`mb-2 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
              <span className={`inline-block p-2 rounded-lg ${
                msg.role === 'user' ? 'bg-blue-600 bg-opacity-50' : 'bg-gray-700 bg-opacity-50'
              }`}>
                {msg.content}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center">
          <Input
            type="text"
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            placeholder="Ask me anything..."
            className="flex-grow mr-2 bg-black/50 border-gray-700 text-white rounded-lg"
          />
          <Button onClick={handleSendMessage} className="bg-blue-600 hover:bg-blue-700">
            <SendIcon size={16} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const [layout, setLayout] = useState([
    { i: 'calendar', x: 0, y: 0, w: 12, h: 4 },
    { i: 'greeting', x: 0, y: 4, w: 12, h: 1 },
    { i: 'weeklyView', x: 0, y: 5, w: 12, h: 3 },
    { i: 'chatbot', x: 0, y: 8, w: 12, h: 3 },
  ]);

  const onLayoutChange = (newLayout) => {
    setLayout(newLayout);
    // Here you would typically save the layout to localStorage or a backend
  };

  const [isGridEnabled, setIsGridEnabled] = useState(true);

  useEffect(() => {
    const savedGridState = localStorage.getItem('isGridEnabled');
    if (savedGridState !== null) {
      setIsGridEnabled(JSON.parse(savedGridState));
    }
  }, []);

  const ToggleButton = () => (
    <Button
      onClick={() => {
        const newState = !isGridEnabled;
        setIsGridEnabled(newState);
        localStorage.setItem('isGridEnabled', JSON.stringify(newState));
      }}
      className="fixed top-2 left-2 z-50 bg-blue-600 hover:bg-blue-700"
    >
      <Grid size={16} className="mr-2" />
      {isGridEnabled ? 'Disable' : 'Enable'} Grid
    </Button>
  );

  const renderContent = () => {
    if (isGridEnabled) {
      return (
        <ResponsiveGridLayout
          className="layout"
          layouts={{ lg: layout }}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={100}
          onLayoutChange={onLayoutChange}
          isDraggable={true}
          isResizable={true}
          margin={[16, 16]}
        >
          <div key="calendar"><ContributionGraph /></div>
          <div key="greeting"><Greeting /></div>
          <div key="weeklyView"><WeeklyView /></div>
          <div key="chatbot"><Chatbot /></div>
        </ResponsiveGridLayout>
      );
    } else {
      // Render standard layout here
      return (
        <div className="min-h-screen bg-black text-white p-2 font-sans text-xs">
          <Card className="w-full h-full bg-black/50 backdrop-blur-md rounded-lg shadow-lg overflow-hidden border border-gray-800">
            <CardContent className="flex items-center justify-between h-full p-4">
              <h2 className="text-sm font-bold text-white">
                {getGreeting()}, <span className="text-cyan-400">{avatar ? avatar.name : 'Avatar'}</span>
              </h2>
              <div className="text-sm">
                {todayCompletedChores}/{todayTotalChores} chores completed
              </div>
            </CardContent>
          </Card>
          <Card className="w-full h-full bg-black/50 backdrop-blur-md rounded-lg shadow-lg overflow-hidden border border-gray-800">
            <CardContent>
              <div className="grid grid-cols-7 gap-1">
                {currentWeek.map(({ day, date }) => {
                  const dayChores = chores[date] || [];
                  return (
                    <div key={day} className="text-center p-1 bg-black/50 rounded-lg">
                      <div className="text-xs font-semibold text-white">{day.slice(0, 3)}</div>
                      <div className="text-xxs text-gray-400">{format(parseISO(date), 'MMM d')}</div>
                      <div className="mt-1">
                        {dayChores.length > 0 ? (
                          <div className="text-xxs">{dayChores.length} chores</div>
                        ) : (
                          <div className="text-xxs text-gray-400">No chores</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          <Card className="w-full h-full bg-black/50 backdrop-blur-md rounded-lg shadow-lg overflow-hidden border border-gray-800">
            <CardContent className="flex flex-col h-full">
              <div className="flex-grow overflow-y-auto mb-2">
                {chatMessages.map((msg, index) => (
                  <div key={index} className={`mb-2 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    <span className={`inline-block p-2 rounded-lg ${
                      msg.role === 'user' ? 'bg-blue-600 bg-opacity-50' : 'bg-gray-700 bg-opacity-50'
                    }`}>
                      {msg.content}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center">
                <Input
                  type="text"
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  placeholder="Ask me anything..."
                  className="flex-grow mr-2 bg-black/50 border-gray-700 text-white rounded-lg"
                />
                <Button onClick={handleSendMessage} className="bg-blue-600 hover:bg-blue-700">
                  <SendIcon size={16} />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-2 font-sans text-xs">
      <style jsx global>{`
        .react-grid-item.react-grid-placeholder {
          background: rgba(255, 255, 255, 0.2) !important;
          border: 2px solid rgba(255, 255, 255, 0.4) !important;
          border-radius: 12px !important;
          opacity: 0.8 !important;
          transition: all 200ms ease;
        }
        .react-grid-item > .react-resizable-handle::after {
          border-right: 2px solid rgba(255, 255, 255, 0.4) !important;
          border-bottom: 2px solid rgba(255, 255, 255, 0.4) !important;
        }
        .react-grid-item.resizing {
          opacity: 0.9;
        }
        .react-grid-item.react-draggable-dragging {
          transition: none;
          z-index: 100;
          opacity: 0.9;
        }
        .react-grid-item {
          transition: all 200ms ease;
          transition-property: left, top;
        }
      `}</style>
      <div className="flex items-center justify-between">
        <ToggleButton />
        <Button onClick={() => console.log('Standard layout button clicked')}>Standard Layout</Button>
      </div>
      {renderContent()}
    </div>
  );
};

export default ParentDashboard;