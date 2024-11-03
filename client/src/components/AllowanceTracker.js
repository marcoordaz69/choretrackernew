import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useTheme } from './ThemeContext';
import { DollarSign, Trophy } from 'lucide-react';

const INITIAL_ALLOWANCE = 10;

const AllowanceTracker = ({ choreUpdateTrigger, chores }) => {
  const { theme } = useTheme();
  const [familyProgress, setFamilyProgress] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [weeklyAllowance, setWeeklyAllowance] = useState(INITIAL_ALLOWANCE);

  const fetchFamilyProgress = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/family-progress');
      setFamilyProgress(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching family progress:', error);
      setError('Failed to fetch family progress.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFamilyProgress();
  }, [choreUpdateTrigger]);

  const calculateWeeklyProgress = (chores) => {
    let completedChores = 0;
    let totalChores = 0;

    // Get current date and start of week (Sunday)
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Go back to Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Go to Saturday
    endOfWeek.setHours(23, 59, 59, 999);

    // Loop through each day's chores
    Object.entries(chores).forEach(([dateStr, dayChores]) => {
      const choreDate = new Date(dateStr);
      
      // Only count chores within current week
      if (choreDate >= startOfWeek && choreDate <= endOfWeek) {
        completedChores += dayChores.filter(chore => chore.completed).length;
        totalChores += dayChores.length;
      }
    });

    const completionRate = totalChores > 0 ? completedChores / totalChores : 0;
    const currentAllowance = weeklyAllowance * completionRate;

    return {
      completedChores,
      totalChores,
      completionRate: completionRate * 100,
      currentAllowance,
      weekStartDate: startOfWeek,
      weekEndDate: endOfWeek,
    };
  };

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-US', { 
      month: 'short', 
      day: 'numeric' 
    }).format(date);
  };

  const familyWeeklyProgress = useMemo(() => {
    return familyProgress.map(member => ({
      ...member,
      ...calculateWeeklyProgress(member.chores),
    })).sort((a, b) => b.completionRate - a.completionRate);
  }, [familyProgress, weeklyAllowance]);

  if (loading) {
    return (
      <div className={`${theme.text} flex items-center justify-center h-full`}>
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-current"></div>
      </div>
    );
  }

  if (error) {
    return <div className={`${theme.error} text-xs`}>{error}</div>;
  }

  const getProgressColor = (percentage) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-blue-500';
    if (percentage >= 40) return 'bg-yellow-500';
    if (percentage >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getRankEmoji = (index) => {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return '👤';
    }
  };

  return (
    <div className="w-full h-full px-1">
      {/* Weekly Top Earner - Single Line */}
      <div className={`flex items-center justify-between text-[10px] px-1 ${theme.text}`}>
        <div className="flex items-center gap-1">
          <Trophy size={10} />
          <span>${Math.max(...familyWeeklyProgress.map(m => m.currentAllowance)).toFixed(2)}</span>
          <span className="text-gray-500">
            {formatDate(familyWeeklyProgress[0]?.weekStartDate)} - {formatDate(familyWeeklyProgress[0]?.weekEndDate)}
          </span>
        </div>
        <span>{(familyWeeklyProgress.reduce((acc, curr) => acc + curr.completionRate, 0) / familyWeeklyProgress.length).toFixed(0)}%</span>
      </div>

      {/* Family Progress List */}
      <div className="space-y-2">
        {familyWeeklyProgress.map((member, index) => (
          <div key={index} className={`${theme.tertiary} p-1.5 rounded-md`}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                <span className="text-sm">{getRankEmoji(index)}</span>
                <span className="text-xs font-medium">{member.name}</span>
              </div>
              <div className={`flex items-center gap-0.5 ${theme.primary} text-xs font-semibold`}>
                <DollarSign size={12} />
                {member.currentAllowance.toFixed(2)}
              </div>
            </div>
            <div className="relative">
              <div className={`overflow-hidden h-1.5 text-xs flex rounded-full ${theme.bgSecondary}`}>
                <div
                  style={{ width: `${Math.round(member.completionRate)}%` }}
                  className={`shadow-none flex flex-col transition-all duration-500 ${getProgressColor(member.completionRate)}`}
                ></div>
              </div>
              <div className="flex justify-between mt-0.5 text-[10px] text-gray-500">
                <span>{member.completedChores}/{member.totalChores}</span>
                <span>{Math.round(member.completionRate)}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AllowanceTracker;