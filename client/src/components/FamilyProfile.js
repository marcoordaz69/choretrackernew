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
  const navigate = useNavigate();

  useEffect(() => {
    fetchFamilyProfile();
  }, []);

  const fetchFamilyProfile = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const response = await axios.get(`http://localhost:5000/api/auth/family-profile/${userId}`);
      console.log('Fetched family profile data:', response.data);
      setFamilyName(response.data.familyName);
      setAvatars(response.data.avatars || []);
    } catch (error) {
      console.error('Error fetching family profile:', error);
    }
  };

  const handleCreateAvatar = async (e) => {
    e.preventDefault();
    if (newAvatarName.trim() && newAvatarImage) {
      try {
        const userId = localStorage.getItem('userId');
        const formData = new FormData();
        formData.append('userId', userId);
        formData.append('name', newAvatarName.trim());
        formData.append('image', newAvatarImage);

        const response = await axios.post('http://localhost:5000/api/auth/add-avatar', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

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
        console.error('Error adding avatar:', error.response ? error.response.data : error.message);
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
      await axios.post('http://localhost:5000/api/auth/update-family-profile', {
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
      const response = await axios.delete(`http://localhost:5000/api/auth/delete-avatar/${userId}/${avatarId}`);
      console.log('Avatar deleted:', response.data);
      setAvatars(avatars.filter(avatar => avatar._id !== avatarId));
    } catch (error) {
      console.error('Error deleting avatar:', error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-8">
      <h1 className="text-5xl mb-12 relative group font-light tracking-wide flex items-center">
        {isEditing ? (
          <form onSubmit={handleNameSubmit} className="flex items-center">
            <input
              type="text"
              value={familyName}
              onChange={handleNameChange}
              className="bg-transparent border-b-2 border-blue-500 focus:outline-none text-5xl font-light tracking-wide text-white"
              autoFocus
            />
            <button type="submit" className="ml-4 text-blue-500 hover:text-blue-400">Save</button>
          </form>
        ) : (
          <>
            <span className="mr-4">{familyName} Family</span>
            <button
              onClick={handleEditClick}
              className="opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none text-blue-500 hover:text-blue-400"
            >
              <Edit2 className="h-6 w-6" />
            </button>
          </>
        )}
      </h1>
      
      {/* Avatar grid */}
      <div className="flex flex-wrap justify-center gap-12 mb-12 max-w-4xl">
        {avatars.map((avatar) => (
          <div key={avatar._id} className="flex flex-col items-center cursor-pointer group">
            <div 
              className="relative mb-4" 
              onClick={() => !isEditing && handleAvatarClick(avatar)}
            >
              <img
                src={avatar.imageUrl ? `http://localhost:5000${avatar.imageUrl}` : `/placeholder.svg?height=120&width=120`}
                alt={avatar.name}
                className="w-32 h-32 rounded-full transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-blue-500 bg-opacity-0 group-hover:bg-opacity-20 rounded-full transition-all duration-300"></div>
            </div>
            <span className="text-lg font-medium text-gray-300 group-hover:text-white transition-colors">{avatar.name}</span>
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
      
      {/* New avatar button */}
      <div className="mt-8">
        <button
          className="w-12 h-12 rounded-full bg-black border border-white hover:bg-gray-900 flex items-center justify-center transition-colors duration-300"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="h-6 w-6 text-white" />
          <span className="sr-only">New Avatar</span>
        </button>
      </div>
      
      {/* Modal for creating new avatar */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg p-8 w-full max-w-md">
            <h2 className="text-3xl font-bold mb-6 text-white">Create New Avatar</h2>
            <form onSubmit={handleCreateAvatar}>
              <input
                type="text"
                value={newAvatarName}
                onChange={(e) => setNewAvatarName(e.target.value)}
                placeholder="Enter avatar name"
                className="w-full px-4 py-3 bg-gray-800 text-white border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-6"
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setNewAvatarImage(e.target.files[0])}
                className="w-full px-4 py-3 bg-gray-800 text-white border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-6"
              />
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="mr-4 px-6 py-3 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Create Avatar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FamilyProfile;