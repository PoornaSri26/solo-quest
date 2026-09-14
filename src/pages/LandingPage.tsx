import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function LandingPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [currentVideo, setCurrentVideo] = useState<string | null>(null);
  
  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const demoRef = useRef<HTMLDivElement>(null);

  const handleGetStarted = () => {
    navigate('/auth');
  };

  const handleWaitlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Thanks for joining the waitlist! We\'ll notify you when we launch.');
    setEmail('');
  };

  // Subtle, purposeful animations
  useEffect(() => {
    gsap.fromTo(heroRef.current, 
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: "power2.out" }
    );

    gsap.fromTo(featuresRef.current?.children || [],
      { y: 20, opacity: 0 },
      {
        y: 0, opacity: 1,
        duration: 0.6, stagger: 0.15,
        scrollTrigger: {
          trigger: featuresRef.current,
          start: "top 85%",
        }
      }
    );

    gsap.fromTo(demoRef.current,
      { scale: 0.95, opacity: 0 },
      {
        scale: 1, opacity: 1,
        duration: 0.8, ease: "power2.out",
        scrollTrigger: {
          trigger: demoRef.current,
          start: "top 75%",
        }
      }
    );

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 overflow-x-hidden">
      
      {/* Hero Section */}
      <div ref={heroRef} className="relative min-h-screen flex items-center justify-center">
        <div className="absolute inset-0">
          <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight leading-tight">
            Turn your daily tasks into quests
          </h1>
            
          <p className="text-xl md:text-2xl text-gray-400 mb-8 max-w-3xl mx-auto leading-relaxed">
            The productivity app that gamifies your work. Complete quests, level up, and achieve your goals with the motivation of game progression.
          </p>

          <div className="flex flex-wrap justify-center gap-8 mb-12 text-gray-400">
            <div>
              <div className="text-2xl font-bold text-white">10K+</div>
              <div className="text-sm">Active Hunters</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">50K+</div>
              <div className="text-sm">Quests Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">4.9★</div>
              <div className="text-sm">User Rating</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={handleGetStarted}
              className="px-8 py-4 bg-white text-slate-900 font-semibold text-lg rounded-lg hover:bg-gray-100 transition-all duration-200"
            >
              Start Free Trial
            </button>
            <button
              onClick={() => setCurrentVideo('demo')}
              className="px-8 py-4 bg-transparent border border-slate-700 text-white font-semibold text-lg rounded-lg hover:bg-slate-800 transition-all duration-200"
            >
              See How It Works
            </button>
          </div>
        </div>
      </div>

      {/* Quiet Section */}
      <div className="py-32 bg-slate-950">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Simple by design.
          </h2>
          <p className="text-xl text-gray-400 leading-relaxed">
            Everything you need to level up your productivity. 
            Nothing you don't.
          </p>
        </div>
      </div>

      {/* Product UI Showcase */}
      <div ref={demoRef} className="py-24 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Built for real work
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              A productivity tool that respects your workflow while adding the motivation of game progression.
            </p>
          </div>

          <div className="relative max-w-4xl mx-auto">
            <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
              <div className="bg-slate-900 px-6 py-4 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center text-white font-bold">S</div>
                  <span className="text-white font-semibold">Solo Quest</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
              </div>
              
              <div className="p-6 bg-slate-800">
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="bg-slate-900 rounded-xl p-4">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                      <span>⚔️</span> Active Quests
                    </h3>
                    <div className="space-y-3">
                      <div className="bg-slate-800 p-3 rounded-lg border-l-4 border-red-500">
                        <div className="text-white text-sm font-medium">Complete project</div>
                        <div className="text-gray-400 text-xs">Rank S • Due today</div>
                      </div>
                      <div className="bg-slate-800 p-3 rounded-lg border-l-4 border-blue-500">
                        <div className="text-white text-sm font-medium">Review documentation</div>
                        <div className="text-gray-400 text-xs">Rank A • Due tomorrow</div>
                      </div>
                      <div className="bg-slate-800 p-3 rounded-lg border-l-4 border-green-500">
                        <div className="text-white text-sm font-medium">Team meeting</div>
                        <div className="text-gray-400 text-xs">Rank C • Due in 3 days</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 rounded-xl p-4">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                      <span>📊</span> Your Stats
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-400">Level</span>
                          <span className="text-white font-medium">24</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div className="bg-purple-500 h-2 rounded-full" style={{ width: '65%' }}></div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-800 p-3 rounded-lg text-center">
                          <div className="text-yellow-400 font-bold">2,450</div>
                          <div className="text-gray-400 text-xs">Gold</div>
                        </div>
                        <div className="bg-slate-800 p-3 rounded-lg text-center">
                          <div className="text-cyan-400 font-bold">15</div>
                          <div className="text-gray-400 text-xs">Streak</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 rounded-xl p-4">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                      <span>🏰</span> Daily Dungeon
                    </h3>
                    <div className="bg-slate-800 p-4 rounded-lg text-center">
                      <div className="text-3xl mb-2">⛏️</div>
                      <div className="text-white font-medium mb-1">Complete 3 tasks</div>
                      <div className="text-gray-400 text-sm mb-3">Progress: 2/3</div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: '66%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Overview */}
      <div ref={featuresRef} className="py-24 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Everything you need
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Powerful features designed to make productivity feel rewarding.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { title: "Quest System", icon: "⚔️", description: "Create and manage quests with E-S rank difficulty levels" },
              { title: "Daily Dungeons", icon: "🏰", description: "Complete daily challenges to maintain streaks and earn bonuses" },
              { title: "Real-Time Progress", icon: "🎯", description: "Watch your character grow with live stat updates and achievements" },
              { title: "Shop System", icon: "🏪", description: "Purchase cosmetics, themes, and power-ups with earned gold" },
              { title: "Leaderboards", icon: "🏆", description: "Compete globally and climb the rankings" },
              { title: "Advanced Stats", icon: "📊", description: "Track productivity patterns and optimize your workflow" },
            ].map((feature, index) => (
              <div key={index} className="bg-slate-900 p-8 rounded-xl border border-slate-800 hover:border-slate-700 transition-all duration-300">
                <div className="text-3xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 bg-slate-900/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to level up?
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            Join thousands of hunters who are already transforming their productivity.
          </p>
          <button
            onClick={handleGetStarted}
            className="px-8 py-4 bg-white text-slate-900 font-semibold text-lg rounded-lg hover:bg-gray-100 transition-all duration-200"
          >
            Start Your Free Trial
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="py-12 bg-slate-950 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-400">
          <p>&copy; 2024 Solo Quest. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}