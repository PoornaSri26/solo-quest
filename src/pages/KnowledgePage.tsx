import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, TrendingUp, Route, Lightbulb, Award, Plus, Edit, Trash2 } from 'lucide-react';
import { KnowledgeProgress } from '../shared/types';
import { useStore } from '../store/useStore';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function KnowledgePage() {
  const navigate = useNavigate();
  const { token } = useStore();
  const [knowledge, setKnowledge] = useState<KnowledgeProgress | null>(null);
  const [loading, setLoading] = useState(true);

  const pageRef = useRef<HTMLDivElement>(null);
  const sectionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) {
      navigate('/auth');
      return;
    }

    const fetchKnowledge = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/knowledge', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setKnowledge(data);
        }
      } catch (error) {
        console.error('Failed to fetch knowledge progress:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchKnowledge();
  }, [token, navigate]);

  // GSAP animations
  useEffect(() => {
    if (!loading && knowledge) {
      gsap.fromTo(pageRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }
      );

      gsap.fromTo(sectionsRef.current?.children || [],
        { y: 50, opacity: 0, rotationX: 10 },
        {
          y: 0, opacity: 1, rotationX: 0,
          duration: 0.6, stagger: 0.1,
          scrollTrigger: {
            trigger: sectionsRef.current,
            start: "top 80%",
          }
        }
      );
    }

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, [loading, knowledge]);

  const handleUpdate = async (field: string, value: number) => {
    try {
      const res = await fetch('http://localhost:5000/api/knowledge', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [field]: value }),
      });

      if (res.ok) {
        const data = await res.json();
        setKnowledge(data.knowledge);
      }
    } catch (error) {
      console.error('Failed to update knowledge:', error);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset your knowledge progress?')) return;

    try {
      const res = await fetch('http://localhost:5000/api/knowledge', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        alert('Knowledge progress reset successfully!');
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to reset knowledge:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center">
        <div className="text-xl">Loading knowledge progress...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-4 md:p-8">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
      </div>

      <div ref={pageRef} className="max-w-4xl mx-auto relative z-10">
        <div className="flex items-center gap-3 mb-8">
          <Brain className="w-10 h-10 text-purple-400" />
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 to-purple-200 bg-clip-text text-transparent">
            Knowledge Progression
          </h1>
        </div>

        <div className="mb-6">
          <p className="text-gray-300">
            Track your understanding of quest patterns, optimal routes, and efficiency improvements.
            Knowledge progression rewards strategic play over raw task volume.
          </p>
        </div>

        {knowledge && (
          <div ref={sectionsRef} className="space-y-6">
            {/* Quest Patterns Learned */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-xl p-6 border border-purple-500/50 shadow-lg shadow-purple-500/20">
              <div className="flex items-center gap-3 mb-4">
                <Lightbulb className="w-6 h-6 text-yellow-400" />
                <h2 className="text-2xl font-bold text-white">Quest Patterns Learned</h2>
              </div>
              <div className="text-5xl font-display text-yellow-400 mb-4 bg-slate-700/50 rounded-lg p-4 text-center">
                {knowledge.questPatternsLearned}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdate('questPatternsLearned', knowledge.questPatternsLearned + 1)}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-400 hover:from-green-500 hover:to-green-300 px-4 py-2 rounded-lg font-semibold transition-all duration-300"
                >
                  +1 Pattern
                </button>
                <button
                  onClick={() => handleUpdate('questPatternsLearned', Math.max(0, knowledge.questPatternsLearned - 1))}
                  className="flex-1 bg-gradient-to-r from-red-600 to-red-400 hover:from-red-500 hover:to-red-300 px-4 py-2 rounded-lg font-semibold transition-all duration-300"
                >
                  -1 Pattern
                </button>
              </div>
            </div>

            {/* Optimal Routes Discovered */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-xl p-6 border border-blue-500/50 shadow-lg shadow-blue-500/20">
              <div className="flex items-center gap-3 mb-4">
                <Route className="w-6 h-6 text-blue-400" />
                <h2 className="text-2xl font-bold text-white">Optimal Routes Discovered</h2>
              </div>
              <div className="text-5xl font-display text-blue-400 mb-4 bg-slate-700/50 rounded-lg p-4 text-center">
                {knowledge.optimalRoutesDiscovered}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdate('optimalRoutesDiscovered', knowledge.optimalRoutesDiscovered + 1)}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-400 hover:from-green-500 hover:to-green-300 px-4 py-2 rounded-lg font-semibold transition-all duration-300"
                >
                  +1 Route
                </button>
                <button
                  onClick={() => handleUpdate('optimalRoutesDiscovered', Math.max(0, knowledge.optimalRoutesDiscovered - 1))}
                  className="flex-1 bg-gradient-to-r from-red-600 to-red-400 hover:from-red-500 hover:to-red-300 px-4 py-2 rounded-lg font-semibold transition-all duration-300"
                >
                  -1 Route
                </button>
              </div>
            </div>

            {/* Shortcuts Unlocked */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-xl p-6 border border-green-500/50 shadow-lg shadow-green-500/20">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="w-6 h-6 text-green-400" />
                <h2 className="text-2xl font-bold text-white">Shortcuts Unlocked</h2>
              </div>
              <div className="text-5xl font-display text-green-400 mb-4 bg-slate-700/50 rounded-lg p-4 text-center">
                {knowledge.shortcutsUnlocked}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdate('shortcutsUnlocked', knowledge.shortcutsUnlocked + 1)}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-400 hover:from-green-500 hover:to-green-300 px-4 py-2 rounded-lg font-semibold transition-all duration-300"
                >
                  +1 Shortcut
                </button>
                <button
                  onClick={() => handleUpdate('shortcutsUnlocked', Math.max(0, knowledge.shortcutsUnlocked - 1))}
                  className="flex-1 bg-gradient-to-r from-red-600 to-red-400 hover:from-red-500 hover:to-red-300 px-4 py-2 rounded-lg font-semibold transition-all duration-300"
                >
                  -1 Shortcut
                </button>
              </div>
            </div>

            {/* Efficiency Rating */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-xl p-6 border border-purple-500/50 shadow-lg shadow-purple-500/20">
              <div className="flex items-center gap-3 mb-4">
                <Award className="w-6 h-6 text-purple-400" />
                <h2 className="text-2xl font-bold text-white">Efficiency Rating</h2>
              </div>
              <div className="text-5xl font-display text-purple-400 mb-4 bg-slate-700/50 rounded-lg p-4 text-center">
                {knowledge.efficiencyRating}%
              </div>
              <div className="w-full bg-slate-700 rounded-full h-4 mb-4">
                <div
                  className="bg-gradient-to-r from-purple-400 to-purple-600 h-4 rounded-full transition-all"
                  style={{ width: `${knowledge.efficiencyRating}%` }}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdate('efficiencyRating', Math.min(100, knowledge.efficiencyRating + 5))}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-400 hover:from-green-500 hover:to-green-300 px-4 py-2 rounded-lg font-semibold transition-all duration-300"
                >
                  +5% Rating
                </button>
                <button
                  onClick={() => handleUpdate('efficiencyRating', Math.max(0, knowledge.efficiencyRating - 5))}
                  className="flex-1 bg-gradient-to-r from-red-600 to-red-400 hover:from-red-500 hover:to-red-300 px-4 py-2 rounded-lg font-semibold transition-all duration-300"
                >
                  -5% Rating
                </button>
              </div>
            </div>

            {/* Reset Button */}
            <div className="text-center">
              <button
                onClick={handleReset}
                className="bg-gradient-to-r from-red-600 to-red-400 hover:from-red-500 hover:to-red-300 px-6 py-3 rounded-lg font-semibold transition-all duration-300"
              >
                Reset All Progress
              </button>
            </div>

            {/* Last Updated */}
            <div className="text-center text-gray-400 text-sm bg-slate-800/50 backdrop-blur-sm rounded-lg p-3">
              Last updated: {new Date(knowledge.lastUpdated).toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}