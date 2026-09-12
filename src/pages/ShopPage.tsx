import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';

const ShopPage: React.FC = () => {
  const {
    shopItems,
    userInventory,
    stats,
    fetchShopItems,
    purchaseItem,
    toggleEquip,
  } = useStore();

  useEffect(() => {
    fetchShopItems();
    fetchUserInventory();
  }, [fetchShopItems, fetchUserInventory]);

  const isOwned = (itemId: string) => {
    return userInventory.some((inv) => inv.itemId === itemId || inv.item?.id === itemId);
  };

  const handlePurchase = async (itemId: string) => {
    try {
      await purchaseItem(itemId);
    } catch (err: any) {
      alert(err.message || 'Purchase failed');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-display text-text-primary mb-6">Shop</h1>
      <p className="mb-6 text-text-secondary">
        Spend your hard-earned gold on cosmetic items to customize your Hunter.
      </p>

      {stats && (
        <div className="mb-6 p-3 bg-raised border border-border-subtle rounded-sm inline-block">
          <span className="text-xs text-text-secondary mr-2">Your Gold:</span>
          <span className="font-data text-gold-primary text-lg">{stats.gold}g</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        {/* Shop Items */}
        <div className="flex-1">
          <h2 className="text-lg font-display mb-4 text-text-primary">Shop Items</h2>
          {shopItems.length === 0 ? (
            <p className="text-text-muted text-center py-8 text-sm">Loading shop items...</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {shopItems.map((item) => (
                <div key={item.id} className="bg-raised border border-border-subtle rounded-md p-4">
                  <h3 className="font-medium text-text-primary mb-2">{item.name}</h3>
                  <p className="text-sm text-text-secondary mb-2">{item.description}</p>
                  <span className="text-xs text-text-muted mb-3 block">{item.category}</span>
                  <div className="flex items-center justify-between">
                    <span className="font-data text-gold-primary">
                      {item.costGold}g
                    </span>
                    {isOwned(item.id) ? (
                      <span className="px-3 py-1 text-xs bg-green-clear/20 text-green-clear border border-green-clear rounded-sm">
                        Owned
                      </span>
                    ) : (
                      <button
                        onClick={() => handlePurchase(item.id)}
                        disabled={(stats?.gold ?? 0) < item.costGold}
                        className={`px-3 py-1 text-xs rounded-sm transition-fast ${
                          (stats?.gold ?? 0) < item.costGold
                            ? 'bg-raised text-text-muted cursor-not-allowed border border-border-subtle'
                            : 'bg-gold-primary text-void hover:bg-gold-primary/90'
                        }`}
                      >
                        Buy
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inventory */}
        <div className="w-full md:w-64">
          <h2 className="text-lg font-display mb-4 text-text-primary">Inventory</h2>
          <div className="bg-raised border border-border-subtle rounded-md p-4 max-h-96 overflow-y-auto">
            {userInventory.length > 0 ? (
              <div className="space-y-3">
                {userInventory.map((inv) => (
                  <div key={inv.id} className="flex items-start gap-3 p-3 bg-surface rounded-sm">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-raised rounded-sm flex items-center justify-center border border-border-subtle">
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
                      onClick={() => toggleEquip(inv.id)}
                      className={inv.equipped
                        ? 'px-2 py-0.5 text-xs bg-green-clear/20 border border-green-clear text-green-clear rounded-sm transition-fast'
                        : 'px-2 py-0.5 text-xs border border-border-subtle text-text-secondary hover:bg-raised rounded-sm transition-fast'}
                    >
                      {inv.equipped ? 'Unequip' : 'Equip'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-text-muted py-8 text-sm">
                Your inventory is empty. Purchase items from the shop!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopPage;