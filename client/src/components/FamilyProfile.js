import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, X } from "lucide-react";

const FamilyProfile = () => {
  const [familyName, setFamilyName] = useState('');
  const [avatars, setAvatars] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAvatarName, setNewAvatarName] = useState('');
  const [newAvatarImage, setNewAvatarImage] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    console.log('Current token:', token);
    console.log('Current userId:', userId);

    if (!token || !userId) {
      console.log('No auth credentials found');
      navigate('/login');
      return;
    }

    fetchFamilyProfile();
  }, [navigate]);

  const fetchFamilyProfile = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const token = localStorage.getItem('token');

      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/auth/family-profile/${userId}`, 
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      console.log('Fetched family profile data:', response.data);
      
      if (!response.data) {
        console.log('No data received from server');
        return;
      }

      setFamilyName(response.data.familyName);
      setAvatars(response.data.avatars || []);
    } catch (error) {
      console.error('Error fetching family profile:', error);
      if (error.response?.status === 401) {
        localStorage.clear();
        navigate('/login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAvatar = async (e) => {
    e.preventDefault();
    if (newAvatarName.trim() && newAvatarImage) {
      try {
        const userId = localStorage.getItem('userId');
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('userId', userId);
        formData.append('name', newAvatarName.trim());
        formData.append('image', newAvatarImage);

        const response = await axios.post(
          `${process.env.REACT_APP_API_URL}/api/auth/add-avatar`, 
          formData, 
          {
            headers: { 
              'Content-Type': 'multipart/form-data',
              'Authorization': `Bearer ${token}`
            }
          }
        );

        console.log('Avatar created:', response.data);
        if (response.data.success) {
          setAvatars([...avatars, response.data.avatar]);
          setNewAvatarName('');
          setNewAvatarImage(null);
          setIsModalOpen(false);
        } else {
          console.error('Error creating avatar:', response.data.message);
        }
      } catch (error) {
        console.error('Error adding avatar:', error);
        if (error.response?.status === 401) {
          localStorage.clear();
          navigate('/login');
        }
      }
    }
  };

  const handleAvatarClick = (avatar) => {
    navigate(`/avatar-dashboard/${avatar._id}`, { state: { avatar } });
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleNameChange = (e) => {
    setFamilyName(e.target.value);
  };

  const handleNameSubmit = async (e) => {
    e.preventDefault();
    setIsEditing(false);
    try {
      const userId = localStorage.getItem('userId');
      await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/update-family-profile`, {
        userId,
        familyName
      });
      console.log('Family name updated successfully');
    } catch (error) {
      console.error('Error updating family name:', error);
    }
  };

  const handleDeleteAvatar = async (avatarId) => {
    try {
      const userId = localStorage.getItem('userId');
      const response = await axios.delete(`${process.env.REACT_APP_API_URL}/api/auth/delete-avatar/${userId}/${avatarId}`);
      console.log('Avatar deleted:', response.data);
      setAvatars(avatars.filter(avatar => avatar._id !== avatarId));
    } catch (error) {
      console.error('Error deleting avatar:', error);
    }
  };

  return (
    <>
      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4 sm:p-8">
          {/* Container div to center content */}
          <div className="w-full max-w-4xl flex flex-col items-center">
            {/* Family Name Header */}
            <h1 className="text-3xl sm:text-5xl mb-8 sm:mb-12 relative group font-light tracking-wide flex items-center flex-wrap justify-center text-center">
              {isEditing ? (
                <form onSubmit={handleNameSubmit} className="flex items-center flex-wrap justify-center w-full">
                  <input
                    type="text"
                    value={familyName}
                    onChange={handleNameChange}
                    className="bg-transparent border-b-2 border-blue-500 focus:outline-none text-2xl sm:text-5xl font-light tracking-wide text-white text-center w-full sm:w-auto mb-2 sm:mb-0"
                    autoFocus
                  />
                  <button type="submit" className="ml-0 sm:ml-4 text-blue-500 hover:text-blue-400 w-full sm:w-auto">
                    Save
                  </button>
                </form>
              ) : (
                <>
                  <span className="mr-2 sm:mr-4">{familyName} Family</span>
                  <button
                    onClick={handleEditClick}
                    className="opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none text-blue-500 hover:text-blue-400"
                  >
                    <Edit2 className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>
                </>
              )}
            </h1>
            
            {/* Avatar Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-8 mb-8 sm:mb-12 w-full place-items-center">
              {avatars.map((avatar) => (
                <div key={avatar._id} className="flex flex-col items-center cursor-pointer group w-full max-w-[150px]">
                  <div 
                    className="relative mb-2 sm:mb-4 w-full aspect-square" 
                    onClick={() => !isEditing && handleAvatarClick(avatar)}
                  >
                    <img
                      src={avatar.imageUrl ? `${process.env.REACT_APP_API_URL}${avatar.imageUrl}` : `/placeholder.svg?height=120&width=120`}
                      alt={avatar.name}
                      className="w-full h-full rounded-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-blue-500 bg-opacity-0 group-hover:bg-opacity-20 rounded-full transition-all duration-300"></div>
                  </div>
                  <span className="text-base sm:text-lg font-medium text-gray-300 group-hover:text-white transition-colors text-center">
                    {avatar.name}
                  </span>
                  {isEditing && (
                    <button
                      onClick={() => handleDeleteAvatar(avatar._id)}
                      className="mt-2 p-1 bg-red-600 rounded-full hover:bg-red-700 transition-colors"
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Delete Avatar</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            {/* New Avatar Button */}
            <div className="mb-8">
              <button
                className="w-12 h-12 rounded-full bg-black border border-white hover:bg-gray-900 flex items-center justify-center transition-colors duration-300"
                onClick={() => setIsModalOpen(true)}
              >
                <Plus className="h-6 w-6 text-white" />
                <span className="sr-only">New Avatar</span>
              </button>
            </div>
          </div>
          
          {/* Create Avatar Modal */}
          {isModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
              <div className="bg-gray-900 rounded-lg p-4 sm:p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-white">Create New Avatar</h2>
                <form onSubmit={handleCreateAvatar}>
                  <input
                    type="text"
                    value={newAvatarName}
                    onChange={(e) => setNewAvatarName(e.target.value)}
                    placeholder="Enter avatar name"
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-gray-800 text-white border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 sm:mb-6"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setNewAvatarImage(e.target.files[0])}
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-gray-800 text-white border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 sm:mb-6"
                  />
                  <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row justify-end gap-2 sm:gap-4">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="w-full sm:w-auto px-4 py-2 sm:px-6 sm:py-3 text-gray-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="w-full sm:w-auto px-4 py-2 sm:px-6 sm:py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Create Avatar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default FamilyProfile;