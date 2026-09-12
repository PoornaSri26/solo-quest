import React, { useEffect, useState } from 'react';
import { FeedbackIntensity } from '../shared/types';

interface QuestFeedbackProps {
  intensity: FeedbackIntensity['level'];
  onComplete?: () => void;
}

/**
 * QuestFeedback component
 * Creates satisfying "game juice" moments for quest completion
 * Based on game design principles of feedback and player satisfaction
 */
export default function QuestFeedback({ intensity, onComplete }: QuestFeedbackProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [animationClass, setAnimationClass] = useState('');

  useEffect(() => {
    // Set animation based on feedback intensity
    const intensityConfig = {
      minimal: { duration: 800, animation: 'fade-slide-up' },
      standard: { duration: 1200, animation: 'bounce-pulse' },
      enhanced: { duration: 1800, animation: 'epic-scale' },
      epic: { duration: 2500, animation: 'legendary-impact' },
    };

    const config = intensityConfig[intensity];
    setAnimationClass(config.animation);

    // Auto-hide after animation completes
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, config.duration);

    return () => clearTimeout(timer);
  }, [intensity, onComplete]);

  if (!isVisible) return null;

  const intensityStyles = {
    minimal: 'bg-gradient-to-r from-gray-600 to-gray-500 text-gray-100',
    standard: 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white',
    enhanced: 'bg-gradient-to-r from-purple-600 to-pink-500 text-white',
    epic: 'bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 text-white',
  };

  const intensityMessages = {
    minimal: 'Quest Complete',
    standard: 'Quest Complete!',
    enhanced: 'Excellent Work!',
    epic: 'LEGENDARY ACHIEVEMENT!',
  };

  return (
    <div className={`fixed inset-0 flex items-center justify-center pointer-events-none z-50`}>
      <div className={`absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300`} />
      
      <div className={`relative ${animationClass} ${intensityStyles[intensity]} 
        px-12 py-8 rounded-2xl shadow-2xl text-center transform`}>
        <div className="text-4xl mb-2">
          {intensity === 'epic' && '🏆'}
          {intensity === 'enhanced' && '⭐'}
          {intensity === 'standard' && '✨'}
          {intensity === 'minimal' && '✓'}
        </div>
        
        <h2 className="text-3xl font-bold mb-2">
          {intensityMessages[intensity]}
        </h2>
        
        {intensity !== 'minimal' && (
          <p className="text-lg opacity-90">
            {intensity === 'epic' && 'Outstanding performance!'}
            {intensity === 'enhanced' && 'Great job, Hunter!'}
            {intensity === 'standard' && 'Well done!'}
          </p>
        )}
        
        {/* Particle effects for higher intensity */}
        {(intensity === 'enhanced' || intensity === 'epic') && (
          <div className="absolute inset-0 overflow-hidden rounded-2xl">
            <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white rounded-full animate-ping" />
            <div className="absolute top-1/3 right-1/4 w-2 h-2 bg-white rounded-full animate-ping" style={{ animationDelay: '0.2s' }} />
            <div className="absolute bottom-1/4 left-1/3 w-2 h-2 bg-white rounded-full animate-ping" style={{ animationDelay: '0.4s' }} />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Hook to calculate feedback intensity based on quest completion context
 */
export function useFeedbackIntensity(
  questDifficulty: number,
  timeTaken: number,
  expectedTime: number,
  playerLevel: number
): FeedbackIntensity['level'] {
  const timeRatio = timeTaken / expectedTime;
  const difficultyRatio = questDifficulty / playerLevel;

  // Epic feedback: Quick completion of challenging quest
  if (timeRatio < 0.5 && difficultyRatio > 1.2) return 'epic';
  
  // Enhanced feedback: Good time on appropriate difficulty
  if (timeRatio < 0.8 && difficultyRatio >= 0.8) return 'enhanced';
  
  // Standard feedback: Normal completion
  if (timeRatio <= 1.5) return 'standard';
  
  // Minimal feedback: Slow completion
  return 'minimal';
}