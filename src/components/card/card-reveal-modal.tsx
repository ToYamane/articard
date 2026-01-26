'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui';
import { RarityBadge } from './rarity-badge';
import { cn } from '@/lib/utils';
import type { Card } from '@prisma/client';
import type { Rarity } from '@/types/database';

export interface CardRevealModalProps {
  isOpen: boolean;
  card: Card | null;
  onClose: () => void;
  onGoHome: () => void;
  onCreateAnotherFromArticle: () => void;
  onReadArticle: () => void;
  isGenerating?: boolean;
}

type RevealPhase = 'hidden' | 'flipping' | 'revealed';

const RARITY_COLORS: Record<Rarity, string> = {
  common: 'from-gray-400 to-gray-600',
  rare: 'from-blue-400 to-blue-600',
  super_rare: 'from-purple-400 to-purple-600',
  legend: 'from-yellow-400 via-orange-500 to-yellow-600',
};

export function CardRevealModal({
  isOpen,
  card,
  onClose,
  onGoHome,
  onCreateAnotherFromArticle,
  onReadArticle,
  isGenerating = false,
}: CardRevealModalProps) {
  const [phase, setPhase] = useState<RevealPhase>('hidden');

  const rarity = (card?.rarity || 'common') as Rarity;

  // モーダルが開いたらアニメーション開始
  useEffect(() => {
    if (isOpen && card) {
      setPhase('hidden');
      // 少し遅延してからフリップ開始
      const timer1 = setTimeout(() => setPhase('flipping'), 300);
      const timer2 = setTimeout(() => setPhase('revealed'), 1000);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    } else {
      setPhase('hidden');
    }
  }, [isOpen, card]);

  if (!card) return null;

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
            onClick={phase === 'revealed' ? onClose : undefined}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* レアリティ別背景エフェクト */}
          <RarityBackground rarity={rarity} phase={phase} />

          {/* メインコンテンツ */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="relative z-10 flex flex-col items-center gap-6 px-4"
          >
            {/* ×ボタン（右上） */}
            <AnimatePresence>
              {phase === 'revealed' && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.3 }}
                  onClick={onReadArticle}
                  className="absolute -top-2 right-0 z-20 rounded-full bg-white/20 p-2 hover:bg-white/30 transition-colors"
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
                </motion.button>
              )}
            </AnimatePresence>

            {/* タイトル */}
            <AnimatePresence>
              {phase === 'revealed' && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-center"
                >
                  <h2 className="text-2xl font-bold text-white">
                    新しいカードを獲得!
                  </h2>
                </motion.div>
              )}
            </AnimatePresence>

            {/* カードフリップ */}
            <div
              className="relative"
              style={{ perspective: '1000px' }}
            >
              <motion.div
                className="relative h-96 w-64"
                initial={{ rotateY: 180 }}
                animate={{
                  rotateY: phase === 'hidden' ? 180 : 0,
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
                    'h-full w-full bg-gradient-to-br',
                    RARITY_COLORS[rarity]
                  )}>
                    <div className="flex h-full items-center justify-center">
                      <div className="text-6xl">?</div>
                    </div>
                  </div>
                </div>

                {/* カード表面 */}
                <div
                  className="absolute inset-0 overflow-hidden rounded-xl shadow-2xl"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <Image
                    src={card.cardImageUrl}
                    alt={card.keyword}
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
                  transition={{ delay: 0.3 }}
                  className="text-center"
                >
                  <h3 className="text-xl font-bold text-white">
                    {card.keyword}
                  </h3>
                  <RarityBadge rarity={rarity} size="lg" className="mt-2" />
                  <p className="mt-3 max-w-xs text-sm italic text-gray-300">
                    「{card.flavorText}」
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* アクションボタン */}
            <AnimatePresence>
              {phase === 'revealed' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex gap-3"
                >
                  <Button onClick={onGoHome} variant="secondary" disabled={isGenerating}>
                    トップに戻る
                  </Button>
                  <Button onClick={onCreateAnotherFromArticle} disabled={isGenerating} isLoading={isGenerating}>
                    この記事でもう一枚生成
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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

// レジェンドエフェクト（金色パーティクル爆発）
function LegendEffect() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    angle: (i / 20) * 360,
    delay: i * 0.02,
  }));

  return (
    <>
      {/* 光の爆発 */}
      <motion.div
        initial={{ scale: 0, opacity: 1 }}
        animate={{ scale: 3, opacity: 0 }}
        transition={{ duration: 0.8 }}
        className="pointer-events-none absolute inset-0 rounded-full bg-yellow-400"
        style={{ filter: 'blur(30px)' }}
      />

      {/* パーティクル */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ scale: 0, opacity: 1 }}
          animate={{
            scale: [0, 1, 0],
            opacity: [1, 1, 0],
            x: Math.cos((p.angle * Math.PI) / 180) * 150,
            y: Math.sin((p.angle * Math.PI) / 180) * 150,
          }}
          transition={{ duration: 1, delay: p.delay }}
          className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-400"
          style={{ boxShadow: '0 0 10px #fbbf24' }}
        />
      ))}

      {/* グロー */}
      <motion.div
        animate={{
          boxShadow: [
            '0 0 30px rgba(251, 191, 36, 0.5)',
            '0 0 60px rgba(251, 191, 36, 0.8)',
            '0 0 30px rgba(251, 191, 36, 0.5)',
          ],
        }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="pointer-events-none absolute inset-0 rounded-xl"
      />
    </>
  );
}

// スーパーレアエフェクト（紫パーティクル）
function SuperRareEffect() {
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    angle: (i / 12) * 360,
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
            x: Math.cos((p.angle * Math.PI) / 180) * 120,
            y: Math.sin((p.angle * Math.PI) / 180) * 120,
          }}
          transition={{ duration: 0.8, delay: p.delay }}
          className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-400"
        />
      ))}

      <motion.div
        animate={{
          boxShadow: [
            '0 0 20px rgba(147, 51, 234, 0.4)',
            '0 0 40px rgba(147, 51, 234, 0.6)',
            '0 0 20px rgba(147, 51, 234, 0.4)',
          ],
        }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="pointer-events-none absolute inset-0 rounded-xl"
      />
    </>
  );
}

// レアエフェクト（青いスパークル）
function RareEffect() {
  const sparkles = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    x: Math.random() * 100 - 50,
    y: Math.random() * 100 - 50,
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
          transition={{ duration: 0.6, delay: s.delay, repeat: 2 }}
          className="absolute left-1/2 top-1/2 h-1 w-1 rounded-full bg-blue-400"
          style={{
            transform: `translate(${s.x}px, ${s.y}px)`,
            boxShadow: '0 0 8px #60a5fa',
          }}
        />
      ))}

      <motion.div
        animate={{
          boxShadow: [
            '0 0 15px rgba(59, 130, 246, 0.3)',
            '0 0 25px rgba(59, 130, 246, 0.5)',
            '0 0 15px rgba(59, 130, 246, 0.3)',
          ],
        }}
        transition={{ duration: 2, repeat: Infinity }}
        className="pointer-events-none absolute inset-0 rounded-xl"
      />
    </>
  );
}

// コモンエフェクト（シンプルなフェード）
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
