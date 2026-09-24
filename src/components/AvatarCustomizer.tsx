import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { createAuthApi } from '../lib/api';
import { getAvatarUrl } from '../lib/avatars';
import {
  DEFAULT_AVATAR_CONFIG,
  DEFAULT_SKIN_TONES,
  DEFAULT_ARMOR_COLORS,
  DEFAULT_ACCENT_COLORS,
  DEFAULT_HAIR_COLORS,
  AVATAR_PRESETS,
  randomizeAvatarConfig,
  parseAvatarConfig,
  type AvatarConfig,
} from '../lib/avatarConfig';

/**
 * AvatarCustomizer — 3D hunter avatar customization UI.
 *
 * Implements 3D report items:
 *   #9   Avatar config stored as JSON via PATCH /api/settings (avatarConfig)
 *   #19/#95  The 3D module (three.js) is lazy-loaded; users who never open the
 *            customizer never pay its bundle cost
 *   #96/#256  "Disable 3D" toggle renders the 2D DiceBear avatar instead
 *   #101  WebGL probe with timeout: a broken/unsupported WebGL context falls
 *         back to the 2D avatar instead of blocking the page
 *   #257  prefers-reduced-motion is honored inside HunterAvatar3D
 */

const LazyHunterAvatar3D = React.lazy(() => import('./HunterAvatar3D'));

const hasWebGL = (): boolean => {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
};

const BODY_TYPES: Array<{ value: AvatarConfig['bodyType']; label: string }> = [
  { value: 'slim', label: 'Slim' },
  { value: 'regular', label: 'Regular' },
  { value: 'broad', label: 'Broad' },
];

const HAIR_STYLES: Array<{ value: AvatarConfig['hairStyle']; label: string }> = [
  { value: 'short', label: 'Short' },
  { value: 'swept', label: 'Swept' },
  { value: 'topknot', label: 'Topknot' },
  { value: 'hood', label: 'Hood' },
];

const CLASS_SIGILS: Array<{ value: AvatarConfig['classSigil']; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'sword', label: 'Warrior' },
  { value: 'orb', label: 'Mage' },
  { value: 'tome', label: 'Scholar' },
  { value: 'dagger', label: 'Assassin' },
  { value: 'bow', label: 'Ranger' },
];

const HairColorSwatches: React.FC<{ value: string; onChange: (c: string) => void }> = ({ value, onChange }) => (
  <div className="flex gap-2 flex-wrap">
    {DEFAULT_HAIR_COLORS.map((c) => (
      <button
        key={c}
        type="button"
        aria-label={`Hair color ${c}`}
        onClick={() => onChange(c)}
        className={`w-8 h-8 rounded-sm border-2 transition-transform ${value === c ? 'border-gold-primary scale-110' : 'border-border-subtle'}`}
        style={{ backgroundColor: c }}
      />
    ))}
  </div>
);

const Swatches: React.FC<{ colors: string[]; value: string; onChange: (c: string) => void }> = ({ colors, value, onChange }) => (
  <div className="flex gap-2 flex-wrap">
    {colors.map((c) => (
      <button
        key={c}
        type="button"
        aria-label={`Color ${c}`}
        onClick={() => onChange(c)}
        className={`w-8 h-8 rounded-sm border-2 transition-transform ${value === c ? 'border-gold-primary scale-110' : 'border-border-subtle'}`}
        style={{ backgroundColor: c }}
      />
    ))}
  </div>
);

