/**
 * Framer Motion アニメーションプリセット
 *
 * 使用例:
 * import { fadeInUp, hoverScale } from '@/lib/animations';
 * <motion.div {...fadeInUp} {...hoverScale}>...</motion.div>
 */

/** フェードイン + 上方向スライド */
export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

/** シンプルなフェードイン */
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.2 },
};

/** スケールイン（モーダル向け） */
export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.2 },
};

/** ホバー/タップスケール効果 */
export const hoverScale = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
};

/** 小さめのホバースケール（カード向け） */
export const hoverScaleSmall = {
  whileHover: { scale: 1.01 },
  whileTap: { scale: 0.99 },
};

/**
 * スタガーコンテナ（子要素を順次アニメーション）
 * @param staggerChildren - 子要素間のディレイ（秒）
 */
export const staggerContainer = (staggerChildren = 0.1) => ({
  animate: {
    transition: { staggerChildren },
  },
});

/** スタガーアイテム（staggerContainerと組み合わせて使用） */
export const staggerItem = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

/**
 * ディレイ付きフェードイン
 * @param delay - アニメーション開始までのディレイ（秒）
 */
export const fadeInUpWithDelay = (delay: number) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay },
});

/** スライドイン（左から） */
export const slideInLeft = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.3 },
};

/** スライドイン（右から） */
export const slideInRight = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.3 },
};
