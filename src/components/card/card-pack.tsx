'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export type CardPackState = 'generating' | 'ready' | 'opening';

export interface CardPackProps {
  state: CardPackState;
  onClick?: () => void;
  className?: string;
}

export function CardPack({ state, onClick, className }: CardPackProps) {
  const isClickable = state === 'ready';

  const handleClick = () => {
    if (isClickable && onClick) {
      onClick();
    }
  };

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <motion.div
        onClick={handleClick}
        className={cn(
          'relative h-48 w-32 cursor-default select-none',
          isClickable && 'cursor-pointer'
        )}
        whileHover={isClickable ? { scale: 1.05 } : undefined}
        whileTap={isClickable ? { scale: 0.98 } : undefined}
      >
        <AnimatePresence mode="wait">
          {state === 'generating' && (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0"
            >
              <GeneratingPack />
            </motion.div>
          )}

          {state === 'ready' && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              className="absolute inset-0"
            >
              <ReadyPack />
            </motion.div>
          )}

          {state === 'opening' && (
            <motion.div
              key="opening"
              initial={{ opacity: 1 }}
              animate={{
                opacity: [1, 1, 0],
                scale: [1, 1.1, 1.3],
                rotate: [0, -5, 5, -5, 5, 0],
              }}
              transition={{
                duration: 0.6,
                times: [0, 0.5, 1],
              }}
              className="absolute inset-0"
            >
              <OpeningPack />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ステータステキスト */}
      <motion.p
        key={state}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'text-sm font-medium',
          state === 'generating' && 'text-gray-500 dark:text-gray-400',
          state === 'ready' && 'text-blue-600 dark:text-blue-400',
          state === 'opening' && 'text-yellow-600 dark:text-yellow-400'
        )}
      >
        {state === 'generating' && 'カード生成中...'}
        {state === 'ready' && 'タップして開封!'}
        {state === 'opening' && '開封中...'}
      </motion.p>
    </div>
  );
}

// 生成中のパック（グレーアウト + パルス）
function GeneratingPack() {
  return (
    <motion.div
      className="relative h-full w-full overflow-hidden rounded-xl bg-gradient-to-br from-gray-400 to-gray-600 shadow-lg"
      animate={{
        opacity: [0.6, 0.8, 0.6],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {/* パックデザイン */}
      <div className="absolute inset-2 rounded-lg border-2 border-gray-300/30">
        <div className="flex h-full flex-col items-center justify-center">
          <PackLogo className="opacity-50" />
          {/* ローディングドット */}
          <div className="mt-4 flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="h-2 w-2 rounded-full bg-gray-300"
                animate={{
                  opacity: [0.3, 1, 0.3],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// 準備完了のパック（鮮やか + 浮遊 + 発光）
function ReadyPack() {
  return (
    <motion.div
      className="relative h-full w-full"
      animate={{
        y: [0, -8, 0],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {/* 発光エフェクト */}
      <motion.div
        className="absolute -inset-2 rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-60 blur-xl"
        animate={{
          opacity: [0.4, 0.7, 0.4],
          scale: [0.95, 1.05, 0.95],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* パック本体 */}
      <div className="relative h-full w-full overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 shadow-2xl">
        {/* キラキラエフェクト */}
        <Sparkles />

        {/* パックデザイン */}
        <div className="absolute inset-2 rounded-lg border-2 border-white/30">
          <div className="flex h-full flex-col items-center justify-center">
            <PackLogo />
            <motion.p
              className="mt-2 text-xs font-bold text-white/90"
              animate={{
                opacity: [0.7, 1, 0.7],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
              }}
            >
              KNOWLEDGE CARD
            </motion.p>
          </div>
        </div>

        {/* 光沢エフェクト */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent"
          animate={{
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
          }}
        />
      </div>
    </motion.div>
  );
}

// 開封中のパック
function OpeningPack() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl bg-gradient-to-br from-yellow-500 via-orange-500 to-red-500 shadow-2xl">
      {/* 爆発エフェクト */}
      <motion.div
        className="absolute inset-0 bg-white"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 0.3 }}
      />

      {/* パックデザイン */}
      <div className="absolute inset-2 rounded-lg border-2 border-white/50">
        <div className="flex h-full flex-col items-center justify-center">
          <PackLogo />
        </div>
      </div>
    </div>
  );
}

// パックロゴ
function PackLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn('h-16 w-16 text-white', className)}
      fill="currentColor"
    >
      {/* カードアイコン */}
      <rect x="8" y="6" width="24" height="32" rx="2" opacity="0.5" />
      <rect x="14" y="10" width="24" height="32" rx="2" opacity="0.7" />
      <rect x="20" y="14" width="24" height="32" rx="2" />
      {/* 星マーク */}
      <path
        d="M32 24l2.5 5 5.5.8-4 3.9.9 5.3-4.9-2.6-4.9 2.6.9-5.3-4-3.9 5.5-.8z"
        opacity="0.9"
      />
    </svg>
  );
}

// キラキラエフェクト
function Sparkles() {
  const sparkles = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 1 + Math.random(),
  }));

  return (
    <>
      {sparkles.map((sparkle) => (
        <motion.div
          key={sparkle.id}
          className="absolute h-1 w-1 rounded-full bg-white"
          style={{
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{
            duration: sparkle.duration,
            repeat: Infinity,
            delay: sparkle.delay,
          }}
        />
      ))}
    </>
  );
}
