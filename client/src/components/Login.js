import React, { useState } from 'react';
import { Button } from './UI/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./UI/card"
import { Mail, Github } from "lucide-react"
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Login() {
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
    setError(''); // Clear error when user types
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/login`, formData, { 
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Login response:', response.data);
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      }
      
      if (response.data.user && response.data.user.id) {
        localStorage.setItem('userId', response.data.user.id);
        console.log('Stored userId:', response.data.user.id);
      }

      // Store any other relevant user data
      if (response.data.user) {
        localStorage.setItem('userData', JSON.stringify(response.data.user));
      }

      // Check if tokens and userId are stored correctly
      const storedToken = localStorage.getItem('token');
      const storedUserId = localStorage.getItem('userId');
      console.log('Stored token:', storedToken);
      console.log('Stored userId:', storedUserId);

      if (response.data.hasFamilyProfile) {
        navigate('/family-profile');
      } else {
        navigate('/create-family-profile');
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error.response?.status === 401) {
        setError('Invalid email or password');
      } else if (error.code === 'ECONNABORTED') {
        setError('Connection timed out. Please try again.');
      } else if (!navigator.onLine) {
        setError('No internet connection. Please check your connection and try again.');
      } else {
        setError('Unable to connect to the server. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-black p-4">
      <Card className="w-full max-w-[350px] bg-zinc-900 text-white border-zinc-800">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-center">Log In</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showEmailForm ? (
            <>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
                variant="default"
                onClick={() => setShowEmailForm(true)}
              >
                <Mail className="mr-2 h-4 w-4" />
                Continue with Email
              </Button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-zinc-700" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-zinc-900 px-2 text-zinc-500">OR</span>
                </div>
              </div>
              <Button className="w-full bg-zinc-800 hover:bg-zinc-700 text-white" variant="outline">
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  {/* Google icon SVG path */}
                </svg>
                Continue with Google
              </Button>
              <Button className="w-full bg-zinc-800 hover:bg-zinc-700 text-white" variant="outline">
                <Github className="mr-2 h-4 w-4" />
                Continue with Github
              </Button>
            </>
          ) : (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-2">
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  required
                  className="w-full bg-zinc-800 text-white border border-zinc-700 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  required
                  className="w-full bg-zinc-800 text-white border border-zinc-700 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded p-2">
                  <p className="text-red-500 text-sm text-center">{error}</p>
                </div>
              )}
              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white relative"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  </div>
                ) : (
                  'Log In'
                )}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white"
                onClick={() => setShowEmailForm(false)}
                disabled={isLoading}
              >
                Back
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-zinc-400">
            Need to create an account?{" "}
            <Link to="/signup" className="text-blue-500 hover:underline">
              Sign Up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}