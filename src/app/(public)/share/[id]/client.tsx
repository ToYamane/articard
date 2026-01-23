'use client';

import Link from 'next/link';
import { ShareCard } from '@/components/share';
import { ShareButtons } from '@/components/share/share-buttons';
import { Button } from '@/components/ui';
import type { Rarity } from '@/types/database';

interface ShareCardData {
  id: string;
  keyword: string;
  rarity: string;
  flavorText: string;
  cardImageUrl: string;
  createdAt: string;
  owner: {
    nickname: string;
  };
}

interface SharePageClientProps {
  card: ShareCardData;
}

export function SharePageClient({ card }: SharePageClientProps) {
  return (
    <div className="py-8">
      {/* Card Display */}
      <ShareCard card={card} />

      {/* Share Buttons */}
      <div className="mx-auto mt-8 max-w-md">
        <h2 className="mb-4 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
          このカードを共有
        </h2>
        <ShareButtons
          cardId={card.id}
          keyword={card.keyword}
          rarity={card.rarity as Rarity}
          flavorText={card.flavorText}
          cardImageUrl={card.cardImageUrl}
        />
      </div>

      {/* CTA */}
      <div className="mx-auto mt-12 max-w-md text-center">
        <div className="rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 p-6 dark:from-blue-950/30 dark:to-purple-950/30">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            自分だけのカードを作ろう
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Articardは学習記事からAI生成カードを作成するサービスです。
            あなたも自分だけのオリジナルカードを作ってみませんか?
          </p>
          <Link href="/register">
            <Button className="mt-4">無料で始める</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
