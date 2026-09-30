import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Check, CreditCard, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { VoidDrift, TypeSequence } from '../components/originkit/ui/ambient-void';

interface Plan {
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
}

const PLANS: Record<string, Plan> = {
  hunter_pass: {
    name: 'Hunter Pass',
    description: 'Exclusive cosmetics, extra raid slots, streak freeze tokens',
    priceMonthly: 4.99,
    priceYearly: 39.99,
    features: [
      'Exclusive avatar and gear cosmetics',
      'Seasonal Rank battle-pass track',
      'Extra Gate/Raid slots',
      'Streak freeze tokens',
      'Advanced stats and skill radar chart',
      'Priority AI quest generation',
    ],
  },
  guild: {
    name: 'Guild Plan',
    description: 'Team features for groups, gyms, and study circles',
    priceMonthly: 9.99,
    priceYearly: 99.99,
    features: [
      'Shared leaderboards',
      'Cross-user gate raids',
      'Guild quest boards',
      'Team progress tracking',
      'Admin dashboard',
      'Priority support',
    ],
  },
};

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const { token } = useStore();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      navigate('/auth');
      return;
    }

    fetchCurrentSubscription();
  }, [token, navigate]);

  const fetchCurrentSubscription = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/subscription', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentPlan(data.plan);
        setSubscriptionStatus(data.status);
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
    }
  };

  const handleSubscribe = async (plan: string) => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/subscription/checkout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan,
          billingCycle,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        } else {
          alert('Checkout URL not returned from server');
        }
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      alert('Failed to create checkout session');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) return;

    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/subscription/cancel', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        alert('Subscription canceled successfully');
        fetchCurrentSubscription();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Cancel subscription error:', error);
      alert('Failed to cancel subscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-4 md:p-8">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
        <VoidDrift baseColor="#C9A84C" accentColor="#a594f5" density={125} linkDistance={90} speed={0.45} dotSize={1.5} />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <Crown className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-200 bg-clip-text text-transparent mb-4">
            Choose Your Path
          </h1>
          <p className="font-system text-text-system text-xs mb-3" aria-label="System: The System offers contracts. Choose freely.">
            <TypeSequence text="[System: The System offers contracts. Choose freely.]" />
          </p>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            Unlock powerful features to enhance your productivity journey
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-slate-800/80 backdrop-blur-sm rounded-full p-1 flex gap-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-full font-semibold transition-all duration-300 ${
                billingCycle === 'monthly'
                  ? 'bg-gradient-to-r from-purple-600 to-purple-400 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-full font-semibold transition-all duration-300 ${
                billingCycle === 'yearly'
                  ? 'bg-gradient-to-r from-purple-600 to-purple-400 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Yearly <span className="text-xs text-green-400 ml-1">Save 17%</span>
            </button>
          </div>
        </div>

        {/* Current Subscription Status */}
        {currentPlan && currentPlan !== 'free' && (
          <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-6 mb-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Crown className="w-6 h-6 text-green-400" />
              <h3 className="text-xl font-bold text-green-400">Current Plan: {PLANS[currentPlan]?.name}</h3>
            </div>
            <p className="text-gray-300 mb-4">Status: {subscriptionStatus}</p>
            <button
              onClick={handleCancelSubscription}
              disabled={loading}
              className="bg-red-600 hover:bg-red-500 px-6 py-2 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Cancel Subscription'}
            </button>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {Object.entries(PLANS).map(([planKey, plan]) => {
            const price = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
            const isCurrentPlan = currentPlan === planKey;

            return (
              <div
                key={planKey}
                className={`bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-xl p-8 border-2 transition-all duration-300 transform hover:scale-105 ${
                  isCurrentPlan
                    ? 'border-yellow-500 shadow-lg shadow-yellow-500/20'
                    : 'border-purple-500/50 hover:border-purple-500'
                }`}
              >
                {isCurrentPlan && (
                  <div className="bg-yellow-500/20 text-yellow-400 text-sm font-semibold px-3 py-1 rounded-full inline-block mb-4">
                    Current Plan
                  </div>
                )}

                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-gray-400 mb-6">{plan.description}</p>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-display font-bold text-white">${price}</span>
                    <span className="text-gray-400">/{billingCycle}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(planKey)}
                  disabled={loading || isCurrentPlan}
                  className={`w-full py-3 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                    isCurrentPlan
                      ? 'bg-slate-700 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-purple-400 hover:from-purple-500 hover:to-purple-300'
                  }`}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isCurrentPlan ? (
                    'Current Plan'
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      Subscribe
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Enterprise CTA */}
        <div className="mt-12 text-center">
          <div className="bg-gradient-to-r from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-xl p-8 border border-blue-500/50 inline-block">
            <h3 className="text-2xl font-bold text-white mb-2">Enterprise Solutions</h3>
            <p className="text-gray-300 mb-4">
              Custom integrations, white-label solutions, and dedicated support for teams
            </p>
            <button
              onClick={() => navigate('/contact')}
              className="bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-500 hover:to-blue-300 px-6 py-2 rounded-lg font-semibold transition-all duration-300"
            >
              Contact Sales
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}