// Challenge Mode AI - Challenge generation and card evaluation

import { getOpenAIClient } from './client';
import type { PhaseDefinition, PhaseChallenge, CardEvaluation } from '@/types/challenge';
import type { Rarity } from '@/types/database';
import { RARITY_BONUS, MAX_SYNERGY_BONUS, MAX_TRIPLE_SYNERGY_BONUS } from '@/types/challenge';

// Card info for AI evaluation
interface CardInfo {
  id: string;
  keyword: string;
  rarity: Rarity;
  flavorText: string;
  contextDescription: string;
}

// Generate challenge prompt
const CHALLENGE_GENERATION_PROMPT = `You are a creative game master for a challenge game. Generate an exciting challenge based on the phase information.

Scenario: {scenarioTitle}
Phase {phaseNumber}: {phaseTitle}
Phase Description: {phaseDescription}

Player's available cards (keywords only, for reference):
{cardKeywords}

Rules:
1. Create a specific, dramatic situation that fits the phase theme
2. The challenge should be abstract enough that various cards could potentially solve it
3. Do NOT reference any specific card keywords directly
4. Keep the tone exciting and slightly humorous
5. The hint should be vague and inspiring, not prescriptive

Respond in JSON format:
{
  "situation": "Description of the dramatic situation (2-3 sentences)",
  "challenge": "What the player needs to accomplish (1-2 sentences)",
  "hint": "A cryptic hint for card selection (1 sentence)"
}

Respond in Japanese.`;

// Card evaluation prompt
const CARD_EVALUATION_PROMPT = `You are an entertaining game commentator evaluating how well a player's card(s) solve a challenge.

Challenge Situation: {situation}
Challenge Task: {challenge}

Selected Card(s):
{cardDetails}

Phase Type: {phaseType} (single card / combo of 2 cards / triple combo of 3 cards)

Evaluate how well the card(s) solve the challenge. Be creative in finding connections!

Rules:
1. fitScore: 0-100 based on how well the card concept could solve the challenge
   - 90-100: Perfect or brilliant connection
   - 60-89: Good connection with some creativity
   - 30-59: Tenuous but amusing connection
   - 0-29: Almost no connection, but find humor in the attempt
2. connectionExplanation: Explain why this card works (or amusingly doesn't)
3. narrativeDescription: Write a dramatic 3-5 sentence story of what happens
4. humorComment: A witty one-liner commentary
   - High score: Celebrate the brilliance
   - Medium score: Acknowledge the creativity with gentle teasing
   - Low score: Good-natured ribbing about the unusual choice

For combo evaluations (2 cards) and triple evaluations (3 cards), also consider synergy between the cards.

Respond in JSON format:
{
  "fitScore": <number 0-100>,
  "connectionExplanation": "<explanation>",
  "narrativeDescription": "<dramatic story>",
  "humorComment": "<witty comment>"
}

Respond in Japanese. Be entertaining and fun, never mean-spirited.`;

/**
 * Generate a challenge for a phase
 */
export async function generatePhaseChallenge(
  scenarioTitle: string,
  phase: PhaseDefinition,
  deckCards: CardInfo[]
): Promise<PhaseChallenge> {
  const client = getOpenAIClient();

  const prompt = CHALLENGE_GENERATION_PROMPT
    .replace('{scenarioTitle}', scenarioTitle)
    .replace('{phaseNumber}', phase.phaseNumber.toString())
    .replace('{phaseTitle}', phase.title)
    .replace('{phaseDescription}', phase.description)
    .replace('{cardKeywords}', deckCards.map((c) => c.keyword).join(', '));

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.9,
    max_tokens: 500,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('チャレンジの生成に失敗しました');
  }

  const parsed = JSON.parse(content);

  return {
    phaseNumber: phase.phaseNumber,
    title: phase.title,
    situation: parsed.situation,
    challenge: parsed.challenge,
    hint: parsed.hint,
  };
}

