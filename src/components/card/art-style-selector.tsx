'use client';

import { cn } from '@/lib/utils';
import { ART_STYLES, type ArtStyle } from '@/lib/flux/image-generation';

export interface ArtStyleSelectorProps {
  value: ArtStyle | undefined;
  onChange: (artStyle: ArtStyle | undefined) => void;
  disabled?: boolean;
  className?: string;
}

const ART_STYLE_LABELS: Record<ArtStyle, string> = {
  'photorealistic, cinematic lighting': 'フォトリアル',
  'oil painting, rich texture': '油絵',
  'watercolor illustration, soft edges': '水彩画',
  'anime style, cel shading': 'アニメ',
  'pixel art, 16-bit retro': 'ピクセルアート',
  'flat vector illustration, minimal': 'フラットデザイン',
  'pencil sketch, hand-drawn': '鉛筆スケッチ',
  'ukiyo-e style, Japanese woodblock print': '浮世絵',
  'neon-lit illustration, high contrast glow': 'ネオン',
  'fantasy concept art, epic lighting': 'ファンタジー',
  'art nouveau, ornamental details': 'アールヌーヴォー',
  'low poly 3D render, geometric': 'ローポリ3D',
};

export function ArtStyleSelector({ value, onChange, disabled, className }: ArtStyleSelectorProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          画風指定（開発者モード）
        </label>
        {value && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            disabled={disabled}
            className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            クリア
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {ART_STYLES.map((style) => {
          const isSelected = value === style;
          return (
            <button
              key={style}
              type="button"
              onClick={() => onChange(isSelected ? undefined : style)}
              disabled={disabled}
              className={cn(
                'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                'disabled:cursor-not-allowed disabled:opacity-50',
                isSelected
                  ? 'border-pink-500 bg-pink-200 text-pink-800 dark:border-pink-400 dark:bg-pink-800/50 dark:text-pink-300'
                  : 'border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-300 dark:hover:bg-gray-900'
              )}
            >
              {ART_STYLE_LABELS[style]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
