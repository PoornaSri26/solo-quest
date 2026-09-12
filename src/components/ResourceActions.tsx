import { useState } from 'react';
import { Coins, Heart, Clock, Zap, Plus, AlertTriangle } from 'lucide-react';
import { ResourceType, ResourcePurpose } from '../shared/types';
import { useStore } from '../store/useStore';

export default function ResourceActions() {
  const { token, stats } = useStore();
  const [selectedResource, setSelectedResource] = useState<ResourceType | null>(null);
  const [selectedPurpose, setSelectedPurpose] = useState<ResourcePurpose | null>(null);
  const [amount, setAmount] = useState<number>(50);

  const resourceConfig = {
    GOLD: {
      icon: Coins,
      label: 'Gold',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400/10',
      borderColor: 'border-yellow-400',
      available: stats?.gold || 0,
    },
    HP: {
      icon: Heart,
      label: 'HP',
      color: 'text-red-400',
      bgColor: 'bg-red-400/10',
      borderColor: 'border-red-400',
      available: stats?.hp || 0,
    },
    TIME: {
      icon: Clock,
      label: 'Time',
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
      borderColor: 'border-blue-400',
      available: 100, // Simplified time resource
    },
  };

  const purposeConfig = {
    SHOP_PURCHASE: {
      label: 'Shop Purchase',
      description: 'Buy items from the shop',
      allowedResources: ['GOLD'],
    },
    QUEST_BOOST: {
      label: 'Quest Boost',
      description: 'Boost quest rewards with resources',
      allowedResources: ['GOLD', 'HP'],
    },
    TIME_EXTENSION: {
      label: 'Time Extension',
      description: 'Extend quest deadline',
      allowedResources: ['GOLD', 'TIME'],
    },
    DIFFICULTY_MODIFIER: {
      label: 'Difficulty Modifier',
      description: 'Adjust quest difficulty for rewards',
      allowedResources: ['HP'],
    },
  };

  const handleUseResource = async () => {
    if (!selectedResource || !selectedPurpose || !amount) return;

    try {
      const res = await fetch('http://localhost:5000/api/resources/use', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resourceType: selectedResource,
          amount,
          purpose: selectedPurpose,
        }),
      });

      if (res.ok) {
        alert('Resource used successfully!');
        setSelectedResource(null);
        setSelectedPurpose(null);
        setAmount(50);
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to use resource');
      }
    } catch (error) {
      console.error('Failed to use resource:', error);
      alert('Failed to use resource');
    }
  };

  const getPurposesForResource = (resourceType: ResourceType) => {
    return Object.entries(purposeConfig).filter(([_, config]) =>
      config.allowedResources.includes(resourceType)
    );
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-violet-gate">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Zap className="w-6 h-6 text-violet-gate" />
        Resource Management
      </h2>

      <div className="space-y-6">
        {/* Resource Selection */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Select Resource</h3>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(resourceConfig).map(([type, config]) => {
              const Icon = config.icon;
              return (
                <button
                  key={type}
                  onClick={() => setSelectedResource(type as ResourceType)}
                  className={`p-4 rounded-lg border-2 transition ${
                    selectedResource === type
                      ? `${config.bgColor} ${config.borderColor} ${config.color}`
                      : 'bg-gray-700 border-gray-600 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  <Icon className="w-6 h-6 mx-auto mb-2" />
                  <div className="text-sm font-semibold">{config.label}</div>
                  <div className="text-xs opacity-75">{config.available} available</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Purpose Selection */}
        {selectedResource && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Select Purpose</h3>
            <div className="space-y-2">
              {getPurposesForResource(selectedResource).map(([purpose, config]) => (
                <button
                  key={purpose}
                  onClick={() => setSelectedPurpose(purpose as ResourcePurpose)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition ${
                    selectedPurpose === purpose
                      ? 'bg-violet-gate/20 border-violet-gate text-white'
                      : 'bg-gray-700 border-gray-600 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  <div className="font-semibold">{config.label}</div>
                  <div className="text-sm opacity-75">{config.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Amount Input */}
        {selectedResource && selectedPurpose && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Amount</h3>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="10"
                max={resourceConfig[selectedResource].available}
                value={amount}
                onChange={(e) => setAmount(parseInt(e.target.value))}
                className="flex-1"
              />
              <input
                type="number"
                min="10"
                max={resourceConfig[selectedResource].available}
                value={amount}
                onChange={(e) => setAmount(parseInt(e.target.value))}
                className="w-20 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
              />
            </div>
            {amount > resourceConfig[selectedResource].available && (
              <div className="flex items-center gap-2 text-red-400 text-sm mt-2">
                <AlertTriangle className="w-4 h-4" />
                <span>Insufficient resources</span>
              </div>
            )}
          </div>
        )}

        {/* Confirm Button */}
        {selectedResource && selectedPurpose && amount <= resourceConfig[selectedResource].available && (
          <button
            onClick={handleUseResource}
            className="w-full bg-violet-gate hover:bg-violet-gate/80 text-white py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Use {amount} {resourceConfig[selectedResource].label}
          </button>
        )}
      </div>
    </div>
  );
}
