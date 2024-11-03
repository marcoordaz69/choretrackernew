"use client"

import React, { useState, useEffect } from "react"
import { Button } from "../components/UI/button"
import { Input } from "../components/UI/input"
import { Card, CardContent } from "../components/UI/card"
import { CheckCircle, Users, Calendar, Sparkles, Star, Menu } from "lucide-react"

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-purple-50 to-blue-50">
      <header className="px-4 lg:px-6 h-14 flex items-center border-b bg-white/50 backdrop-blur-sm fixed w-full z-50">
        <a className="flex items-center justify-center shrink-0" href="#">
          <Sparkles className="h-6 w-6 text-purple-600" />
          <span className="ml-2 text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600">
            FamilyChores
          </span>
        </a>
        
        <button 
          className="ml-auto md:hidden p-2"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <Menu className="h-6 w-6 text-purple-600" />
        </button>

        <nav className="hidden md:flex ml-auto gap-4 sm:gap-6">
          <a className="text-sm font-medium hover:text-purple-600 transition-colors" href="#features">
            Features
          </a>
          <a className="text-sm font-medium hover:text-purple-600 transition-colors" href="#how-it-works">
            How It Works
          </a>
          <a className="text-sm font-medium hover:text-purple-600 transition-colors" href="#testimonials">
            Testimonials
          </a>
          <a className="text-sm font-medium hover:text-purple-600 transition-colors" href="#pricing">
            Pricing
          </a>
          <Button 
            variant="outline" 
            className="border-purple-600 text-purple-600 hover:bg-purple-50 rounded-full px-4 py-1 shadow-sm transition-transform hover:scale-105 text-sm font-medium h-auto"
            asChild
          >
            <a href="/login">Login</a>
          </Button>
        </nav>

        {isMenuOpen && (
          <div className="absolute top-14 left-0 right-0 bg-white/95 backdrop-blur-sm border-b shadow-lg md:hidden">
            <nav className="flex flex-col p-4 gap-4">
              <a 
                className="text-sm font-medium hover:text-purple-600 transition-colors" 
                href="#features"
                onClick={() => setIsMenuOpen(false)}
              >
                Features
              </a>
              <a 
                className="text-sm font-medium hover:text-purple-600 transition-colors" 
                href="#how-it-works"
                onClick={() => setIsMenuOpen(false)}
              >
                How It Works
              </a>
              <a 
                className="text-sm font-medium hover:text-purple-600 transition-colors" 
                href="#testimonials"
                onClick={() => setIsMenuOpen(false)}
              >
                Testimonials
              </a>
              <a 
                className="text-sm font-medium hover:text-purple-600 transition-colors" 
                href="#pricing"
                onClick={() => setIsMenuOpen(false)}
              >
                Pricing
              </a>
              <Button 
                variant="outline" 
                className="border-purple-600 text-purple-600 hover:bg-purple-50 rounded-full px-4 py-1 shadow-sm transition-transform hover:scale-105 text-sm font-medium h-auto w-full"
                asChild
                onClick={() => setIsMenuOpen(false)}
              >
                <a href="/login">Login</a>
              </Button>
            </nav>
          </div>
        )}
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 relative overflow-hidden">
          <div
            className="absolute inset-0 bg-gradient-to-r from-purple-300 to-blue-300 opacity-30"
            style={{
              transform: `translateY(${scrollY * 0.5}px)`,
            }}
          />
          <div className="container px-4 md:px-6 relative">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600">
                    Organize Your Family's Chores with Ease
                  </h1>
                  <p className="max-w-[600px] text-gray-500 md:text-xl">
                    FamilyChores helps you manage household tasks, teach responsibility, and bring your family closer
                    together.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:opacity-90 transition-opacity">
                    Get Started
                  </Button>
                  <Button variant="outline" className="border-purple-600 text-purple-600 hover:bg-purple-50">
                    Learn More
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section id="features" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-center mb-12 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600">
              Key Features
            </h2>
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="bg-white/50 backdrop-blur-sm hover:shadow-lg transition-shadow">
                <CardContent className="flex flex-col items-center space-y-4 p-6">
                  <CheckCircle className="h-12 w-12 text-purple-600" />
                  <h3 className="text-xl font-bold text-center">Easy Task Assignment</h3>
                  <p className="text-center text-gray-500">Quickly assign age-appropriate chores to family members.</p>
                </CardContent>
              </Card>
              <Card className="bg-white/50 backdrop-blur-sm hover:shadow-lg transition-shadow">
                <CardContent className="flex flex-col items-center space-y-4 p-6">
                  <Users className="h-12 w-12 text-purple-600" />
                  <h3 className="text-xl font-bold text-center">Family Collaboration</h3>
                  <p className="text-center text-gray-500">
                    Foster teamwork and communication within your household.
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-white/50 backdrop-blur-sm hover:shadow-lg transition-shadow">
                <CardContent className="flex flex-col items-center space-y-4 p-6">
                  <Calendar className="h-12 w-12 text-purple-600" />
                  <h3 className="text-xl font-bold text-center">Smart Scheduling</h3>
                  <p className="text-center text-gray-500">
                    Automatically create balanced chore schedules for everyone.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
        <section id="how-it-works" className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-purple-50 to-blue-50">
          <div className="container px-4 md:px-6">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-center mb-12 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600">
              How It Works
            </h2>
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-purple-600 text-white flex items-center justify-center text-xl font-bold">
                  1
                </div>
                <h3 className="text-xl font-bold text-center">Create Your Family Profile</h3>
                <p className="text-center text-gray-500">Add family members and customize their roles.</p>
              </div>
              <div className="flex flex-col items-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-purple-600 text-white flex items-center justify-center text-xl font-bold">
                  2
                </div>
                <h3 className="text-xl font-bold text-center">Set Up Chores and Schedules</h3>
                <p className="text-center text-gray-500">Define tasks and assign them to family members.</p>
              </div>
              <div className="flex flex-col items-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-purple-600 text-white flex items-center justify-center text-xl font-bold">
                  3
                </div>
                <h3 className="text-xl font-bold text-center">Track Progress and Celebrate</h3>
                <p className="text-center text-gray-500">Monitor task completion and reward achievements.</p>
              </div>
            </div>
          </div>
        </section>
        <section id="testimonials" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-center mb-12 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600">
              What Families Are Saying
            </h2>
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="bg-white/50 backdrop-blur-sm hover:shadow-lg transition-shadow">
                <CardContent className="flex flex-col items-center space-y-4 p-6">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-center text-gray-500">
                    "FamilyChores has transformed our household. Our kids are more responsible and our home is always
                    tidy!"
                  </p>
                  <p className="font-bold">Sarah J.</p>
                </CardContent>
              </Card>
              <Card className="bg-white/50 backdrop-blur-sm hover:shadow-lg transition-shadow">
                <CardContent className="flex flex-col items-center space-y-4 p-6">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-center text-gray-500">
                    "The app's intuitive design makes chore management a breeze. Highly recommended!"
                  </p>
                  <p className="font-bold">Mike T.</p>
                </CardContent>
              </Card>
              <Card className="bg-white/50 backdrop-blur-sm hover:shadow-lg transition-shadow">
                <CardContent className="flex flex-col items-center space-y-4 p-6">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-center text-gray-500">
                    "FamilyChores has brought our family closer together. We love the collaborative aspect!"
                  </p>
                  <p className="font-bold">Emily R.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
        <section id="pricing" className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-purple-50 to-blue-50">
          <div className="container px-4 md:px-6">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-center mb-12 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600">
              Simple, Transparent Pricing
            </h2>
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="bg-white/50 backdrop-blur-sm hover:shadow-lg transition-shadow">
                <CardContent className="flex flex-col items-center space-y-4 p-6">
                  <h3 className="text-xl font-bold">Basic</h3>
                  <p className="text-4xl font-bold">$0</p>
                  <p className="text-gray-500">Per month</p>
                  <ul className="space-y-2 text-center">
                    <li>Up to 5 family members</li>
                    <li>10 chores per week</li>
                    <li>Basic reporting</li>
                  </ul>
                  <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:opacity-90 transition-opacity">
                    Get Started
                  </Button>
                </CardContent>
              </Card>
              <Card className="bg-white/50 backdrop-blur-sm hover:shadow-lg transition-shadow border-purple-600 border-2">
                <CardContent className="flex flex-col items-center space-y-4 p-6">
                  <h3 className="text-xl font-bold">Pro</h3>
                  <p className="text-4xl  font-bold">$9.99</p>
                  <p className="text-gray-500">Per month</p>
                  <ul className="space-y-2 text-center">
                    <li>Up to 10 family members</li>
                    <li>Unlimited chores</li>
                    <li>Advanced reporting</li>
                    <li>Reward system</li>
                  </ul>
                  <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:opacity-90 transition-opacity">
                    Start Free Trial
                  </Button>
                </CardContent>
              </Card>
              <Card className="bg-white/50 backdrop-blur-sm hover:shadow-lg transition-shadow">
                <CardContent className="flex flex-col items-center space-y-4 p-6">
                  <h3 className="text-xl font-bold">Enterprise</h3>
                  <p className="text-4xl font-bold">Custom</p>
                  <p className="text-gray-500">Contact us for pricing</p>
                  <ul className="space-y-2 text-center">
                    <li>Unlimited family members</li>
                    <li>Custom integrations</li>
                    <li>Dedicated support</li>
                    <li>Custom features</li>
                  </ul>
                  <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:opacity-90 transition-opacity">
                    Contact Sales
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-purple-50 to-blue-50">
          <div className="container px-4 md:px-6 text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600">
              Ready to Transform Your Family's Chore Management?
            </h2>
            <p className="mx-auto max-w-[600px] text-gray-500 md:text-xl/relaxed mb-8">
              Join thousands of families who have simplified their household tasks with FamilyChores.
            </p>
            <div className="mx-auto max-w-sm space-y-4">
              <Input type="email" placeholder="Enter your email" className="bg-white/50 backdrop-blur-sm" />
              <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:opacity-90 transition-opacity">
                Get Started for Free
              </Button>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t bg-white/50 backdrop-blur-sm">
        <p className="text-xs text-gray-500">© 2024 FamilyChores. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <a className="text-xs hover:underline underline-offset-4" href="#">
            Terms of Service
          </a>
          <a className="text-xs hover:underline underline-offset-4" href="#">
            Privacy
          </a>
        </nav>
      </footer>
    </div>
  )
}