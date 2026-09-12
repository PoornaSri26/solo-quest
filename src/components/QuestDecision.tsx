import { useState } from 'react';
import { AlertTriangle, Scale, Lightbulb, X } from 'lucide-react';
import { DecisionType } from '../shared/types';

interface QuestDecisionProps {
  questId: string;
  onDecision: (decisionType: DecisionType, choice: string) => void;
  onCancel: () => void;
}

export default function QuestDecision({ questId, onDecision, onCancel }: QuestDecisionProps) {
  const [selectedDecision, setSelectedDecision] = useState<DecisionType | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<string>('');

  const decisionOptions = {
    SCARCITY: {
      icon: AlertTriangle,
      title: 'Time Pressure',
      description: 'Choose wisely - this opportunity is limited',
      choices: [
        { value: 'SPEED', label: 'Rush (50% bonus, higher risk)', description: 'Complete quickly for bonus rewards' },
        { value: 'QUALITY', label: 'Take Time (no bonus, safer)', description: 'Focus on quality over speed' },
      ],
    },
    TRADEOFF: {
      icon: Scale,
      title: 'Resource Tradeoff',
      description: 'Sacrifice one resource to gain another',
      choices: [
        { value: 'GOLD_OVER_XP', label: 'Gold Focus (+50% gold, -25% XP)', description: 'Prioritize gold rewards' },
        { value: 'XP_OVER_GOLD', label: 'XP Focus (+50% XP, -25% gold)', description: 'Prioritize experience gains' },
        { value: 'BALANCED', label: 'Balanced (no change)', description: 'Keep rewards as-is' },
      ],
    },
    PREDICTION: {
      icon: Lightbulb,
      title: 'Outcome Prediction',
      description: 'Predict your completion quality',
      choices: [
        { value: 'PERFECT', label: 'Perfect Completion (80%+ score)', description: 'Aim for excellence' },
        { value: 'GOOD', label: 'Good Completion (60-80% score)', description: 'Solid performance' },
        { value: 'POOR', label: 'Basic Completion (40-60% score)', description: 'Minimum requirements' },
      ],
    },
  };

  const handleConfirm = () => {
    if (selectedDecision && selectedChoice) {
      onDecision(selectedDecision, selectedChoice);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full p-6 border border-violet-gate">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Strategic Decision</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {!selectedDecision ? (
          <div className="space-y-4">
            <p className="text-gray-400 mb-4">Choose a decision type for this quest:</p>
            {Object.entries(decisionOptions).map(([type, config]) => {
              const Icon = config.icon;
              return (
                <button
                  key={type}
                  onClick={() => setSelectedDecision(type as DecisionType)}
                  className="w-full bg-gray-700 hover:bg-gray-600 p-4 rounded-lg text-left transition border border-gray-600 hover:border-violet-gate"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-6 h-6 text-violet-gate" />
                    <div>
                      <h3 className="font-semibold text-white">{config.title}</h3>
                      <p className="text-sm text-gray-400">{config.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div>
            <button
              onClick={() => setSelectedDecision(null)}
              className="text-sm text-gray-400 hover:text-white mb-4 transition"
            >
              ← Back to decision types
            </button>

            <div className="mb-4">
              <h3 className="text-lg font-semibold text-white mb-2">
                {decisionOptions[selectedDecision].title}
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                {decisionOptions[selectedDecision].description}
              </p>
            </div>

            <div className="space-y-3">
              {decisionOptions[selectedDecision].choices.map((choice) => (
                <button
                  key={choice.value}
                  onClick={() => setSelectedChoice(choice.value)}
                  className={`w-full p-4 rounded-lg text-left transition border-2 ${
                    selectedChoice === choice.value
                      ? 'bg-violet-gate/20 border-violet-gate'
                      : 'bg-gray-700 border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <div className="font-semibold text-white mb-1">{choice.label}</div>
                  <div className="text-sm text-gray-400">{choice.description}</div>
                </button>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={onCancel}
                className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-3 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selectedChoice}
                className="flex-1 bg-violet-gate hover:bg-violet-gate/80 text-white py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Decision
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