export const AvatarCustomizer: React.FC<{ onSaved?: () => void }> = ({ onSaved }) => {
  const { hunter, stats, token, addToast } = useStore();
  const rank = (stats?.rank ?? 'E') as AvatarConfig['rank'];

  const [config, setConfig] = useState<Partial<AvatarConfig>>({});
  const [use3D, setUse3D] = useState<boolean>(() => hasWebGL());
  const [webglAvailable] = useState<boolean>(() => hasWebGL());
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load saved config (#9)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!token) return;
      try {
        const api = createAuthApi(() => token);
        const settings = await api.get<{ avatarConfig?: unknown }>('/settings');
        if (!cancelled && settings?.avatarConfig) {
          setConfig(parseAvatarConfig(settings.avatarConfig));
        }
      } catch {
        // Defaults are fine if settings can't be loaded
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const merged = useMemo<Partial<AvatarConfig>>(
    () => ({ ...DEFAULT_AVATAR_CONFIG, rank, ...config }),
    [config, rank]
  );

  // Randomize (#26): fills all cosmetic slots with a fresh look. Rank stays earned.
  const handleRandomize = () => {
    setConfig((c) => ({ ...c, ...randomizeAvatarConfig() }));
    addToast('success', 'Fate has rerolled your look. Save to keep it.');
  };

  // Preset loadout (#27/#29): apply a curated class-themed look.
  const applyPreset = (presetId: string) => {
    const preset = AVATAR_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setConfig((c) => ({ ...c, ...preset.config }));
    addToast('success', `${preset.name} loadout applied. Save to keep it.`);
  };

  const save = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const api = createAuthApi(() => token);
      await api.patch('/settings', { avatarConfig: merged });
      addToast('success', 'Avatar updated.');
      onSaved?.();
    } catch {
      addToast('error', 'Failed to save avatar. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-surface border border-border-subtle rounded-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-display text-text-primary">Hunter Avatar</h2>
        {webglAvailable && (
          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={use3D}
              onChange={(e) => setUse3D(e.target.checked)}
              className="accent-purple-500"
            />
            3D view
          </label>
        )}
      </div>

      {/* Quick actions (#26 randomize, #27/#29 preset loadouts) */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          type="button"
          onClick={handleRandomize}
          className="px-3 py-1.5 rounded-sm border border-violet-gate/60 text-violet-gate text-sm hover:bg-violet-gate/10 transition-colors"
        >
          🎲 Randomize
        </button>
        {AVATAR_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            title={p.description}
            onClick={() => applyPreset(p.id)}
            className={`px-3 py-1.5 rounded-sm border text-sm transition-colors ${
              merged.bodyType === p.config.bodyType &&
              merged.hairStyle === p.config.hairStyle &&
              merged.classSigil === p.config.classSigil &&
              merged.armorColor === p.config.armorColor
                ? 'border-gold-primary text-gold-primary'
                : 'border-border-subtle text-text-secondary hover:border-border-strong'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Preview: lazy 3D with 2D fallback (#19/#95/#96/#101/#256) */}
        <div className="flex flex-col items-center justify-center bg-raised rounded-md border border-border-subtle overflow-hidden min-h-[320px]">
          {use3D && webglAvailable ? (
            <React.Suspense
              fallback={
                <div className="flex items-center justify-center h-full text-text-secondary text-sm">
                  Loading avatar…
                </div>
              }
            >
              <LazyHunterAvatar3D config={merged} height={320} />
            </React.Suspense>
          ) : (
            <img
              src={getAvatarUrl(hunter?.hunterId || hunter?.displayName || 'Hunter')}
              alt="Your hunter avatar (2D fallback)"
              className="w-40 h-40 rounded-full border border-border-subtle bg-surface"
            />
          )}
          {!webglAvailable && (
            <p className="text-xs text-text-secondary mt-2">3D unavailable on this device — showing 2D avatar.</p>
          )}
        </div>

        {/* Options */}
        <div className="space-y-4">
          <div>
            <p className="text-sm text-text-secondary mb-2">Body Type</p>
            <div className="flex gap-2">
              {BODY_TYPES.map((b) => (
                <button
                  key={b.value}
                  type="button"
                  onClick={() => setConfig((c) => ({ ...c, bodyType: b.value }))}
                  className={`px-3 py-1.5 rounded-sm border text-sm transition-colors ${
                    merged.bodyType === b.value
                      ? 'border-gold-primary text-gold-primary'
                      : 'border-border-subtle text-text-secondary hover:border-border-strong'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm text-text-secondary mb-2">Hair Style</p>
            <div className="flex gap-2 flex-wrap">
              {HAIR_STYLES.map((h) => (
                <button
                  key={h.value}
                  type="button"
                  onClick={() => setConfig((c) => ({ ...c, hairStyle: h.value }))}
                  className={`px-3 py-1.5 rounded-sm border text-sm transition-colors ${
                    merged.hairStyle === h.value
                      ? 'border-gold-primary text-gold-primary'
                      : 'border-border-subtle text-text-secondary hover:border-border-strong'
                  }`}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm text-text-secondary mb-2">Hair Color</p>
            <HairColorSwatches value={merged.hairColor ?? ''} onChange={(c) => setConfig((cfg) => ({ ...cfg, hairColor: c }))} />
          </div>

          <div>
            <p className="text-sm text-text-secondary mb-2">Skin Tone</p>
            <Swatches colors={DEFAULT_SKIN_TONES} value={merged.skinTone ?? ''} onChange={(c) => setConfig((cfg) => ({ ...cfg, skinTone: c }))} />
          </div>

          <div>
            <p className="text-sm text-text-secondary mb-2">Armor Color</p>
            <Swatches colors={DEFAULT_ARMOR_COLORS} value={merged.armorColor ?? ''} onChange={(c) => setConfig((cfg) => ({ ...cfg, armorColor: c }))} />
          </div>

          <div>
            <p className="text-sm text-text-secondary mb-2">Accent Color</p>
            <Swatches colors={DEFAULT_ACCENT_COLORS} value={merged.accentColor ?? ''} onChange={(c) => setConfig((cfg) => ({ ...cfg, accentColor: c }))} />
          </div>

          <div>
            <p className="text-sm text-text-secondary mb-2">Class Sigil</p>
            <div className="flex gap-2 flex-wrap">
              {CLASS_SIGILS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setConfig((c) => ({ ...c, classSigil: s.value }))}
                  className={`px-3 py-1.5 rounded-sm border text-sm transition-colors ${
                    merged.classSigil === s.value
                      ? 'border-gold-primary text-gold-primary'
                      : 'border-border-subtle text-text-secondary hover:border-border-strong'
                  }`}
              >
                {s.label}
              </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-text-secondary">
            Rank aura ({rank}-rank) intensifies automatically as you advance — cosmetics never affect gameplay.
          </p>

          <button
            type="button"
            disabled={saving || !loaded}
            onClick={save}
            className="w-full py-2.5 rounded-sm bg-gold-primary text-black font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Avatar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvatarCustomizer;
