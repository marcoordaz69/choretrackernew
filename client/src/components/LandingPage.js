"use client";

import React, { useState, useEffect } from "react";
import { Button } from "./UI/button";
import { Input } from "./UI/input";
import { Card, CardContent } from "./UI/card";
import { CheckCircle, Users, Calendar, Sparkles } from "lucide-react";
// Import Link from react-router-dom if you're using it for navigation
// import { Link } from "react-router-dom";

export default function LandingPage() {
    const [scrollY, setScrollY] = useState(0);
  
    useEffect(() => {
      const handleScroll = () => setScrollY(window.scrollY);
      window.addEventListener("scroll", handleScroll);
      return () => window.removeEventListener("scroll", handleScroll);
    }, []);
  
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-purple-50 to-blue-50">
        <header className="px-4 lg:px-6 h-14 flex items-center border-b bg-white/50 backdrop-blur-sm fixed w-full z-50">
          <a className="flex items-center justify-center" href="#">
            <Sparkles className="h-6 w-6 text-purple-600" />
            <span className="ml-2 text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600">
              FamilyChores
            </span>
          </a>
          <nav className="ml-auto flex gap-4 sm:gap-6">
            <a className="text-sm font-medium hover:text-purple-600 transition-colors" href="#features">
              Features
            </a>
            <a className="text-sm font-medium hover:text-purple-600 transition-colors" href="#how-it-works">
              How It Works
            </a>
            <a className="text-sm font-medium hover:text-purple-600 transition-colors" href="#testimonials">
              Testimonials
            </a>
          </nav>
        </header>
        <main className="flex-1 pt-14">
          <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 relative overflow-hidden">
            <div
              className="absolute inset-0 bg-gradient-to-r from-purple-300 to-blue-300 opacity-30"
              style={{
                transform: `translateY(${scrollY * 0.5}px)`
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
                      FamilyChores helps you manage household tasks, teach responsibility, and bring your family closer together.
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
                <div className="lg:order-last relative">
                  <div className="absolute -inset-4 bg-gradient-to-r from-purple-100 to-blue-100 rounded-xl blur-xl" />
                  <img
                    src="/placeholder.svg"
                    width={550}
                    height={550}
                    alt="FamilyChores App Interface"
                    className="relative rounded-xl shadow-2xl transition-transform hover:scale-105 duration-300"
                  />
                </div>
              </div>
            </div>
          </section>
          {/* Features Section */}
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
                    <img
                      src="/placeholder.svg"
                      width={300}
                      height={200}
                      alt="Task Assignment Interface"
                      className="rounded-lg object-cover shadow-md hover:shadow-xl transition-shadow"
                    />
                  </CardContent>
                </Card>
                {/* Repeat similar structure for other feature cards */}
              </div>
            </div>
          </section>
          {/* How It Works Section */}
          <section id="how-it-works" className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-purple-50 to-blue-50">
            {/* Similar structure as features section, replace Image with img */}
          </section>
          {/* Testimonials Section */}
          <section id="testimonials" className="w-full py-12 md:py-24 lg:py-32">
            {/* Similar structure as features section, replace Image with img */}
          </section>
          {/* Call to Action Section */}
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
    );
  }