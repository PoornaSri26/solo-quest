import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import CursorRingField from '../components/CursorRingField';
import RotatingGallery from '../components/originkit/ui/rotatinggallery';
import RadialRevealButton from '../components/RadialRevealButton';

const heroButtonFont = {
  fontFamily: 'inherit',
  fontSize: 17,
  fontWeight: 600,
  lineHeight: '1.2em',
  letterSpacing: '0em',
  textAlign: 'center' as const,
};

gsap.registerPlugin(ScrollTrigger);

export default function LandingPage() {
  const navigate = useNavigate();

  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const demoRef = useRef<HTMLDivElement>(null);

  const handleGetStarted = () => {
    navigate('/auth');
  };

  const handleSeeHowItWorks = () => {
    demoRef.current?.scrollIntoView({ behavior: 'smooth' });
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
        <div className="absolute inset-0 z-0">
          <CursorRingField 
            background="#020617"
            colors={["#7c3aed", "#a78bfa", "#c4b5fd"]}
            density={200}
            dotSize={120}
            speed={6}
            cameraDistance={160}
            ring={{ push: 50, width: 9, radius: 12, turbulence: 100 }}
          />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight leading-tight drop-shadow-lg">
            Turn your daily tasks into quests
          </h1>
            
          <p className="text-xl md:text-2xl text-gray-200 mb-8 max-w-3xl mx-auto leading-relaxed drop-shadow-md">
            The productivity app that gamifies your work. Complete quests, level up, and achieve your goals with the motivation of game progression.
          </p>

          <div className="flex flex-wrap justify-center gap-8 mb-12 text-gray-200">
            <div>
              <div className="text-2xl font-bold text-white drop-shadow-md">10K+</div>
              <div className="text-sm">Active Hunters</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white drop-shadow-md">50K+</div>
              <div className="text-sm">Quests Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white drop-shadow-md">4.9★</div>
              <div className="text-sm">User Rating</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <RadialRevealButton
              label="Start Free Trial"
              onClick={handleGetStarted}
              font={heroButtonFont}
              padding="16px 32px"
              rounded={100}
              colors={{
                fill: '#7c3aed',
                textColor: '#ffffff',
                hoverFill: '#ffffff',
                hoverTextColor: '#5b21b6',
              }}
              border={{ borderWidth: 0 }}
              style={{
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3), 0 4px 6px -4px rgba(0,0,0,0.3)',
              }}
            />
            <RadialRevealButton
              label="See How It Works"
              onClick={handleSeeHowItWorks}
              font={heroButtonFont}
              padding="16px 32px"
              rounded={100}
              colors={{
                fill: 'rgba(255,255,255,0.08)',
                textColor: '#ffffff',
                hoverFill: '#ffffff',
                hoverTextColor: '#0f172a',
              }}
              border={{
                borderWidth: 2,
                borderStyle: 'solid',
                borderColor: 'rgba(255,255,255,0.2)',
              }}
              style={{
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
              }}
            />
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
      <div ref={featuresRef} className="py-24 bg-slate-950 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Everything you need
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Powerful features designed to make productivity feel rewarding.
            </p>
          </div>

          {/* Horizontal Rotating Gallery */}
          <div className="mb-16 h-[400px] w-full relative">
            <RotatingGallery 
              background="transparent"
              cardWidth={300}
              cardHeight={200}
              spacing={8}
              radius={8}
              rotation={{ spin: 3, twist: 2, axis: "y" }}
              scrollSensitivity={15}
              dragSensitivity={8}
              style={{ borderRadius: '16px' }}
            />
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
              <div key={index} className="bg-slate-900 p-8 rounded-xl border border-slate-800 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300">
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
          <RadialRevealButton
            label="Start Your Free Trial"
            onClick={handleGetStarted}
            font={heroButtonFont}
            padding="16px 32px"
            rounded={100}
            colors={{
              fill: '#ffffff',
              textColor: '#0f172a',
              hoverFill: '#7c3aed',
              hoverTextColor: '#ffffff',
            }}
            border={{ borderWidth: 0 }}
          />
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