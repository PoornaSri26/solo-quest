import { useState, useCallback } from 'react';
import { useStore } from '../store/useStore';

interface Recipe {
  id: number;
  name: string;
  materials: { itemName: string; qty: number }[];
  resultItemName: string;
}

const recipes: Recipe[] = [
  {
    id: 1,
    name: 'Iron Sword',
    materials: [
      { itemName: 'Iron Ore', qty: 5 },
      { itemName: 'Gemstone', qty: 1 },
    ],
    resultItemName: 'Iron Sword',
  },
  {
    id: 2,
    name: 'Flame Amulet',
    materials: [
      { itemName: 'Essence of Flame', qty: 3 },
      { itemName: 'Herbal Essence', qty: 2 },
    ],
    resultItemName: 'Flame Amulet',
  },
  {
    id: 3,
    name: 'Mystic Ring',
    materials: [
      { itemName: 'Gemstone', qty: 2 },
      { itemName: 'Essence of Flame', qty: 1 },
      { itemName: 'Herbal Essence', qty: 1 },
    ],
    resultItemName: 'Mystic Ring',
  },
  {
    id: 4,
    name: 'Shadow Cloak',
    materials: [
      { itemName: 'Dark Essence', qty: 3 },
      { itemName: 'Herbal Essence', qty: 2 },
    ],
    resultItemName: 'Shadow Cloak',
  },
  {
    id: 5,
    name: 'Thunder Hammer',
    materials: [
      { itemName: 'Iron Ore', qty: 8 },
      { itemName: 'Essence of Flame', qty: 2 },
      { itemName: 'Gemstone', qty: 2 },
    ],
    resultItemName: 'Thunder Hammer',
  },
  {
    id: 6,
    name: 'Elixir of Life',
    materials: [
      { itemName: 'Herbal Essence', qty: 5 },
      { itemName: 'Gemstone', qty: 1 },
    ],
    resultItemName: 'Elixir of Life',
  },
];

export const Forge = () => {
  const userInventory = useStore((state) => state.userInventory);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getItemCount = (itemName: string) => {
    return userInventory.reduce((count, inv) => {
      const itemNameInInv = inv.item?.name ?? '';
      return itemNameInInv === itemName ? count + 1 : count;
    }, 0);
  };

  const canCraft = (recipe: Recipe) =>
    recipe.materials.every((mat) => getItemCount(mat.itemName) >= mat.qty);

  const handleForge = useCallback(async () => {
    if (!selectedRecipe) return;
    if (!canCraft(selectedRecipe)) {
      alert('Missing required materials!');
      return;
    }
    setLoading(true);
    // Simulate forging delay
    await new Promise((res) => setTimeout(res, 1500));
    // Determine result based on rarity (simple random)
    const roll = Math.random();
    let outcome = 'None';
    if (roll < 0.01) outcome = 'Legendary Artifact';
    else if (roll < 0.05) outcome = 'Epic Relic';
    else if (roll < 0.15) outcome = 'Rare Crystal';
    else if (roll < 0.35) outcome = 'Uncommon Gem';
    else if (roll < 0.65) outcome = 'Common Shard';
    else outcome = 'None';
    setResult(outcome === 'None' ? null : outcome);
    setLoading(false);
  }, [selectedRecipe, userInventory]);

  const handleRecipeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    const recipe = recipes.find((r) => r.id === id) || null;
    setSelectedRecipe(recipe);
    setResult(null);
  };

  const getResultClass = (result: string) => {
    switch (result) {
      case 'Legendary Artifact': return 'text-rank-s';
      case 'Epic Relic': return 'text-rank-a';
      case 'Rare Crystal': return 'text-rank-b';
      case 'Uncommon Gem': return 'text-rank-c';
      case 'Common Shard': return 'text-rank-d';
      default: return 'text-rank-e';
    }
  };

  if (loading && !result) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h3 className="font-display text-xl text-text-primary mb-4">Forge</h3>
        <p className="font-system text-text-secondary">Forging...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-display text-xl text-text-primary mb-4">Forge</h3>
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="p-4 bg-surface border border-border-subtle rounded-sm text-center min-w-[80px]">
          <div className="text-2xl mb-2">⛏️</div>
          <p className="font-system text-xs text-text-secondary">Iron Ore ({getItemCount('Iron Ore')})</p>
        </div>
        <div className="p-4 bg-surface border border-border-subtle rounded-sm text-center min-w-[80px]">
          <div className="text-2xl mb-2">💎</div>
          <p className="font-system text-xs text-text-secondary">Gemstone ({getItemCount('Gemstone')})</p>
        </div>
        <div className="p-4 bg-surface border border-border-subtle rounded-sm text-center min-w-[80px]">
          <div className="text-2xl mb-2">🔥</div>
          <p className="font-system text-xs text-text-secondary">Essence of Flame ({getItemCount('Essence of Flame')})</p>
        </div>
        <div className="p-4 bg-surface border border-border-subtle rounded-sm text-center min-w-[80px]">
          <div className="text-2xl mb-2">🌿</div>
          <p className="font-system text-xs text-text-secondary">Herbal Essence ({getItemCount('Herbal Essence')})</p>
        </div>
        <div className="p-4 bg-surface border border-border-subtle rounded-sm text-center min-w-[80px]">
          <div className="text-2xl mb-2">🌑</div>
          <p className="font-system text-xs text-text-secondary">Dark Essence ({getItemCount('Dark Essence')})</p>
        </div>
      </div>

      <div className="mb-4">
        <label className="block font-display text-sm text-text-secondary mb-2">
          Choose Recipe
        </label>
        <select
          value={selectedRecipe?.id ?? ''}
          onChange={handleRecipeChange}
          className="w-full px-4 py-2 bg-surface border border-border-subtle rounded-sm text-text-primary font-system"
        >
          <option value="">Select a recipe</option>
          {recipes.map((r) => (
            <option key={r.id} value={r.id}>
              {`${r.name} (${r.materials.map((m) => `${m.qty} ${m.itemName}`).join(', ')})`}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleForge}
        disabled={!selectedRecipe || !canCraft(selectedRecipe) || loading}
        className={`w-full py-3 bg-gold-primary text-void font-display rounded-sm hover:bg-gold-primary/90 transition-fast ${
          !selectedRecipe || !canCraft(selectedRecipe) ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {loading ? 'Forging...' : 'Forge Item'}
      </button>

      {result && (
        <div className="mt-4 p-4 bg-raised border border-gold-dim rounded-sm text-center">
          <h4 className="font-display text-text-primary mb-2">Result:</h4>
          <p className={`font-display text-lg ${getResultClass(result)}`}>
            {result}
          </p>
        </div>
      )}
    </div>
  );
};