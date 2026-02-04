'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui';
import { RarityBadge } from './rarity-badge';
import { cn } from '@/lib/utils';
import type { Card } from '@prisma/client';
import type { Rarity } from '@/types/database';

export interface BatchCardRevealModalProps {
  isOpen: boolean;
  cards: Card[];
  onClose: () => void;
  onViewCollection: () => void;
  onGenerateMore: () => void;
}

type RevealPhase = 'waiting' | 'flipping' | 'revealed';

const RARITY_COLORS: Record<Rarity, string> = {
  common: 'from-gray-400 to-gray-600',
  rare: 'from-blue-400 to-blue-600',
  super_rare: 'from-purple-400 to-purple-600',
  legend: 'from-yellow-400 via-orange-500 to-yellow-600',
};

const AUTO_ADVANCE_DELAY = 3000; // 3秒で自動進行

export function BatchCardRevealModal({
  isOpen,
  cards,
  onClose,
  onViewCollection,
  onGenerateMore,
}: BatchCardRevealModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<RevealPhase>('waiting');
  const [showSummary, setShowSummary] = useState(false);

  const currentCard = cards[currentIndex];
  const rarity = (currentCard?.rarity || 'common') as Rarity;
  const isLastCard = currentIndex >= cards.length - 1;
  const hasCards = cards.length > 0;

  // 次のカードへ進む
  const handleNextCard = useCallback(() => {
    if (isLastCard) {
      setShowSummary(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [isLastCard]);

  // 全てスキップ
  const handleSkipAll = useCallback(() => {
    setShowSummary(true);
  }, []);

  // クリック/タップで次へ（revealed状態のみ）
  const handleCardClick = useCallback(() => {
    if (phase === 'revealed') {
      handleNextCard();
    }
  }, [phase, handleNextCard]);

  // モーダルが開いたらリセット
  useEffect(() => {
    if (isOpen && hasCards) {
      setCurrentIndex(0);
      setPhase('waiting');
      setShowSummary(false);
    }
  }, [isOpen, hasCards]);

  // カードのフリップアニメーション
  useEffect(() => {
    if (!isOpen || showSummary || !currentCard) return;

    setPhase('waiting');
    const flipTimer = setTimeout(() => setPhase('flipping'), 200);
    const revealTimer = setTimeout(() => setPhase('revealed'), 900);

    return () => {
      clearTimeout(flipTimer);
      clearTimeout(revealTimer);
    };
  }, [isOpen, currentIndex, showSummary, currentCard]);

  // 自動進行タイマー
  useEffect(() => {
    if (phase !== 'revealed' || showSummary) return;

    const autoAdvanceTimer = setTimeout(() => {
      handleNextCard();
    }, AUTO_ADVANCE_DELAY);

    return () => clearTimeout(autoAdvanceTimer);
  }, [phase, showSummary, handleNextCard]);

  if (!hasCards) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          {/* 背景オーバーレイ */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-sm"
          />

          {/* サマリー表示 */}
          {showSummary ? (
            <BatchSummary
              cards={cards}
              onViewCollection={onViewCollection}
              onGenerateMore={onGenerateMore}
              onClose={onClose}
            />
          ) : (
            <>
              {/* レアリティ別背景エフェクト */}
              <RarityBackground rarity={rarity} phase={phase} />

              {/* メインコンテンツ */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="relative z-10 flex flex-col items-center gap-4 px-4"
              >
                {/* 進捗インジケーター */}
                <div className="flex items-center gap-2">
                  {cards.map((_, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'h-2 w-2 rounded-full transition-colors',
                        idx < currentIndex
                          ? 'bg-white'
                          : idx === currentIndex
                          ? 'bg-white scale-125'
                          : 'bg-white/30'
                      )}
                    />
                  ))}
                </div>

                {/* カード枚数表示 */}
                <p className="text-white/70 text-sm">
                  {currentIndex + 1} / {cards.length}
                </p>

                {/* カードフリップ */}
                <div
                  className="relative cursor-pointer"
                  style={{ perspective: '1000px' }}
                  onClick={handleCardClick}
                >
                  <motion.div
                    className="relative h-96 w-64"
                    initial={{ rotateY: 180 }}
                    animate={{
                      rotateY: phase === 'waiting' ? 180 : 0,
                    }}
                    transition={{
                      duration: 0.7,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    {/* カード裏面 */}
                    <div
                      className="absolute inset-0 overflow-hidden rounded-xl shadow-2xl"
                      style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                    >
                      <div className={cn(
                        'h-full w-full bg-gradient-to-br flex items-center justify-center',
                        RARITY_COLORS[rarity]
                      )}>
                        <span className="text-6xl text-white/80">?</span>
                      </div>
                    </div>

                    {/* カード表面 */}
                    <div
                      className="absolute inset-0 overflow-hidden rounded-xl shadow-2xl"
                      style={{ backfaceVisibility: 'hidden' }}
                    >
                      <Image
                        src={currentCard.cardImageUrl}
                        alt={currentCard.keyword}
                        fill
                        className="object-cover"
                        priority
                      />
                    </div>
                  </motion.div>

                  {/* レアリティエフェクト */}
                  <AnimatePresence>
                    {phase === 'revealed' && (
                      <RarityEffect rarity={rarity} />
                    )}
                  </AnimatePresence>
                </div>

                {/* カード情報 */}
                <AnimatePresence>
                  {phase === 'revealed' && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-center"
                    >
                      <h3 className="text-xl font-bold text-white">
                        {currentCard.keyword}
                      </h3>
                      <RarityBadge rarity={rarity} size="lg" className="mt-2" />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* タップ促し & スキップボタン */}
                <AnimatePresence>
                  {phase === 'revealed' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="flex flex-col items-center gap-3"
                    >
                      <p className="text-white/50 text-sm animate-pulse">
                        タップで次へ
                      </p>
                      <Button
                        variant="ghost"
                        onClick={handleSkipAll}
                        className="text-white/60 hover:text-white text-sm"
                      >
                        全てスキップ →
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// バッチ結果サマリー
function BatchSummary({
  cards,
  onViewCollection,
  onGenerateMore,
  onClose,
}: {
  cards: Card[];
  onViewCollection: () => void;
  onGenerateMore: () => void;
  onClose: () => void;
}) {
  // レアリティ別カウント
  const rarityCounts = cards.reduce((acc, card) => {
    const rarity = card.rarity as Rarity;
    acc[rarity] = (acc[rarity] || 0) + 1;
    return acc;
  }, {} as Record<Rarity, number>);

  const rarityOrder: Rarity[] = ['legend', 'super_rare', 'rare', 'common'];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="relative z-10 flex flex-col items-center gap-6 px-4 py-8 max-w-lg w-full"
    >
      {/* 閉じるボタン */}
      <button
        onClick={onClose}
        className="absolute top-2 right-2 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
      >
        <svg
          className="h-5 w-5 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* タイトル */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-2xl font-bold text-white">
          {cards.length}枚のカードを獲得!
        </h2>
      </motion.div>

      {/* レアリティ集計 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex flex-wrap justify-center gap-3"
      >
        {rarityOrder.map((rarity) => {
          const count = rarityCounts[rarity];
          if (!count) return null;
          return (
            <div key={rarity} className="flex items-center gap-1">
              <RarityBadge rarity={rarity} size="sm" />
              <span className="text-white font-medium">×{count}</span>
            </div>
          );
        })}
      </motion.div>

      {/* カードグリッド */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-3 sm:grid-cols-4 gap-3 w-full"
      >
        {cards.map((card, index) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + index * 0.05 }}
            className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-lg"
          >
            <Image
              src={card.thumbnailUrl}
              alt={card.keyword}
              fill
              className="object-cover"
            />
            {/* レアリティインジケーター */}
            <div
              className={cn(
                'absolute bottom-0 left-0 right-0 h-1',
                card.rarity === 'legend' && 'bg-yellow-500',
                card.rarity === 'super_rare' && 'bg-purple-500',
                card.rarity === 'rare' && 'bg-blue-500',
                card.rarity === 'common' && 'bg-gray-400'
              )}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* アクションボタン */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex flex-col sm:flex-row gap-3 w-full max-w-xs"
      >
        <Button onClick={onViewCollection} className="flex-1">
          コレクションを見る
        </Button>
        <Button onClick={onGenerateMore} variant="secondary" className="flex-1">
          もう一度生成
        </Button>
      </motion.div>
    </motion.div>
  );
}

// レアリティ別背景エフェクト
function RarityBackground({ rarity, phase }: { rarity: Rarity; phase: RevealPhase }) {
  if (phase !== 'revealed') return null;

  const colors: Record<Rarity, string> = {
    common: 'bg-gray-500/20',
    rare: 'bg-blue-500/30',
    super_rare: 'bg-purple-500/40',
    legend: 'bg-yellow-500/50',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn('absolute inset-0', colors[rarity])}
    />
  );
}

// レアリティ別カードエフェクト
function RarityEffect({ rarity }: { rarity: Rarity }) {
  switch (rarity) {
    case 'legend':
      return <LegendEffect />;
    case 'super_rare':
      return <SuperRareEffect />;
    case 'rare':
      return <RareEffect />;
    default:
      return <CommonEffect />;
  }
}

// レジェンドエフェクト
function LegendEffect() {
  const particles = Array.from({ length: 16 }, (_, i) => ({
    id: i,
    angle: (i / 16) * 360,
    delay: i * 0.03,
  }));

  return (
    <>
      <motion.div
        initial={{ scale: 0, opacity: 1 }}
        animate={{ scale: 2.5, opacity: 0 }}
        transition={{ duration: 0.6 }}
        className="pointer-events-none absolute inset-0 rounded-full bg-yellow-400"
        style={{ filter: 'blur(25px)' }}
      />
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ scale: 0, opacity: 1 }}
          animate={{
            scale: [0, 1, 0],
            opacity: [1, 1, 0],
            x: Math.cos((p.angle * Math.PI) / 180) * 120,
            y: Math.sin((p.angle * Math.PI) / 180) * 120,
          }}
          transition={{ duration: 0.8, delay: p.delay }}
          className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-400"
          style={{ boxShadow: '0 0 8px #fbbf24' }}
        />
      ))}
      <motion.div
        animate={{
          boxShadow: [
            '0 0 25px rgba(251, 191, 36, 0.5)',
            '0 0 50px rgba(251, 191, 36, 0.8)',
            '0 0 25px rgba(251, 191, 36, 0.5)',
          ],
        }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="pointer-events-none absolute inset-0 rounded-xl"
      />
    </>
  );
}

// スーパーレアエフェクト
function SuperRareEffect() {
  const particles = Array.from({ length: 10 }, (_, i) => ({
    id: i,
    angle: (i / 10) * 360,
    delay: i * 0.05,
  }));

  return (
    <>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ scale: 0, opacity: 1 }}
          animate={{
            scale: [0, 1, 0],
            opacity: [1, 0.8, 0],
            x: Math.cos((p.angle * Math.PI) / 180) * 100,
            y: Math.sin((p.angle * Math.PI) / 180) * 100,
          }}
          transition={{ duration: 0.7, delay: p.delay }}
          className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-400"
        />
      ))}
      <motion.div
        animate={{
          boxShadow: [
            '0 0 18px rgba(147, 51, 234, 0.4)',
            '0 0 35px rgba(147, 51, 234, 0.6)',
            '0 0 18px rgba(147, 51, 234, 0.4)',
          ],
        }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="pointer-events-none absolute inset-0 rounded-xl"
      />
    </>
  );
}

