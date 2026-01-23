'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui';
import { useToast } from '@/hooks/use-toast';
import {
  generateShareText,
  getShareUrl,
  getTwitterShareUrl,
  getLineShareUrl,
  copyToClipboard,
  downloadImage,
} from '@/lib/share/utils';
import type { Rarity } from '@/types/database';

interface ShareButtonsProps {
  cardId: string;
  keyword: string;
  rarity: Rarity;
  flavorText: string;
  cardImageUrl: string;
}

export function ShareButtons({
  cardId,
  keyword,
  rarity,
  flavorText,
  cardImageUrl,
}: ShareButtonsProps) {
  const { addToast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  const shareUrl = getShareUrl(cardId);
  const shareText = generateShareText({ keyword, rarity, flavorText, shareUrl });

  const handleTwitterShare = useCallback(() => {
    const url = getTwitterShareUrl(shareText);
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [shareText]);

  const handleLineShare = useCallback(() => {
    const url = getLineShareUrl(shareText);
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [shareText]);

  const handleCopyLink = useCallback(async () => {
    const success = await copyToClipboard(shareUrl);
    if (success) {
      addToast('リンクをコピーしました', 'success');
    } else {
      addToast('コピーに失敗しました', 'error');
    }
  }, [shareUrl, addToast]);

  const handleDownloadImage = useCallback(async () => {
    setIsDownloading(true);
    try {
      const filename = `articard-${keyword}-${cardId.slice(0, 8)}.png`;
      await downloadImage(cardImageUrl, filename);
      addToast('画像をダウンロードしました', 'success');
    } catch {
      addToast('ダウンロードに失敗しました', 'error');
    } finally {
      setIsDownloading(false);
    }
  }, [cardImageUrl, keyword, cardId, addToast]);

  return (
    <div className="flex flex-col gap-3">
      {/* X (Twitter) Share */}
      <Button onClick={handleTwitterShare} variant="secondary" className="w-full justify-start">
        <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        X (Twitter) で共有
      </Button>

      {/* LINE Share */}
      <Button onClick={handleLineShare} variant="secondary" className="w-full justify-start">
        <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
        </svg>
        LINE で共有
      </Button>

      {/* Download Image */}
      <Button
        onClick={handleDownloadImage}
        variant="secondary"
        className="w-full justify-start"
        isLoading={isDownloading}
      >
        {!isDownloading && (
          <svg
            className="mr-3 h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
        )}
        画像をダウンロード
      </Button>

      {/* Copy Link */}
      <Button onClick={handleCopyLink} variant="secondary" className="w-full justify-start">
        <svg
          className="mr-3 h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
        リンクをコピー
      </Button>
    </div>
  );
}
