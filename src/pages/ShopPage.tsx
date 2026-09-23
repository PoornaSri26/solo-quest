import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import RadialRevealButton from '../components/RadialRevealButton';

const shopButtonFont = {
  fontFamily: '"Rajdhani", sans-serif',
  fontWeight: 600,
  fontSize: 13,
  lineHeight: '1.2em',
  letterSpacing: '0.02em',
  textAlign: 'center' as const,
};

const ShopPage: React.FC = () => {
  const {
    shopItems,
    userInventory,
    stats,
    fetchShopItems,
    fetchUserInventory,
    purchaseItem,
    toggleEquip,
  } = useStore();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await Promise.all([
          fetchShopItems(),
          fetchUserInventory(),
        ]);
      } catch (err) {
        setError('Failed to load shop data. Please try again.');
        console.error('Shop loading error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [fetchShopItems, fetchUserInventory]);

  const isOwned = (itemId: string) => {
    return userInventory.some((inv) => inv.itemId === itemId || inv.item?.id === itemId);
  };

  const handlePurchase = async (itemId: string) => {
    if (purchasingId) return; // Prevent double-clicks
    
    try {
      setPurchasingId(itemId);
      await purchaseItem(itemId);
    } catch (err: any) {
      setError(err.message || 'Purchase failed. Please try again.');
    } finally {
      setPurchasingId(null);
    }
  };

  const handleEquip = async (inventoryId: string) => {
    try {
      await toggleEquip(inventoryId);
    } catch (err: any) {
      setError('Failed to equip item. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6" role="status" aria-live="polite">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gold-primary border-t-transparent" aria-hidden="true"></div>
          <span className="ml-3 text-text-secondary">Loading shop...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-display text-text-primary mb-2">Shop</h1>
        <p className="text-text-secondary">
          Spend your hard-earned gold on cosmetic items to customize your Hunter.
        </p>
      </header>

      {error && (
        <div 
          className="mb-6 p-4 bg-crimson/10 border border-crimson/30 rounded-sm text-crimson text-sm"
          role="alert"
        >
          {error}
          <button 
            onClick={() => setError(null)}
            className="ml-3 underline hover:text-crimson/80"
            aria-label="Dismiss error"
          >
            Dismiss
          </button>
        </div>
      )}

      {stats && (
        <div className="mb-6 p-3 bg-raised border border-border-subtle rounded-sm inline-block">
          <span className="text-xs text-text-secondary mr-2">Your Gold:</span>
          <span className="font-data text-gold-primary text-lg" aria-label={`Current gold: ${stats.gold}`}>
            {stats.gold}g
          </span>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        {/* Shop Items */}
        <div className="flex-1">
          <h2 className="text-lg font-display mb-4 text-text-primary">Shop Items</h2>
          {shopItems.length === 0 ? (
            <p className="text-text-muted text-center py-8 text-sm" role="status">
              No shop items available at the moment.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2" role="list" aria-label="Shop items">
              {shopItems.map((item) => (
                <article 
                  key={item.id} 
                  className="bg-raised border border-border-subtle rounded-md p-4"
                  role="listitem"
                >
                  <h3 className="font-medium text-text-primary mb-2">{item.name}</h3>
                  <p className="text-sm text-text-secondary mb-2">{item.description}</p>
                  <span className="text-xs text-text-muted mb-3 block">{item.category}</span>
                  <div className="flex items-center justify-between">
                    <span className="font-data text-gold-primary" aria-label={`Price: ${item.costGold} gold`}>
                      {item.costGold}g
                    </span>
                    {isOwned(item.id) ? (
                      <span 
                        className="px-3 py-1 text-xs bg-green-clear/20 text-green-clear border border-green-clear rounded-sm"
                        aria-label={`${item.name} is owned`}
                      >
                        Owned
                      </span>
                    ) : (
                      <RadialRevealButton
                        label={purchasingId === item.id ? 'Purchasing...' : 'Buy'}
                        onClick={() => handlePurchase(item.id)}
                        disabled={(stats?.gold ?? 0) < item.costGold || purchasingId === item.id}
                        ariaLabel={`Purchase ${item.name} for ${item.costGold} gold`}
                        font={shopButtonFont}
                        padding="4px 12px"
                        rounded={4}
                        showText
                        colors={{
                          fill: 'var(--gold-primary)',
                          textColor: 'var(--bg-void)',
                          hoverFill: 'var(--violet-gate)',
                          hoverTextColor: '#ffffff',
                        }}
                        border={{ borderWidth: 0 }}
                      />
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Inventory */}
        <aside className="w-full md:w-64">
          <h2 className="text-lg font-display mb-4 text-text-primary">Inventory</h2>
          <div 
            className="bg-raised border border-border-subtle rounded-md p-4 max-h-96 overflow-y-auto"
            role="region"
            aria-label="Your inventory"
          >
            {userInventory.length > 0 ? (
              <ul className="space-y-3" role="list">
                {userInventory.map((inv) => (
                  <li key={inv.id} className="flex items-start gap-3 p-3 bg-surface rounded-sm">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-raised rounded-sm flex items-center justify-center border border-border-subtle" aria-hidden="true">
                        <span className="text-text-secondary">🎁</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary text-sm">{inv.item?.name || 'Item'}</p>
                      <p className="text-xs text-text-secondary">
                        {inv.equipped ? '(Equipped)' : '(Unequipped)'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleEquip(inv.id)}
                      aria-label={`${inv.equipped ? 'Unequip' : 'Equip'} ${inv.item?.name || 'item'}`}
                      className={inv.equipped
                        ? 'px-2 py-0.5 text-xs bg-green-clear/20 border border-green-clear text-green-clear rounded-sm transition-fast'
                        : 'px-2 py-0.5 text-xs border border-border-subtle text-text-secondary hover:bg-raised rounded-sm transition-fast'}
                    >
                      {inv.equipped ? 'Unequip' : 'Equip'}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-text-muted py-8 text-sm" role="status">
                Your inventory is empty. Purchase items from the shop!
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ShopPage;