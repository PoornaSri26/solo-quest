import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [preferences, setPreferences] = useState({
    simpleMode: false,
    penaltySeverity: 'forgiving',
    notificationPreference: 'adaptive',
  });

  const { initializeApp } = useStore();

  const handleComplete = async () => {
    // Save preferences and continue to dashboard
    await initializeApp();
    navigate('/dashboard');
  };

  const steps = [
    {
      title: "Welcome to Solo Quest",
      description: "Turn your daily tasks into epic adventures",
      content: (
        <div className="text-center">
          <div className="text-6xl mb-4">⚔️</div>
          <p className="text-gray-400">
            Solo Quest transforms your productivity into a gamified experience 
            inspired by Solo Leveling. Complete quests, level up, and become 
            the strongest version of yourself.
          </p>
        </div>
      ),
    },
    {
      title: "Choose Your Experience",
      description: "Select how you want to play",
      content: (
        <div className="space-y-4">
          <button
            onClick={() => setPreferences({ ...preferences, simpleMode: false })}
            className={`w-full p-6 rounded-xl border-2 transition-all ${
              !preferences.simpleMode 
                ? 'border-purple-500 bg-purple-500/10' 
                : 'border-slate-700 hover:border-slate-600'
            }`}
          >
            <div className="text-3xl mb-2">🎮</div>
            <h3 className="text-white font-semibold mb-2">Full Experience</h3>
            <p className="text-gray-400 text-sm">
              Complete RPG system with ranks, stats, gear, and all features
            </p>
          </button>
          
          <button
            onClick={() => setPreferences({ ...preferences, simpleMode: true })}
            className={`w-full p-6 rounded-xl border-2 transition-all ${
              preferences.simpleMode 
                ? 'border-purple-500 bg-purple-500/10' 
                : 'border-slate-700 hover:border-slate-600'
            }`}
          >
            <div className="text-3xl mb-2">🎯</div>
            <h3 className="text-white font-semibold mb-2">Simple Mode</h3>
            <p className="text-gray-400 text-sm">
              Focus on completing quests without complex RPG mechanics
            </p>
          </button>
        </div>
      ),
    },
    {
      title: "Penalty Settings",
      description: "How should missed quests affect you?",
      content: (
        <div className="space-y-4">
          {[
            { value: 'forgiving', label: 'Forgiving', desc: 'No penalties, just tracking' },
            { value: 'moderate', label: 'Moderate', desc: 'Lose streak but keep progress' },
            { value: 'hardcore', label: 'Hardcore', desc: 'Full penalties for failures' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setPreferences({ ...preferences, penaltySeverity: option.value })}
              className={`w-full p-4 rounded-xl border-2 transition-all ${
                preferences.penaltySeverity === option.value
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <h3 className="text-white font-semibold">{option.label}</h3>
              <p className="text-gray-400 text-sm">{option.desc}</p>
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "Notification Preferences",
      description: "How should we remind you?",
      content: (
        <div className="space-y-4">
          {[
            { value: 'adaptive', label: 'Adaptive', desc: 'Smart timing based on your habits' },
            { value: 'aggressive', label: 'Frequent', desc: 'Regular reminders to stay on track' },
            { value: 'minimal', label: 'Minimal', desc: 'Only important notifications' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setPreferences({ ...preferences, notificationPreference: option.value })}
              className={`w-full p-4 rounded-xl border-2 transition-all ${
                preferences.notificationPreference === option.value
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <h3 className="text-white font-semibold">{option.label}</h3>
              <p className="text-gray-400 text-sm">{option.desc}</p>
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "Ready to Begin",
      description: "Your adventure awaits",
      content: (
        <div className="text-center">
          <div className="text-6xl mb-4">🚀</div>
          <p className="text-gray-400 mb-6">
            You're all set! Your preferences have been saved.
            You can always change these in settings later.
          </p>
          <div className="bg-slate-800 p-4 rounded-xl mb-6">
            <div className="text-sm text-gray-400 mb-2">Your Setup:</div>
            <div className="text-white">
              {preferences.simpleMode ? 'Simple Mode' : 'Full Experience'} • {preferences.penaltySeverity} penalties • {preferences.notificationPreference} notifications
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-void flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-400">Step {step} of {steps.length}</span>
            <button
              onClick={() => setStep(Math.max(1, step - 1))}
              className="text-sm text-gray-400 hover:text-white"
            >
              Back
            </button>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div 
              className="bg-purple-500 h-2 rounded-full transition-all"
              style={{ width: `${(step / steps.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-surface border border-border-subtle rounded-xl p-8">
          <h2 className="text-2xl font-bold text-white mb-2">{steps[step - 1].title}</h2>
          <p className="text-gray-400 mb-6">{steps[step - 1].description}</p>
          
          {steps[step - 1].content}

          {step < steps.length ? (
            <button
              onClick={() => setStep(step + 1)}
              className="w-full mt-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="w-full mt-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all"
            >
              Start Your Journey
            </button>
          )}
        </div>
      </div>
    </div>
  );
}