import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function LandingPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [currentVideo, setCurrentVideo] = useState<string | null>(null);
  
  // Refs for GSAP animations
  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const demoRef = useRef<HTMLDivElement>(null);
  const trailerRef = useRef<HTMLDivElement>(null);
  const pricingRef = useRef<HTMLDivElement>(null);

  const handleGetStarted = () => {
    navigate('/auth');
  };

  const handleWaitlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Thanks for joining the waitlist! We\'ll notify you when we launch.');
    setEmail('');
  };

  // GSAP 3D animations
  useEffect(() => {
    // Hero section 3D animation
    gsap.fromTo(heroRef.current, 
      { rotationX: 15, rotationY: -15, scale: 0.9, opacity: 0 },
      { rotationX: 0, rotationY: 0, scale: 1, opacity: 1, duration: 1.5, ease: "power3.out" }
    );

    // Scroll-triggered animations
    gsap.fromTo(featuresRef.current?.children || [],
      { y: 100, opacity: 0, rotationX: 45 },
      {
        y: 0, opacity: 1, rotationX: 0,
        duration: 0.8, stagger: 0.2,
        scrollTrigger: {
          trigger: featuresRef.current,
          start: "top 80%",
        }
      }
    );

    // Demo section 3D reveal
    gsap.fromTo(demoRef.current,
      { scale: 0.8, rotationY: 30, opacity: 0 },
      {
        scale: 1, rotationY: 0, opacity: 1,
        duration: 1, ease: "power2.out",
        scrollTrigger: {
          trigger: demoRef.current,
          start: "top 70%",
        }
      }
    );

    // Trailer section cinematic reveal
    gsap.fromTo(trailerRef.current,
      { scale: 1.1, filter: "blur(10px)", opacity: 0 },
      {
        scale: 1, filter: "blur(0px)", opacity: 1,
        duration: 1.2, ease: "power2.inOut",
        scrollTrigger: {
          trigger: trailerRef.current,
          start: "top 60%",
        }
      }
    );

    // Pricing cards 3D hover effect
    gsap.utils.toArray('.pricing-card').forEach((card: any) => {
      card.addEventListener('mouseenter', () => {
        gsap.to(card, { rotationY: 5, rotationX: -5, scale: 1.05, duration: 0.3 });
      });
      card.addEventListener('mouseleave', () => {
        gsap.to(card, { rotationY: 0, rotationX: 0, scale: 1, duration: 0.3 });
      });
    });

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-x-hidden">
      
      {/* Hero Section with 3D Animation */}
      <div ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden perspective-1000">
        {/* 3D Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/30 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-pink-500/30 rounded-full blur-3xl animate-pulse animation-delay-4000"></div>
          
          {/* Floating Particles */}
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-white/20 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="transform-style-3d">
            <h1 className="text-6xl md:text-8xl font-bold text-white mb-6 tracking-tight leading-tight">
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-cyan-400 animate-gradient">
                Solo Quest
              </span>
              <span className="block text-4xl md:text-6xl mt-4 text-gray-200">
                Transform Your Productivity
                <span className="block text-5xl md:text-7xl mt-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
                  Into an Epic Adventure
                </span>
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-4xl mx-auto leading-relaxed">
              Inspired by Solo Leveling, Solo Quest turns your daily tasks into quests, 
              your goals into raids, and your personal growth into character progression. 
              Experience the gamification of productivity like never before.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mt-12">
              <button
                onClick={handleGetStarted}
                className="px-10 py-5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105 shadow-2xl shadow-purple-500/50"
              >
                ⚔️ Start Your Journey
              </button>
              <button
                onClick={() => setCurrentVideo('demo')}
                className="px-10 py-5 bg-transparent border-2 border-cyan-500 text-cyan-400 font-bold text-lg rounded-xl hover:bg-cyan-500 hover:text-white transition-all transform hover:scale-105"
              >
                🎬 Watch Demo
              </button>
            </div>

            {/* Scroll Indicator */}
            <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
              <div className="w-8 h-12 border-2 border-white/30 rounded-full flex justify-center pt-2">
                <div className="w-2 h-2 bg-white/50 rounded-full animate-ping"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cinematic Trailer Section */}
      <div ref={trailerRef} className="py-24 bg-gradient-to-b from-slate-900 to-purple-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-white mb-4">
              Experience the Adventure
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Watch the cinematic trailer and discover how Solo Quest transforms productivity into an epic journey
            </p>
          </div>

          <div className="relative max-w-5xl mx-auto rounded-2xl overflow-hidden shadow-2xl shadow-purple-500/30 border border-purple-500/30">
            <div className="aspect-video bg-gradient-to-br from-purple-900 to-slate-900 flex items-center justify-center relative">
              {/* Trailer Placeholder */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
                <div className="text-6xl mb-4">🎬</div>
                <h3 className="text-3xl font-bold text-white mb-2">Solo Quest Cinematic Trailer</h3>
                <p className="text-gray-300 mb-6">Coming Soon</p>
                <button
                  onClick={() => setCurrentVideo('trailer')}
                  className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all"
                >
                  ▶ Watch Trailer
                </button>
              </div>
              
              {/* Animated Border */}
              <div className="absolute inset-0 border-4 border-gradient-to-r from-purple-500 to-pink-500 rounded-2xl animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      {/* App Demo Section */}
      <div ref={demoRef} className="py-24 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-white mb-4">
              See It In Action
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Watch the complete app walkthrough and discover all the powerful features
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Main Demo Video */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-cyan-500/20 border border-cyan-500/30">
              <div className="aspect-video bg-gradient-to-br from-cyan-900 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-5xl mb-4">📱</div>
                  <h3 className="text-2xl font-bold text-white mb-2">Complete App Demo</h3>
                  <p className="text-gray-300 mb-4">Full walkthrough of all features</p>
                  <button
                    onClick={() => setCurrentVideo('demo')}
                    className="px-6 py-2 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-700 transition-all"
                  >
                    ▶ Watch Demo
                  </button>
                </div>
              </div>
            </div>

            {/* Feature Overview */}
            <div className="space-y-4">
              <div className="bg-slate-800/50 p-6 rounded-xl border border-purple-500/20 hover:border-purple-500/50 transition-all">
                <h3 className="text-xl font-bold text-white mb-2">⚔️ Quest System</h3>
                <p className="text-gray-400">Create and manage quests with E-S rank difficulty levels</p>
              </div>
              <div className="bg-slate-800/50 p-6 rounded-xl border border-cyan-500/20 hover:border-cyan-500/50 transition-all">
                <h3 className="text-xl font-bold text-white mb-2">🏰 Daily Dungeons</h3>
                <p className="text-gray-400">Complete daily challenges to maintain streaks and earn bonuses</p>
              </div>
              <div className="bg-slate-800/50 p-6 rounded-xl border border-pink-500/20 hover:border-pink-500/50 transition-all">
                <h3 className="text-xl font-bold text-white mb-2">🎯 Real-Time Progress</h3>
                <p className="text-gray-400">Watch your character grow with live stat updates and achievements</p>
              </div>
              <div className="bg-slate-800/50 p-6 rounded-xl border border-green-500/20 hover:border-green-500/50 transition-all">
                <h3 className="text-xl font-bold text-white mb-2">🏪 Shop System</h3>
                <p className="text-gray-400">Purchase cosmetics, themes, and power-ups with earned gold</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Explanation Videos Section */}
      <div className="py-24 bg-gradient-to-b from-slate-900/50 to-purple-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-white mb-4">
              Deep Dive Features
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Explore each feature in detail with dedicated explanation videos
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: "Quest Progression", icon: "⚔️", description: "Learn how quest ranks and XP progression work" },
              { title: "Gate System", icon: "🚪", description: "Understand the gate mechanics and raid progression" },
              { title: "Shadow Realm", icon: "👻", description: "Discover the shadow realm and hidden content" },
              { title: "Shop Economy", icon: "🏪", description: "Master the shop system and gold economy" },
              { title: "Leaderboards", icon: "🏆", description: "Compete globally and climb the rankings" },
              { title: "Advanced Tips", icon: "💡", description: "Pro strategies for maximizing productivity" },
            ].map((feature, index) => (
              <div key={index} className="bg-slate-800/50 p-6 rounded-xl border border-purple-500/20 hover:border-purple-500/50 transition-all transform hover:scale-105 cursor-pointer group">
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">{feature.icon}</div>
                <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400 mb-4">{feature.description}</p>
                <button
                  onClick={() => setCurrentVideo(`feature-${index}`)}
                  className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-2"
                >
                  ▶ Watch Video
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Comprehensive Features Section */}
      <div ref={featuresRef} className="py-24 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-5xl font-bold text-white text-center mb-4">
            Game-Changing Features
          </h2>
          <p className="text-xl text-gray-300 text-center mb-16 max-w-3xl mx-auto">
            Built with expert game design principles from 260+ industry resources
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard3D
              icon="⚔️"
              title="Quest System"
              description="Create and manage quests with different ranks (E, D, C, B, A, S). Earn XP and gold based on difficulty with anti-grind mechanics and variety bonuses."
              color="purple"
            />
            <FeatureCard3D
              icon="🏰"
              title="Daily Dungeons"
              description="Complete daily challenges to maintain streaks and earn bonus rewards. Build consistency through gamification with elastic failure systems."
              color="cyan"
            />
            <FeatureCard3D
              icon="🎯"
              title="Real-Time Progress"
              description="Watch your character grow in real-time with live stat updates, level-up notifications, and achievement tracking with enhanced feedback systems."
              color="pink"
            />
            <FeatureCard3D
              icon="🏪"
              title="Shop System"
              description="Purchase cosmetics, themes, and power-ups with earned gold. Customize your hunter experience with dual-use resource design."
              color="green"
            />
            <FeatureCard3D
              icon="📊"
              title="Leaderboards"
              description="Compete with other hunters on global rankings. Track your progress and climb the ranks with horizontal variance for player agency."
              color="yellow"
            />
            <FeatureCard3D
              icon="🔒"
              title="Enterprise Security"
              description="Built with security in mind. Server-side validation, rate limiting, Redis caching, CSRF protection, and comprehensive testing infrastructure."
              color="red"
            />
          </div>
        </div>
      </div>

      {/* Game Design Excellence Section */}
      <div className="py-24 bg-gradient-to-r from-purple-900/50 to-pink-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-white mb-4">
              Built with Expert Game Design
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Implementing principles from 260+ game design resources including Game Design Library and expert analysis
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "Anti-Grind Mechanics", description: "Prevents burnout through variety and pacing", icon: "🎯" },
              { title: "Dual-Purpose Systems", description: "Emergent gameplay through multi-use elements", icon: "🔄" },
              { title: "Progression Scaling", description: "Balanced rewards across player levels", icon: "📈" },
              { title: "Enhanced Feedback", description: "4-tier intensity system with visual animations", icon: "✨" },
              { title: "Elastic Failure", description: "Graceful degradation maintains motivation", icon: "💪" },
              { title: "Knowledge Progression", description: "Learning as a progression resource", icon: "🧠" },
              { title: "Retention Architecture", description: "Habit formation over addictive mechanics", icon: "🏗️" },
              { title: "Player Agency", description: "Horizontal variance for self-directed play", icon: "🎮" },
            ].map((item, index) => (
              <div key={index} className="bg-slate-800/50 p-6 rounded-xl border border-purple-500/20 hover:border-purple-500/50 transition-all transform hover:scale-105">
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="py-24 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <StatCard3D number="260+" label="Game Design Resources" />
            <StatCard3D number="22/22" label="Tests Passing" />
            <StatCard3D number="99.9%" label="Build Success Rate" />
            <StatCard3D number="∞" label="Progression Possibilities" />
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="py-24 bg-gradient-to-b from-slate-900/50 to-purple-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-5xl font-bold text-white text-center mb-16">
            How It Works
          </h2>
          <div className="space-y-12 max-w-4xl mx-auto">
            <StepCard3D
              step="1"
              title="Create Your Hunter"
              description="Sign up and create your hunter character. Choose your display name and start your journey in the world of Solo Quest."
            />
            <StepCard3D
              step="2"
              title="Accept Quests"
              description="Add your daily tasks as quests. Assign difficulty ranks (E-S) and set deadlines for extra rewards. Experience the dual-purpose quest system."
            />
            <StepCard3D
              step="3"
              title="Complete & Level Up"
              description="Complete quests to earn XP and gold with enhanced feedback systems. Level up your character with progression scaling and variety bonuses."
            />
            <StepCard3D
              step="4"
              title="Customize & Compete"
              description="Purchase items from the shop with dual-use resource design. Customize your profile and compete on leaderboards with horizontal variance."
            />
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div ref={pricingRef} className="py-24 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-5xl font-bold text-white text-center mb-16">
            Choose Your Path
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PricingCard3D
              title="Free"
              price="$0"
              features={[
                'Basic quest system',
                'Daily dungeons',
                'Character progression',
                'Leaderboard access',
                'Community support',
              ]}
              buttonText="Get Started"
              buttonAction={handleGetStarted}
              highlighted={false}
            />
            <PricingCard3D
              title="Pro"
              price="$9"
              period="/month"
              features={[
                'All Free features',
                'Advanced analytics',
                'Custom themes',
                'Priority support',
                'API access',
                'Early access features',
              ]}
              buttonText="Coming Soon"
              highlighted={true}
              buttonAction={() => {}}
            />
            <PricingCard3D
              title="Enterprise"
              price="Custom"
              features={[
                'All Pro features',
                'White-label solution',
                'Custom integrations',
                'Dedicated support',
                'SLA guarantee',
                'Team management',
              ]}
              buttonText="Contact Us"
              buttonAction={() => {
                window.location.href = 'mailto:poornasri.n24@gmail.com';
              }}
              highlighted={false}
            />
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 bg-gradient-to-r from-purple-900 to-pink-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-5xl font-bold text-white mb-6">
            Ready to Begin Your Adventure?
          </h2>
          <p className="text-xl text-gray-200 mb-8">
            Join thousands of hunters who have transformed their productivity into an epic journey.
            Experience the power of expert game design applied to personal productivity.
          </p>
          <button
            onClick={handleGetStarted}
            className="px-12 py-5 bg-white text-purple-900 font-bold text-lg rounded-xl hover:bg-gray-100 transition-all transform hover:scale-105 shadow-2xl"
          >
            Start Your Quest Now
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-white font-bold mb-4 text-xl">Solo Quest</h3>
              <p className="text-gray-400">Transform your productivity into an epic adventure with expert game design principles.</p>
            </div>
            <div>
              <h3 className="text-white font-bold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition">Features</a></li>
                <li><a href="#" className="hover:text-white transition">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition">Roadmap</a></li>
                <li><a href="#" className="hover:text-white transition">Documentation</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-bold mb-4">Resources</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition">Game Design Guide</a></li>
                <li><a href="#" className="hover:text-white transition">API Documentation</a></li>
                <li><a href="#" className="hover:text-white transition">Deployment Guide</a></li>
                <li><a href="#" className="hover:text-white transition">System Design</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-bold mb-4">Contact</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="mailto:poornasri.n24@gmail.com" className="hover:text-white transition">Email</a></li>
                <li><a href="https://github.com/PoornaSri26/solo-quest" className="hover:text-white transition">GitHub</a></li>
                <li><a href="#" className="hover:text-white transition">Twitter</a></li>
                <li><a href="#" className="hover:text-white transition">Discord</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Solo Quest. All rights reserved. Built with expert game design principles.</p>
          </div>
        </div>
      </footer>

      {/* Video Modal */}
      {currentVideo && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setCurrentVideo(null)}>
          <div className="relative max-w-5xl w-full bg-slate-900 rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setCurrentVideo(null)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10 text-2xl"
            >
              ✕
            </button>
            <div className="aspect-video bg-gradient-to-br from-purple-900 to-slate-900 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">🎬</div>
                <h3 className="text-3xl font-bold text-white mb-2">
                  {currentVideo === 'demo' && 'App Demo Walkthrough'}
                  {currentVideo === 'trailer' && 'Cinematic Trailer'}
                  {currentVideo.startsWith('feature') && 'Feature Explanation'}
                </h3>
                <p className="text-gray-300 mb-6">Video content coming soon</p>
                <p className="text-sm text-gray-400 max-w-md mx-auto">
                  This section will contain the actual video content once created. 
                  For now, it serves as a placeholder showing where videos will be integrated.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FeatureCard3D({ icon, title, description, color }: { icon: string; title: string; description: string; color: string }) {
  const colorClasses = {
    purple: 'border-purple-500/20 hover:border-purple-500/50 hover:shadow-purple-500/20',
    cyan: 'border-cyan-500/20 hover:border-cyan-500/50 hover:shadow-cyan-500/20',
    pink: 'border-pink-500/20 hover:border-pink-500/50 hover:shadow-pink-500/20',
    green: 'border-green-500/20 hover:border-green-500/50 hover:shadow-green-500/20',
    yellow: 'border-yellow-500/20 hover:border-yellow-500/50 hover:shadow-yellow-500/20',
    red: 'border-red-500/20 hover:border-red-500/50 hover:shadow-red-500/20',
  };

  return (
    <div className={`bg-slate-800/50 p-8 rounded-xl border ${colorClasses[color]} transition-all transform hover:scale-105 hover:shadow-xl`}>
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-2xl font-bold text-white mb-3">{title}</h3>
      <p className="text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}

function StatCard3D({ number, label }: { number: string; label: string }) {
  return (
    <div className="transform hover:scale-110 transition-transform">
      <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 mb-2">
        {number}
      </div>
      <div className="text-gray-400 text-lg">{label}</div>
    </div>
  );
}

function StepCard3D({ step, title, description }: { step: string; title: string; description: string }) {
  return (
    <div className="flex gap-6 items-start transform hover:translate-x-2 transition-transform">
      <div className="flex-shrink-0">
        <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-purple-500/30">
          {step}
        </div>
      </div>
      <div>
        <h3 className="text-3xl font-bold text-white mb-3">{title}</h3>
        <p className="text-gray-400 text-lg leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function PricingCard3D({
  title,
  price,
  period,
  features,
  buttonText,
  buttonAction,
  highlighted = false,
}: {
  title: string;
  price: string;
  period?: string;
  features: string[];
  buttonText: string;
  buttonAction: () => void;
  highlighted?: boolean;
}) {
  return (
    <div className={`pricing-card p-8 rounded-2xl border transition-all ${
      highlighted
        ? 'bg-gradient-to-b from-purple-900/50 to-pink-900/50 border-purple-500 shadow-2xl shadow-purple-500/30'
        : 'bg-slate-800/50 border-gray-700'
    }`}>
      <h3 className="text-3xl font-bold text-white mb-4">{title}</h3>
      <div className="mb-6">
        <span className="text-5xl font-bold text-white">{price}</span>
        {period && <span className="text-gray-400 text-xl">{period}</span>}
      </div>
      <ul className="space-y-4 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center text-gray-300">
            <span className="w-3 h-3 bg-green-500 rounded-full mr-3"></span>
            {feature}
          </li>
        ))}
      </ul>
      <button
        onClick={buttonAction}
        className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
          highlighted
            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 shadow-lg'
            : 'bg-slate-700 text-white hover:bg-slate-600'
        }`}
      >
        {buttonText}
      </button>
    </div>
  );
}