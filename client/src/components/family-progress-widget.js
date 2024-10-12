'use client'

import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Card, CardContent, CardHeader, CardTitle } from "../components/UI/card"
import { Progress } from "../components/UI/progress"
import { Avatar, AvatarFallback, AvatarImage } from "../components/UI/avatar"

export default function FamilyProgressWidget() {
  const [familyProgress, setFamilyProgress] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchFamilyProgress()
  }, [])

  const fetchFamilyProgress = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await axios.get(`http://localhost:5000/api/users/family-progress`)
      setFamilyProgress(response.data)
    } catch (error) {
      console.error('Error fetching family progress:', error)
      setError('Failed to load family progress. Please try again later.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <Card className="w-full max-w-md mx-auto bg-gray-900 text-white"><CardContent>Loading...</CardContent></Card>
  }

  if (error) {
    return <Card className="w-full max-w-md mx-auto bg-gray-900 text-white"><CardContent>{error}</CardContent></Card>
  }

  return (
    <Card className="w-full max-w-md mx-auto bg-gray-900 text-white">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Family Chore Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {familyProgress.map((member) => (
            <li key={member.id} className="bg-gray-800 rounded-lg p-4 shadow-md">
              <div className="flex items-center space-x-4 mb-2">
                <Avatar>
                  <AvatarImage src={member.avatar} alt={member.name} />
                  <AvatarFallback>{member.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-grow">
                  <h3 className="text-lg font-semibold">{member.name}</h3>
                  <p className="text-sm text-gray-400">
                    {member.completedChores} of {member.totalChores} chores completed
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">${member.allowance.toFixed(2)}</p>
                  <p className="text-xs text-gray-400">Allowance</p>
                </div>
              </div>
              <Progress 
                value={(member.completedChores / member.totalChores) * 100} 
                className="h-2"
              />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}