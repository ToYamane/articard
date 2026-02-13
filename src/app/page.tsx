'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';

const sparklePositions = [
  { top: '8%', left: '15%', delay: '0s', size: 4 },
  { top: '12%', right: '20%', delay: '0.5s', size: 3 },
  { top: '25%', left: '8%', delay: '1s', size: 5 },
  { bottom: '20%', right: '10%', delay: '1.5s', size: 4 },
  { bottom: '30%', left: '22%', delay: '2s', size: 3 },
  { top: '40%', right: '8%', delay: '0.8s', size: 5 },
  { top: '60%', left: '5%', delay: '1.3s', size: 4 },
  { bottom: '10%', left: '40%', delay: '2.2s', size: 3 },
];

const showcaseCards = [
  {
    id: 1,
    keyword: '重力相互作用',
    rarity: 'legend' as const,
    frontImage: '/promo/cards/01-front.webp',
    backImage: '/promo/cards/01-back.webp',
  },
  {
    id: 2,
    keyword: 'オリンピック',
    rarity: 'rare' as const,
    frontImage: '/promo/cards/02-front.webp',
    backImage: '/promo/cards/02-back.webp',
  },
  {
    id: 3,
    keyword: '黄金比',
    rarity: 'common' as const,
    frontImage: '/promo/cards/03-front.webp',
    backImage: '/promo/cards/03-back.webp',
  },
  {
    id: 4,
    keyword: '戦国時代',
    rarity: 'common' as const,
    frontImage: '/promo/cards/04-front.webp',
    backImage: '/promo/cards/04-back.webp',
  },
  {
    id: 5,
    keyword: '風と共に去りぬ',
    rarity: 'super_rare' as const,
    frontImage: '/promo/cards/05-front.webp',
    backImage: '/promo/cards/05-back.webp',
  },
  {
    id: 6,
    keyword: 'J-Pop',
    rarity: 'common' as const,
    frontImage: '/promo/cards/06-front.webp',
    backImage: '/promo/cards/06-back.webp',
  },
  {
    id: 7,
    keyword: '経済活動',
    rarity: 'super_rare' as const,
    frontImage: '/promo/cards/07-front.webp',
    backImage: '/promo/cards/07-back.webp',
  },
  {
    id: 8,
    keyword: '喜望峰',
    rarity: 'super_rare' as const,
    frontImage: '/promo/cards/08-front.webp',
    backImage: '/promo/cards/08-back.webp',
  },
];

const SWIPE_THRESHOLD = 50;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

function CardCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const isMobile = useIsMobile();

  const goTo = useCallback(
    (index: number) => {
      setActiveIndex(((index % showcaseCards.length) + showcaseCards.length) % showcaseCards.length);
    },
    []
  );

  const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);
  const goPrev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);

  const toggleFlip = useCallback((cardId: number) => {
    setFlippedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  }, []);

  // Reset flip when navigating
  useEffect(() => {
    setFlippedCards(new Set());
  }, [activeIndex]);

  return (
    <div className="relative mx-auto max-w-4xl">
      {/* Cards display area */}
      <div className="relative flex items-center justify-center h-[380px] md:h-[480px]">
        {/* Swipe layer */}
        <motion.div
          className="absolute inset-0 z-30 cursor-grab active:cursor-grabbing md:hidden"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.3}
          onDragEnd={(_, info) => {
            if (info.offset.x < -SWIPE_THRESHOLD) goNext();
            else if (info.offset.x > SWIPE_THRESHOLD) goPrev();
          }}
        />

        <AnimatePresence mode="popLayout">
          {showcaseCards.map((card, index) => {
            const len = showcaseCards.length;
            let offset = index - activeIndex;
            if (offset > len / 2) offset -= len;
            if (offset < -len / 2) offset += len;
            if (Math.abs(offset) > 2) return null;

            const isActive = offset === 0;
            const isFlipped = flippedCards.has(card.id);
            const scale = isActive ? 1 : 0.75;
            const opacity = isActive ? 1 : 0.4;
            const x = offset * (isMobile ? 160 : 220);
            const zIndex = isActive ? 20 : 10 - Math.abs(offset);
            const cardW = isMobile ? 180 : 240;
            const cardH = isMobile ? 270 : 360;

            return (
              <motion.div
                key={card.id}
                className="absolute"
                style={{ zIndex, perspective: 800 }}
                initial={{ opacity: 0, scale: 0.8, x }}
                animate={{ opacity, scale, x }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                {/* Flip container */}
                <motion.div
                  className="relative cursor-pointer"
                  style={{
                    width: cardW,
                    height: cardH,
                    transformStyle: 'preserve-3d',
                  }}
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                  onClick={() => {
                    if (isActive) {
                      toggleFlip(card.id);
                    } else {
                      goTo(index);
                    }
                  }}
                >
                  {/* Front face */}
                  <div
                    className="absolute inset-0 rounded-xl overflow-hidden shadow-2xl"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <Image
                      src={card.frontImage}
                      alt={card.keyword}
                      fill
                      sizes="(max-width: 767px) 180px, 240px"
                      className="object-cover"
                    />
                  </div>

                  {/* Back face */}
                  <div
                    className="absolute inset-0 rounded-xl overflow-hidden shadow-2xl"
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                    }}
                  >
                    <Image
                      src={card.backImage}
                      alt={`${card.keyword} 裏面`}
                      fill
                      sizes="(max-width: 767px) 180px, 240px"
                      className="object-cover"
                    />
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Flip hint */}
      <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-white/60">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="opacity-70">
          <path d="M2 8a6 6 0 0 1 10.2-4.3L11 5h4V1l-1.5 1.5A8 8 0 0 0 0 8h2zm12 0a6 6 0 0 1-10.2 4.3L5 11H1v4l1.5-1.5A8 8 0 0 0 16 8h-2z" fill="currentColor" />
        </svg>
        タップでカードを裏返す
      </p>

      {/* Navigation arrows */}
      <button
        onClick={goPrev}
        className="absolute left-1 top-1/2 z-40 -translate-y-1/2 rounded-full border border-white/30 bg-white/20 p-3.5 text-white shadow-lg shadow-black/20 backdrop-blur-md transition hover:border-white/50 hover:bg-white/30 md:-left-14 md:p-4"
        aria-label="前のカード"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        onClick={goNext}
        className="absolute right-1 top-1/2 z-40 -translate-y-1/2 rounded-full border border-white/30 bg-white/20 p-3.5 text-white shadow-lg shadow-black/20 backdrop-blur-md transition hover:border-white/50 hover:bg-white/30 md:-right-14 md:p-4"
        aria-label="次のカード"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dot indicators */}
      <div className="mt-6 flex items-center justify-center gap-2">
        {showcaseCards.map((card, index) => (
          <button
            key={card.id}
            onClick={() => goTo(index)}
            className={`h-2 rounded-full transition-all ${
              index === activeIndex
                ? 'w-6 bg-purple-400'
                : 'w-2 bg-white/30 hover:bg-white/50'
            }`}
            aria-label={`カード ${index + 1}`}
          />
        ))}
      </div>

      {/* Current card info */}
      <div className="mt-4 text-center">
        <span className="text-lg font-bold text-white">
          {showcaseCards[activeIndex].keyword}
        </span>
        <span className="ml-3 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/70">
          {
            {
              common: 'Common',
              rare: 'Rare',
              super_rare: 'Super Rare',
              legend: 'Legend',
            }[showcaseCards[activeIndex].rarity]
          }
        </span>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, isRegistered, isInitialized } = useAuth();

  useEffect(() => {
    if (!isInitialized) return;
    if (isAuthenticated) {
      router.push(isRegistered ? '/home' : '/setup');
    }
  }, [isAuthenticated, isRegistered, isInitialized, router]);

  if (!isInitialized || isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="overflow-x-hidden">
      <style jsx global>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.5); }
        }
      `}</style>

      {/* ===== (A) Hero Section ===== */}
      <section
        className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4"
        style={{
          background:
            'linear-gradient(135deg, #1e0a3c 0%, #2d1b69 25%, #1a1a6e 50%, #0d2b5e 75%, #0a1628 100%)',
        }}
      >
        {/* Ambient glow */}
        <div
          className="pointer-events-none absolute -left-[100px] -top-[100px] h-[500px] w-[500px]"
          style={{
            background: 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)',
          }}
        />
        <div
          className="pointer-events-none absolute -bottom-[150px] -right-[100px] h-[600px] w-[600px]"
          style={{
            background: 'radial-gradient(circle, rgba(59,130,246,0.25) 0%, transparent 70%)',
          }}
        />

        {/* Sparkle particles */}
        {sparklePositions.map((pos, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              top: pos.top,
              left: pos.left,
              right: pos.right,
              bottom: pos.bottom,
              width: pos.size,
              height: pos.size,
              animation: `twinkle 3s ease-in-out ${pos.delay} infinite`,
            }}
          />
        ))}

        {/* Center content */}
        <motion.div
          className="relative z-10 flex flex-col items-center gap-2"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Image
            src="/logo/icon.webp"
            alt="ArtiCard Icon"
            width={160}
            height={160}
            className="w-28 drop-shadow-[0_0_30px_rgba(139,92,246,0.6)]"
          />
          <Image
            src="/logo/text.webp"
            alt="ArtiCard"
            width={512}
            height={128}
            className="w-80 drop-shadow-[0_0_25px_rgba(139,92,246,0.5)]"
          />

          {/* Decorative line */}
          <div
            className="mt-3 h-0.5 w-60 rounded-full md:w-80"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(139,92,246,0.6), rgba(96,165,250,0.6), transparent)',
            }}
          />

          {/* Catchcopy */}
          <h1
            className="mt-5 text-center text-2xl font-bold tracking-wider text-white/95 md:text-4xl"
            style={{
              textShadow:
                '0 0 30px rgba(139,92,246,0.6), 0 0 60px rgba(139,92,246,0.3), 0 2px 6px rgba(0,0,0,0.5)',
            }}
          >
            学んで集める、AIカードコレクション
          </h1>

          <p className="mt-2 text-xs uppercase tracking-widest text-white/50 md:text-sm">
            AI-Powered Learning Card Collection
          </p>

          {/* CTA buttons */}
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="rounded-full bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-purple-500/30 transition hover:shadow-purple-500/50 md:text-base"
            >
              無料ではじめる
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-white/30 px-8 py-3 text-sm font-bold text-white/80 transition hover:border-white/60 hover:text-white md:text-base"
            >
              ログイン
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ===== (B) Article -> Card Generation Section ===== */}
      <section className="bg-white px-4 py-20 dark:bg-black md:py-28">
        <div className="mx-auto max-w-6xl">
          <motion.h2
            className="mb-12 text-center text-2xl font-bold text-gray-900 dark:text-white md:mb-16 md:text-3xl"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-purple-600">記事</span>からカードが生まれる
          </motion.h2>

          <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-center lg:justify-center lg:gap-0">
            {/* Article screenshot */}
            <motion.div
              className="flex-shrink-0"
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Image
                src="/promo/screenshot-article.webp"
                alt="記事ページ"
                width={760}
                height={540}
                className="w-full max-w-sm rounded-xl border border-gray-200 shadow-lg dark:border-gray-700 lg:max-w-[380px]"
              />
            </motion.div>

            {/* Arrow */}
            <motion.div
              className="flex items-center justify-center lg:w-24"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {/* Horizontal arrow (desktop) */}
              <div className="hidden items-center lg:flex">
                <div
                  className="h-1 w-10 rounded-sm"
                  style={{ background: 'linear-gradient(90deg, #7c3aed, #2563eb)' }}
                />
                <div
                  className="h-0 w-0"
                  style={{
                    borderTop: '12px solid transparent',
                    borderBottom: '12px solid transparent',
                    borderLeft: '18px solid #2563eb',
                  }}
                />
              </div>
              {/* Vertical arrow (mobile) */}
              <div className="flex flex-col items-center lg:hidden">
                <div
                  className="h-10 w-1 rounded-sm"
                  style={{ background: 'linear-gradient(180deg, #7c3aed, #2563eb)' }}
                />
                <div
                  className="h-0 w-0"
                  style={{
                    borderLeft: '12px solid transparent',
                    borderRight: '12px solid transparent',
                    borderTop: '18px solid #2563eb',
                  }}
                />
              </div>
            </motion.div>

            {/* Cards fan */}
            <motion.div
              className="relative flex flex-shrink-0 items-center justify-center"
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              {/* Fan layout on desktop */}
              <div className="relative hidden h-[480px] w-[580px] items-center justify-center lg:flex">
                {[
                  { src: '/promo/card-common.webp', rot: -10, tx: -195, alt: 'Common Card' },
                  { src: '/promo/card-rare.webp', rot: -3.5, tx: -68, alt: 'Rare Card' },
                  { src: '/promo/card-super-rare.webp', rot: 3.5, tx: 68, alt: 'Super Rare Card' },
                  { src: '/promo/card-legend.webp', rot: 10, tx: 195, alt: 'Legend Card' },
                ].map((card, i) => (
                  <div
                    key={i}
                    className="absolute"
                    style={{
                      transform: `rotate(${card.rot}deg) translateX(${card.tx}px)`,
                      zIndex: i + 1,
                    }}
                  >
                    <Image
                      src={card.src}
                      alt={card.alt}
                      width={300}
                      height={420}
                      className="w-[180px] rounded-lg shadow-lg"
                    />
                  </div>
                ))}
              </div>

              {/* Grid layout on mobile */}
              <div className="grid grid-cols-2 gap-3 lg:hidden">
                {[
                  { src: '/promo/card-common.webp', alt: 'Common Card' },
                  { src: '/promo/card-rare.webp', alt: 'Rare Card' },
                  { src: '/promo/card-super-rare.webp', alt: 'Super Rare Card' },
                  { src: '/promo/card-legend.webp', alt: 'Legend Card' },
                ].map((card, i) => (
                  <Image
                    key={i}
                    src={card.src}
                    alt={card.alt}
                    width={300}
                    height={420}
                    className="w-[160px] rounded-lg shadow-lg"
                  />
                ))}
              </div>
            </motion.div>
          </div>

          <motion.p
            className="mt-10 text-center text-sm text-gray-500 dark:text-gray-400 md:text-base"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            AIが記事のキーワードから多彩なカードを自動生成
          </motion.p>
        </div>
      </section>

      {/* ===== (C) Card Showcase Carousel Section ===== */}
      <section
        className="px-4 py-20 md:py-28"
        style={{
          background:
            'linear-gradient(135deg, #1e0a3c 0%, #2d1b69 25%, #1a1a6e 50%, #0d2b5e 75%, #0a1628 100%)',
        }}
      >
        <div className="mx-auto max-w-6xl">
          <motion.h2
            className="mb-12 text-center text-2xl font-bold text-white md:mb-16 md:text-3xl"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            カードコレクション
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <CardCarousel />
          </motion.div>
        </div>
      </section>

      {/* ===== (D) Challenge Mode Section ===== */}
      <section className="bg-white px-4 py-20 dark:bg-black md:py-28">
        <div className="mx-auto max-w-6xl">
          <motion.h2
            className="mb-12 text-center text-2xl font-bold text-gray-900 dark:text-white md:mb-16 md:text-3xl"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-purple-600">カード</span>で物語を紡ぐ
          </motion.h2>

          <motion.div
            className="flex flex-col gap-8 md:flex-row md:justify-center md:gap-10"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="flex flex-col items-center gap-3">
              <Image
                src="/promo/screenshot-challenge.webp"
                alt="チャレンジ画面"
                width={960}
                height={640}
                className="w-full max-w-md rounded-xl border border-gray-200 shadow-lg dark:border-gray-700"
              />
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                手持ちのカードで状況に挑む
              </p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <Image
                src="/promo/screenshot-score.webp"
                alt="スコア画面"
                width={960}
                height={640}
                className="w-full max-w-md rounded-xl border border-gray-200 shadow-lg dark:border-gray-700"
              />
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                AIがカードの適合度をリアルタイム評価
              </p>
            </div>
          </motion.div>

          {/* Scenario examples */}
          <motion.div
            className="mt-10 flex flex-wrap items-center justify-center gap-3"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <span className="text-xs font-semibold text-gray-400">シナリオ例:</span>
            {[
              { icon: '\u23F3', name: 'タイムトラベル' },
              { icon: '\u2694\uFE0F', name: '魔王討伐' },
              { icon: '\u{1F3DD}\uFE0F', name: '無人島' },
            ].map((scenario) => (
              <div
                key={scenario.name}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
              >
                <span className="text-lg">{scenario.icon}</span>
                <span className="text-xs font-bold text-gray-900 dark:text-white">
                  {scenario.name}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===== (E) Final CTA Section ===== */}
      <section
        className="px-4 py-20 md:py-28"
        style={{
          background:
            'linear-gradient(135deg, #1e0a3c 0%, #2d1b69 25%, #1a1a6e 50%, #0d2b5e 75%, #0a1628 100%)',
        }}
      >
        <motion.div
          className="flex flex-col items-center gap-8"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl font-bold text-white md:text-3xl">
            今すぐはじめよう
          </h2>
          <Link
            href="/register"
            className="rounded-full bg-gradient-to-r from-purple-600 to-blue-600 px-10 py-4 text-base font-bold text-white shadow-lg shadow-purple-500/30 transition hover:shadow-purple-500/50"
          >
            無料ではじめる
          </Link>
        </motion.div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="bg-gray-900 px-4 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6">
          <div className="flex items-center gap-3">
            <Image src="/logo/icon.webp" alt="ArtiCard" width={32} height={32} className="w-8" />
            <Image src="/logo/text.webp" alt="ArtiCard" width={128} height={32} className="w-24" />
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-400">
            <Link href="/terms" className="transition hover:text-white">
              利用規約
            </Link>
            <Link href="/privacy" className="transition hover:text-white">
              プライバシーポリシー
            </Link>
            <Link href="/commerce" className="transition hover:text-white">
              特定商取引法に基づく表記
            </Link>
            <Link href="/contact" className="transition hover:text-white">
              お問い合わせ
            </Link>
          </div>
          <p className="text-xs text-gray-500">
            &copy; 2026 Articard. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
