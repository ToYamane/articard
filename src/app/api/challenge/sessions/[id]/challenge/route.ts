import { withAuthParams } from '@/lib/api/with-auth';
import { getCurrentPhaseChallenge } from '@/lib/services/challenge-service';
import type { PhaseChallenge, PhaseDefinition } from '@/types/challenge';

interface ChallengeResponse {
  challenge: PhaseChallenge;
  phaseDefinition: PhaseDefinition;
  availableCards: Array<{
    id: string;
    keyword: string;
    rarity: string;
    thumbnailUrl: string;
    cardImageUrl: string;
    flavorText: string;
    contextDescription: string;
  }>;
  totalPhases: number;
}

// 現在のフェーズチャレンジ取得
export const GET = withAuthParams<ChallengeResponse>(async (authUser, _req, { id }) => {
  const result = await getCurrentPhaseChallenge(id, authUser.uid);
  return result as ChallengeResponse;
});
