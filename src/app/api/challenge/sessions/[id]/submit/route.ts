import { withAuthParams } from '@/lib/api/with-auth';
import { parseBody } from '@/lib/api/validation';
import { submitCardsSchema } from '@/lib/validations/challenge';
import { submitPhaseCards } from '@/lib/services/challenge-service';

interface SubmitResult {
  phaseNumber: number;
  challenge: string;
  selectedCards: Array<{
    id: string;
    keyword: string;
    rarity: string;
  }>;
  evaluation: {
    fitScore: number;
    bonusScore: number;
    totalScore: number;
    connectionExplanation: string;
    narrativeDescription: string;
    humorComment: string;
  };
  sessionTotalScore: number;
  isComplete: boolean;
  phases?: Array<{
    phaseNumber: number;
    fitScore: number;
    bonusScore: number;
    totalScore: number;
  }>;
  summary?: string;
}

// カード提出
export const POST = withAuthParams<SubmitResult>(async (authUser, req, { id }) => {
  const { data, error } = await parseBody(req, submitCardsSchema);
  if (error) return error;

  return submitPhaseCards(id, authUser.uid, data.cardIds);
}, { rateLimit: 'expensive' });