/**
 * Evaluate card(s) for a challenge
 */
export async function evaluateCardSelection(
  situation: string,
  challenge: string,
  selectedCards: CardInfo[],
  phaseType: 'single' | 'combo' | 'triple'
): Promise<CardEvaluation> {
  const client = getOpenAIClient();

  // Format card details for the prompt
  const cardDetails = selectedCards
    .map(
      (card, index) =>
        `Card ${index + 1}:
- Keyword: ${card.keyword}
- Rarity: ${card.rarity}
- Flavor: ${card.flavorText}
- Context: ${card.contextDescription}`
    )
    .join('\n\n');

  const prompt = CARD_EVALUATION_PROMPT
    .replace('{situation}', situation)
    .replace('{challenge}', challenge)
    .replace('{cardDetails}', cardDetails)
    .replace('{phaseType}', phaseType === 'triple' ? 'triple combo of 3 cards' : phaseType === 'combo' ? 'combo of 2 cards' : 'single card');

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
    max_tokens: 800,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('カード評価の生成に失敗しました');
  }

  const parsed = JSON.parse(content);

  // Ensure fitScore is within bounds
  const fitScore = Math.min(100, Math.max(0, Math.round(parsed.fitScore)));

  // Calculate bonus score
  let bonusScore = 0;

  // Rarity bonus
  for (const card of selectedCards) {
    bonusScore += RARITY_BONUS[card.rarity as Rarity] || 0;
  }

  // Synergy bonus for combo (AI-determined, simplified)
  if (phaseType === 'combo' && selectedCards.length === 2) {
    // Give synergy bonus based on fit score for combos
    // Higher fit score = AI found good synergy
    const synergyBonus = Math.round((fitScore / 100) * MAX_SYNERGY_BONUS);
    bonusScore += synergyBonus;
  }

  // Synergy bonus for triple (AI-determined, simplified)
  if (phaseType === 'triple' && selectedCards.length === 3) {
    // Give synergy bonus based on fit score for triple combos
    // Higher fit score = AI found good synergy
    const synergyBonus = Math.round((fitScore / 100) * MAX_TRIPLE_SYNERGY_BONUS);
    bonusScore += synergyBonus;
  }

  const totalScore = fitScore + bonusScore;

  return {
    fitScore,
    bonusScore,
    totalScore,
    connectionExplanation: parsed.connectionExplanation,
    narrativeDescription: parsed.narrativeDescription,
    humorComment: parsed.humorComment,
  };
}

/**
 * Generate a final summary for completed challenge
 */
export async function generateChallengeSummary(
  scenarioTitle: string,
  totalScore: number,
  phaseResults: Array<{
    phaseTitle: string;
    cardKeywords: string[];
    fitScore: number;
  }>
): Promise<string> {
  const client = getOpenAIClient();

  const phasesSummary = phaseResults
    .map(
      (p, i) =>
        `Phase ${i + 1} (${p.phaseTitle}): Used ${p.cardKeywords.join(' + ')} - Score: ${p.fitScore}`
    )
    .join('\n');

  // Determine rank for summary context
  const rank = totalScore >= 450 ? 'S' : totalScore >= 350 ? 'A' : totalScore >= 250 ? 'B' : 'C';

  const prompt = `You are a dramatic challenge game narrator. Write a fun summary of the player's challenge.

Scenario: ${scenarioTitle}
Final Rank: ${rank}
Phase Results:
${phasesSummary}

Write a 3-4 sentence summary that:
1. Dramatically recaps the challenge
2. Highlights the most memorable card usage
3. Comments on the final rank (S=legendary, A=excellent, B=good, C=needs improvement) - do NOT mention specific scores or numbers
4. Ends with an encouraging or humorous note

Respond in Japanese. Be entertaining!`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.9,
    max_tokens: 400,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    return '素晴らしいチャレンジでした！また挑戦してください。';
  }

  return content.trim();
}
