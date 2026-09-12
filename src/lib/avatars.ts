/**
 * DiceBear Avatar Utilities
 * Generates avatar URLs using DiceBear API
 */

export const AVATAR_STYLE = 'avataaars'; // Available: avataaars, bottts, fun-emoji, lorelei, notionists, personas, shapes
export const DICEBEAR_API = 'https://api.dicebear.com/7.x';

/**
 * Generate a DiceBear avatar URL based on a seed
 * @param seed - The seed for generating a unique avatar (e.g., displayName, hunterId, email)
 * @param style - The avatar style (default: avataaars)
 * @returns The avatar URL
 */
export const getAvatarUrl = (seed: string, style: string = AVATAR_STYLE): string => {
  if (!seed) return '';
  const encodedSeed = encodeURIComponent(seed);
  return `${DICEBEAR_API}/${style}/svg?seed=${encodedSeed}`;
};

/**
 * Generate a DiceBear avatar URL with additional options
 * @param seed - The seed for generating a unique avatar
 * @param options - Additional avatar options
 * @returns The avatar URL
 */
export const getAvatarUrlWithOptions = (
  seed: string,
  options: {
    style?: string;
    backgroundColor?: string[];
    hairColor?: string[];
    skinColor?: string[];
    facialHair?: string[];
    clothing?: string[];
  } = {}
): string => {
  if (!seed) return '';
  const style = options.style || AVATAR_STYLE;
  const params = new URLSearchParams();
  params.append('seed', seed);

  if (options.backgroundColor) {
    params.append('backgroundColor', options.backgroundColor.join(','));
  }
  if (options.hairColor) {
    params.append('hairColor', options.hairColor.join(','));
  }
  if (options.skinColor) {
    params.append('skinColor', options.skinColor.join(','));
  }
  if (options.facialHair) {
    params.append('facialHair', options.facialHair.join(','));
  }
  if (options.clothing) {
    params.append('clothing', options.clothing.join(','));
  }

  return `${DICEBEAR_API}/${style}/svg?${params.toString()}`;
};

/**
 * Get avatar URL for a hunter with fallback to DiceBear
 * @param avatarUrl - The stored avatar URL (if any)
 * @param seed - The seed for generating a fallback avatar
 * @returns The avatar URL to use
 */
export const getHunterAvatarUrl = (avatarUrl: string | null | undefined, seed: string): string => {
  if (avatarUrl && avatarUrl.startsWith('http')) {
    return avatarUrl;
  }
  return getAvatarUrl(seed);
};
