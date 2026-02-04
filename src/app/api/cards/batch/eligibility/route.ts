import { withAuth } from '@/lib/api';
import { batchEligibilityQuerySchema } from '@/lib/validations/card';
import { getAvailableKeywordCount } from '@/lib/services/card-service';
import { canUseBatchGeneration } from '@/lib/services/subscription-service';
import { getBalances } from '@/lib/services/coin-service';
import { BATCH_CARD_CONFIG, COIN_COSTS } from '@/lib/constants/coins';

interface BatchEligibilityResponse {
  /** サブスク加入者で機能利用可能か */
  eligible: boolean;
  /** 最大同時生成枚数 */
  maxBatchSize: number;
  /** この記事で利用可能なキーワード数（articleId指定時のみ） */
  availableKeywords: number | null;
  /** 現在のコイン残高 */
  coinBalance: number;
  /** 1枚あたりのコスト */
  costPerCard: number;
  /** コインで生成可能な最大枚数 */
  maxAffordable: number;
}

/**
 * バッチカード生成の資格・情報を取得
 * GET /api/cards/batch/eligibility
 * GET /api/cards/batch/eligibility?articleId=xxx（オプション）
 */
export const GET = withAuth<BatchEligibilityResponse>(async (authUser, req) => {
  const { searchParams } = new URL(req.url);
  const articleIdParam = searchParams.get('articleId');
  const queryParams = {
    articleId: articleIdParam || undefined,
  };

  const { articleId } = batchEligibilityQuerySchema.parse(queryParams);

  // 基本情報を並列で取得
  const [eligible, balances] = await Promise.all([
    canUseBatchGeneration(authUser.uid),
    getBalances(authUser.uid),
  ]);

  // articleIdがある場合のみキーワード数を取得
  let availableKeywords: number | null = null;
  if (articleId) {
    const keywordInfo = await getAvailableKeywordCount(articleId, authUser.uid);
    availableKeywords = keywordInfo.available;
  }

  const costPerCard = COIN_COSTS.CARD_GENERATION;
  const maxAffordable = Math.floor(balances.totalAvailable / costPerCard);

  return {
    eligible,
    maxBatchSize: BATCH_CARD_CONFIG.MAX_BATCH_SIZE,
    availableKeywords,
    coinBalance: balances.totalAvailable,
    costPerCard,
    maxAffordable,
  };
});
