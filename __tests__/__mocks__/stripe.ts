// Stripe モック

// Stripe SDKのモック関数
export const mockStripeCustomersCreate = jest.fn();
export const mockStripeCheckoutSessionsCreate = jest.fn();
export const mockStripeWebhooksConstructEvent = jest.fn();
export const mockStripeSubscriptionsCancel = jest.fn();
export const mockStripeSubscriptionsRetrieve = jest.fn();
export const mockStripeSubscriptionsUpdate = jest.fn();

// Stripeクライアントモック
export const mockStripe = {
  customers: {
    create: (...args: unknown[]) => mockStripeCustomersCreate(...args),
  },
  checkout: {
    sessions: {
      create: (...args: unknown[]) => mockStripeCheckoutSessionsCreate(...args),
    },
  },
  subscriptions: {
    cancel: (...args: unknown[]) => mockStripeSubscriptionsCancel(...args),
    retrieve: (...args: unknown[]) => mockStripeSubscriptionsRetrieve(...args),
    update: (...args: unknown[]) => mockStripeSubscriptionsUpdate(...args),
  },
  webhooks: {
    constructEvent: (...args: unknown[]) => mockStripeWebhooksConstructEvent(...args),
  },
};

// Price ID → Tier マッピングのモック
export const mockGetPriceIdForTier = jest.fn();

export const MOCK_STRIPE_PRICE_TO_TIER: Record<string, 'plus' | 'premium'> = {
  'price_plus_test': 'plus',
  'price_premium_test': 'premium',
};

// Stripeモックをリセット
export function resetStripeMock() {
  mockStripeCustomersCreate.mockReset();
  mockStripeCheckoutSessionsCreate.mockReset();
  mockStripeWebhooksConstructEvent.mockReset();
  mockStripeSubscriptionsCancel.mockReset();
  mockStripeSubscriptionsRetrieve.mockReset();
  mockStripeSubscriptionsUpdate.mockReset();
  mockGetPriceIdForTier.mockReset();
}
