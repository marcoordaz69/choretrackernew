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
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await axios.post('/api/auth/login', formData, { timeout: 10000 });
      console.log('Login successful:', response.data);
      
      localStorage.setItem('userId', response.data.user.id);
      console.log('Stored user ID:', response.data.user.id);
      
      if (response.data.hasFamilyProfile) {
        navigate('/family-profile');
      } else {
        navigate('/create-family-profile');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error.response?.data?.message || 'Unable to connect to the server. Please try again later.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <Card className="w-[300px] bg-zinc-900 text-white border-zinc-800">
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
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Log In
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