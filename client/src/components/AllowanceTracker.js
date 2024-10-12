import React, { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { useTheme } from './ThemeContext'  // Import useTheme hook

const INITIAL_ALLOWANCE = 20 // Base allowance amount

const AllowanceTracker = ({ choreUpdateTrigger, chores }) => {
  const { theme } = useTheme()  // Use the theme
  const [familyProgress, setFamilyProgress] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [weeklyAllowance, setWeeklyAllowance] = useState(INITIAL_ALLOWANCE)

  const fetchFamilyProgress = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/family-progress')
      console.log('Family progress data:', response.data)
      setFamilyProgress(response.data)
      setError(null)
    } catch (error) {
      console.error('Error fetching family progress:', error)
      setError('Failed to fetch family progress.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFamilyProgress()
  }, [choreUpdateTrigger])

  const calculateWeeklyProgress = (chores) => {
    let completedChores = 0
    let totalChores = 0

    Object.values(chores).forEach(dayChores => {
      completedChores += dayChores.filter(chore => chore.completed).length
      totalChores += dayChores.length
    })

    const completionRate = totalChores > 0 ? completedChores / totalChores : 0
    const currentAllowance = weeklyAllowance * completionRate

    return { completedChores, totalChores, completionRate: completionRate * 100, currentAllowance }
  }

  const familyWeeklyProgress = useMemo(() => {
    return familyProgress.map(member => ({
      ...member,
      ...calculateWeeklyProgress(member.chores)
    }))
  }, [familyProgress, weeklyAllowance])

  if (loading) return <div className={`${theme.text} text-sm`}>Loading...</div>
  if (error) return <div className={`${theme.error} text-sm`}>{error}</div>

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="space-y-4 text-sm">
        {familyWeeklyProgress.map((member, index) => (
          <div key={index} className={`${theme.text} flex items-center justify-between`}>
            <span className="w-1/4">{member.name}</span>
            <div className={`w-1/2 ${theme.bgSecondary} rounded-full h-2.5 mx-2`}>
              <div 
                className={`h-2.5 rounded-full ${theme.name === 'dark' ? 'bg-white' : 'bg-black'}`}
                style={{ width: `${Math.round(member.completionRate)}%` }}
              ></div>
            </div>
            <span className="w-1/4 text-right">
              ${member.currentAllowance.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default AllowanceTracker