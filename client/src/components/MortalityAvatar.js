import React from 'react'
import PropTypes from 'prop-types'

const MortalityAvatar = ({ completedChores, totalChores }) => {
  const progressPercentage = totalChores > 0 ? (completedChores / totalChores) * 100 : 0

  const getEmoji = (percentage) => {
    if (percentage < 20) return "😠"
    if (percentage < 40) return "🙁"
    if (percentage < 60) return "😐"
    if (percentage < 80) return "🙂"
    return "😄"
  }

  const emoji = getEmoji(progressPercentage)

  const getProgressColor = (percentage) => {
    const red = Math.round(255 * (1 - percentage / 100))
    const green = Math.round(255 * (percentage / 100))
    return `rgb(${red}, ${green}, 0)`
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-gray-900 bg-opacity-50 rounded-lg shadow-lg w-full max-w-md">
      <div className="flex items-center justify-between w-full mb-4">
        <span className="text-4xl" role="img" aria-label="Devil">😈</span>
        <div className="text-6xl" role="img" aria-label={`Mood: ${emoji}`}>
          {emoji}
        </div>
        <span className="text-4xl" role="img" aria-label="Angel">😇</span>
      </div>
      <div className="w-full h-4 bg-gray-700 rounded-full overflow-hidden mb-2">
        <div 
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ 
            width: `${progressPercentage}%`,
            backgroundColor: getProgressColor(progressPercentage)
          }}
        />
      </div>
      <div className="text-sm text-gray-300">
        {completedChores} / {totalChores} chores completed
      </div>
    </div>
  )
}

MortalityAvatar.propTypes = {
  completedChores: PropTypes.number.isRequired,
  totalChores: PropTypes.number.isRequired
}

export default MortalityAvatar