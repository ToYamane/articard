import { RARITY_DISPLAY_NAMES, RARITY_STARS, type Rarity } from '@/types/database';

/**
 * Generate share URL for a card
 */
export function getShareUrl(cardId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/share/${cardId}`;
}

/**
 * Generate star string based on rarity
 */
export function getRarityStars(rarity: Rarity): string {
  const count = RARITY_STARS[rarity];
  return '★'.repeat(count);
}

/**
 * Generate share text for social media
 */
export function generateShareText({
  keyword,
  rarity,
  flavorText,
  shareUrl,
}: {
  keyword: string;
  rarity: Rarity;
  flavorText: string;
  shareUrl: string;
}): string {
  const stars = getRarityStars(rarity);
  const rarityName = RARITY_DISPLAY_NAMES[rarity];

  return `【${keyword}】のカードを手に入れた！
${stars} ${rarityName}

${flavorText}

#Articard #AIカード
${shareUrl}`;
}

/**
 * Generate X (Twitter) share URL
 */
export function getTwitterShareUrl(text: string): string {
  const encodedText = encodeURIComponent(text);
  return `https://twitter.com/intent/tweet?text=${encodedText}`;
}

/**
 * Generate LINE share URL
 */
export function getLineShareUrl(text: string): string {
  const encodedText = encodeURIComponent(text);
  return `https://social-plugins.line.me/lineit/share?text=${encodedText}`;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      textArea.remove();
    }
  }
}

/**
 * Download image from URL
 */
export async function downloadImage(imageUrl: string, filename: string): Promise<void> {
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
