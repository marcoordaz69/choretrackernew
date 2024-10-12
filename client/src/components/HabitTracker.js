import React, { useState, useEffect, useMemo } from 'react'
import { startOfMonth, endOfMonth, eachDayOfInterval, format, getMonth, getYear, startOfWeek, addDays, isSameMonth, isSameDay } from 'date-fns'
import { useTheme } from './ThemeContext'  // Import useTheme hook

const getProgressColor = (percentage, theme) => {
  if (percentage === 0) {
    return theme.name === 'dark' ? 'rgba(75, 85, 99, 0.3)' : 'rgba(229, 231, 235, 1)'; // Lighter grey for light mode
  }
  const red = Math.round(255 * (1 - percentage));
  const green = Math.round(255 * percentage);
  return `rgba(${red}, ${green}, 0, ${theme.name === 'dark' ? '1' : '0.7'})`; // Adjust opacity for light mode
}

const getQuarterMonths = (year, quarter) => {
  const firstMonth = (quarter - 1) * 3
  return [firstMonth, firstMonth + 1, firstMonth + 2].map(monthIndex => {
    const start = startOfMonth(new Date(year, monthIndex))
    const end = endOfMonth(start)
    return eachDayOfInterval({ start, end })
  })
}

const HabitTracker = ({ chores, onToggleChore, compact = false }) => {
  const { theme } = useTheme()  // Use the theme
  const [hoveredDate, setHoveredDate] = useState(null)
  const today = new Date()
  const currentYear = getYear(today)
  const currentQuarter = Math.floor(getMonth(today) / 3) + 1
  const quarterMonths = useMemo(() => getQuarterMonths(currentYear, currentQuarter), [currentYear, currentQuarter])

  const completionRates = useMemo(() => {
    const rates = {}
    Object.entries(chores).forEach(([dateString, dayChores]) => {
      if (dayChores.length === 0) {
        rates[dateString] = 0
      } else {
        const completedCount = dayChores.filter(chore => chore.completed).length
        rates[dateString] = completedCount / dayChores.length
      }
    })
    return rates
  }, [chores])

  useEffect(() => {
    console.log('Chores updated:', chores)
  }, [chores])

  const handleDayClick = (date) => {
    const dateString = format(date, 'yyyy-MM-dd')
    const dayChores = chores[dateString] || []
    if (dayChores.length > 0) {
      const choreToToggle = dayChores.find(chore => !chore.completed) || dayChores[0]
      onToggleChore(choreToToggle._id, dateString)
    }
  }

  const getChoreDetailsForDate = (dateString) => {
    const dayChores = chores[dateString] || [];
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

  if (compact) {
    const startDate = startOfWeek(new Date());
    const days = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

    return (
      <div className="flex justify-between items-center">
        {days.slice(0, 4).map((day, index) => {
          const dateString = format(day, 'yyyy-MM-dd')
          const dayChores = chores[dateString] || []
          const completedChores = dayChores.filter(chore => chore.completed).length
          const totalChores = dayChores.length
          const completionRate = totalChores > 0 ? completedChores / totalChores : 0
          const backgroundColor = getProgressColor(completionRate, theme)

          return (
            <div key={dateString} className="text-center">
              <div className="text-xs font-semibold mb-1">{format(day, 'EEE')}</div>
              <div 
                className="w-6 h-6 rounded-full mx-auto cursor-pointer transition-all duration-200 ease-in-out transform hover:scale-110"
                style={{ 
                  backgroundColor,
                  boxShadow: completionRate > 0 ? `0 0 5px ${backgroundColor}` : 'none'
                }}
                onClick={() => handleDayClick(day)}
              />
              <div className="text-xs mt-1">{completedChores}/{totalChores}</div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className={`w-full max-w-4xl mx-auto p-4 ${theme.text}`}>
      <h2 className={`text-xl font-bold mb-6 ${theme.primary}`}>Chore Completion Tracker</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {quarterMonths.map((month, monthIndex) => (
          <div key={monthIndex} className="space-y-3">
            <h3 className={`text-sm font-semibold ${theme.textMuted}`}>
              {format(month[0], 'MMMM yyyy')}
            </h3>
            <div className="grid grid-cols-7 gap-0.5">
              {eachDayOfInterval({ start: startOfWeek(month[0]), end: endOfMonth(month[0]) }).map((date, index) => {
                const dateString = format(date, 'yyyy-MM-dd')
                const choreDetails = getChoreDetailsForDate(dateString);
                const backgroundColor = getProgressColor(choreDetails.completionRate, theme)
                const isCurrentMonth = isSameMonth(date, month[0])
                const isToday = isSameDay(date, today)
                
                return (
                  <div
                    key={index}
                    className="relative"
                    onMouseEnter={() => setHoveredDate(dateString)}
                    onMouseLeave={() => setHoveredDate(null)}
                  >
                    <div
                      className={`w-6 h-6 flex items-center justify-center cursor-pointer transition-all duration-200 ease-in-out transform hover:scale-110 
                        ${!isCurrentMonth && 'opacity-50'} 
                        ${isToday ? 'ring-2 ring-cyan-400' : `ring-1 ${theme.name === 'dark' ? 'ring-gray-600' : 'ring-gray-300'}`}`}
                      onClick={() => isCurrentMonth && handleDayClick(date)}
                    >
                      <div
                        className="w-5 h-5 rounded-full"
                        style={{ 
                          backgroundColor: isCurrentMonth ? backgroundColor : 'transparent',
                          boxShadow: choreDetails.completionRate > 0 && isCurrentMonth ? `0 0 5px ${backgroundColor}` : 'none'
                        }}
                      />
                    </div>
                    {hoveredDate === dateString && (
                      <div className={`absolute z-10 ${theme.secondary} ${theme.text} text-xs rounded-md py-2 px-3 bottom-full left-1/2 transform -translate-x-1/2 mb-2 whitespace-nowrap shadow-lg`}>
                        <p className="font-semibold mb-1">{format(date, 'MMM d, yyyy')}</p>
                        <p>{Math.round(choreDetails.completionRate * 100)}% completed</p>
                        <p>{choreDetails.completed} of {choreDetails.total} chores done</p>
                        {choreDetails.choreList.length > 0 ? (
                          <ul className="mt-1">
                            {choreDetails.choreList.map((chore, index) => (
                              <li key={index} className={chore.completed ? 'line-through' : ''}>
                                {chore.name}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-1">No chores added for this day</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default HabitTracker