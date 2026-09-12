import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');

  const handleGetStarted = () => {
    navigate('/auth');
  };

  const handleWaitlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production, this would submit to a waitlist service
    alert('Thanks for joining the waitlist! We\'ll notify you when we launch.');
    setEmail('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
          <div className="absolute top-20 right-10 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
              Transform Your Productivity
              <span className="block bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                Into an Epic Adventure
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Solo Quest turns your daily tasks into quests, your goals into raids, and your personal growth into character progression. Inspired by Solo Leveling.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={handleGetStarted}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105 shadow-lg"
              >
                Start Your Journey
              </button>
              <button
                onClick={() => navigate('/auth')}
                className="px-8 py-4 bg-transparent border-2 border-purple-500 text-purple-400 font-bold rounded-lg hover:bg-purple-500 hover:text-white transition-all"
              >
                View Demo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white text-center mb-16">
            Game-Changing Features
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon="⚔️"
              title="Quest System"
              description="Create and manage quests with different ranks (E, D, C, B, A, S). Earn XP and gold based on difficulty."
            />
            <FeatureCard
              icon="🏰"
              title="Daily Dungeons"
              description="Complete daily challenges to maintain streaks and earn bonus rewards. Build consistency through gamification."
            />
            <FeatureCard
              icon="🎯"
              title="Real-Time Progress"
              description="Watch your character grow in real-time with live stat updates, level-up notifications, and achievement tracking."
            />
            <FeatureCard
              icon="🏪"
              title="Shop System"
              description="Purchase cosmetics, themes, and power-ups with earned gold. Customize your hunter experience."
            />
            <FeatureCard
              icon="📊"
              title="Leaderboards"
              description="Compete with other hunters on global rankings. Track your progress and climb the ranks."
            />
            <FeatureCard
              icon="🔒"
              title="Enterprise Security"
              description="Built with security in mind. Server-side validation, rate limiting, and comprehensive testing."
            />
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="py-20 bg-gradient-to-r from-purple-900/50 to-pink-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <StatCard number="10K+" label="Active Users" />
            <StatCard number="100K+" label="Quests Completed" />
            <StatCard number="99.9%" label="Uptime" />
            <StatCard number="<100ms" label="API Response" />
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="py-20 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white text-center mb-16">
            How It Works
          </h2>
          <div className="space-y-12">
            <StepCard
              step="1"
              title="Create Your Hunter"
              description="Sign up and create your hunter character. Choose your display name and start your journey."
            />
            <StepCard
              step="2"
              title="Accept Quests"
              description="Add your daily tasks as quests. Assign difficulty ranks and set deadlines for extra rewards."
            />
            <StepCard
              step="3"
              title="Complete & Level Up"
              description="Complete quests to earn XP and gold. Level up your character and unlock new features."
            />
            <StepCard
              step="4"
              title="Customize & Compete"
              description="Purchase items from the shop, customize your profile, and compete on leaderboards."
            />
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="py-20 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white text-center mb-16">
            Choose Your Path
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PricingCard
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
            />
            <PricingCard
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
            />
            <PricingCard
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
            />
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 bg-gradient-to-r from-purple-900 to-pink-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Begin Your Adventure?
          </h2>
          <p className="text-xl text-gray-200 mb-8">
            Join thousands of hunters who have transformed their productivity into an epic journey.
          </p>
          <button
            onClick={handleGetStarted}
            className="px-12 py-4 bg-white text-purple-900 font-bold rounded-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-xl"
          >
            Start Your Quest Now
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-white font-bold mb-4">Solo Quest</h3>
              <p className="text-gray-400">Transform your productivity into an epic adventure.</p>
            </div>
            <div>
              <h3 className="text-white font-bold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition">Features</a></li>
                <li><a href="#" className="hover:text-white transition">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition">Roadmap</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-bold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition">About</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><a href="#" className="hover:text-white transition">Careers</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-bold mb-4">Contact</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="mailto:poornasri.n24@gmail.com" className="hover:text-white transition">Email</a></li>
                <li><a href="https://github.com/PoornaSri26/solo-quest" className="hover:text-white transition">GitHub</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Solo Quest. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-slate-800/50 p-6 rounded-lg border border-purple-500/20 hover:border-purple-500/50 transition-all">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}

function StatCard({ number, label }: { number: string; label: string }) {
  return (
    <div>
      <div className="text-4xl font-bold text-white mb-2">{number}</div>
      <div className="text-gray-400">{label}</div>
    </div>
  );
}

function StepCard({ step, title, description }: { step: string; title: string; description: string }) {
  return (
    <div className="flex gap-6">
      <div className="flex-shrink-0">
        <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
          {step}
        </div>
      </div>
      <div>
        <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
        <p className="text-gray-400">{description}</p>
      </div>
    </div>
  );
}

function PricingCard({
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
    <div className={`p-8 rounded-lg border ${
      highlighted
        ? 'bg-gradient-to-b from-purple-900/50 to-pink-900/50 border-purple-500 transform scale-105'
        : 'bg-slate-800/50 border-gray-700'
    }`}>
      <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
      <div className="mb-6">
        <span className="text-4xl font-bold text-white">{price}</span>
        {period && <span className="text-gray-400">{period}</span>}
      </div>
      <ul className="space-y-3 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center text-gray-300">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
            {feature}
          </li>
        ))}
      </ul>
      <button
        onClick={buttonAction}
        className={`w-full py-3 rounded-lg font-bold transition-all ${
          highlighted
            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
            : 'bg-slate-700 text-white hover:bg-slate-600'
        }`}
      >
        {buttonText}
      </button>
    </div>
  );
}
