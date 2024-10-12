import React, { useState } from 'react';
import { Button } from './UI/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./UI/card"
import { Mail } from "lucide-react"
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function SignUp() {
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    age: ''
  });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    try {
      const response = await axios.post('/api/auth/signup', formData, { timeout: 10000 });
      setSuccessMessage(response.data.message);
      console.log('Sign up successful:', response.data);
      
      setTimeout(() => {
        navigate('/login');
      }, 5000);
    } catch (error) {
      console.error('Sign up error:', error);
      setError(error.response?.data?.message || 'Unable to connect to the server. Please try again later.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <Card className="w-[300px] bg-zinc-900 text-white border-zinc-800">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-center">Sign Up</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showEmailForm ? (
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
              variant="default"
              onClick={() => setShowEmailForm(true)}
            >
              <Mail className="mr-2 h-4 w-4" />
              Sign Up with Email
            </Button>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-4">
              <input
                type="text"
                name="fullName"
                placeholder="Full Name"
                required
                className="w-full bg-zinc-800 text-white border border-zinc-700 rounded px-3 py-2"
                value={formData.fullName}
                onChange={handleInputChange}
              />
              <input
                type="email"
                name="email"
                placeholder="Email"
                required
                className="w-full bg-zinc-800 text-white border border-zinc-700 rounded px-3 py-2"
                value={formData.email}
                onChange={handleInputChange}
              />
              <input
                type="password"
                name="password"
                placeholder="Password"
                required
                className="w-full bg-zinc-800 text-white border border-zinc-700 rounded px-3 py-2"
                value={formData.password}
                onChange={handleInputChange}
              />
              <input
                type="number"
                name="age"
                placeholder="Age"
                required
                className="w-full bg-zinc-800 text-white border border-zinc-700 rounded px-3 py-2"
                value={formData.age}
                onChange={handleInputChange}
              />
              {error && <p className="text-red-500 text-sm">{error}</p>}
              {successMessage && <p className="text-green-500 text-sm">{successMessage}</p>}
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Sign Up
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white"
                onClick={() => setShowEmailForm(false)}
              >
                Back
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-zinc-400">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-500 hover:underline">
              Log In
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}