// レアエフェクト
function RareEffect() {
  const sparkles = Array.from({ length: 6 }, (_, i) => ({
    id: i,
    x: Math.random() * 80 - 40,
    y: Math.random() * 80 - 40,
    delay: i * 0.1,
  }));

  return (
    <>
      {sparkles.map((s) => (
        <motion.div
          key={s.id}
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: [0, 1.5, 0],
            opacity: [0, 1, 0],
          }}
          transition={{ duration: 0.5, delay: s.delay, repeat: 2 }}
          className="absolute left-1/2 top-1/2 h-1 w-1 rounded-full bg-blue-400"
          style={{
            transform: `translate(${s.x}px, ${s.y}px)`,
            boxShadow: '0 0 6px #60a5fa',
          }}
        />
      ))}
      <motion.div
        animate={{
          boxShadow: [
            '0 0 12px rgba(59, 130, 246, 0.3)',
            '0 0 22px rgba(59, 130, 246, 0.5)',
            '0 0 12px rgba(59, 130, 246, 0.3)',
          ],
        }}
        transition={{ duration: 2, repeat: Infinity }}
        className="pointer-events-none absolute inset-0 rounded-xl"
      />
    </>
  );
}

// コモンエフェクト
function CommonEffect() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="pointer-events-none absolute inset-0 rounded-xl shadow-lg"
    />
  );
}
