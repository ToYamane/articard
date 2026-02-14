/**
 * /api/stripe/webhook API テスト
 * POST - Stripe Webhook処理
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/stripe/webhook/route';

// next/headers モック
const mockHeaders = jest.fn();
jest.mock('next/headers', () => ({
  headers: (...args: unknown[]) => mockHeaders(...args),
}));

// Stripeモック
const mockConstructEvent = jest.fn();
jest.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: { constructEvent: (...args: unknown[]) => mockConstructEvent(...args) },
  },
  STRIPE_PRICE_TO_TIER: { price_plus: 'plus', price_premium: 'premium' } as Record<string, string>,
}));

// Prismaモック
const mockUserFindFirst = jest.fn();
const mockUserUpdate = jest.fn();
const mockWebhookEventCreate = jest.fn();
const mockWebhookEventFindUnique = jest.fn();
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: (...args: unknown[]) => mockUserFindFirst(...args),
      update: (...args: unknown[]) => mockUserUpdate(...args),
    },
    stripeWebhookEvent: {
      create: (...args: unknown[]) => mockWebhookEventCreate(...args),
      findUnique: (...args: unknown[]) => mockWebhookEventFindUnique(...args),
    },
  },
}));

// Prisma エラークラスモック
jest.mock('@prisma/client', () => ({
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string;
      constructor(message: string, { code }: { code: string }) {
        super(message);
        this.code = code;
        this.name = 'PrismaClientKnownRequestError';
      }
    },
  },
}));

// subscription-service モック
const mockActivateSubscription = jest.fn();
const mockCancelSubscription = jest.fn();
jest.mock('@/lib/services/subscription-service', () => ({
  activateSubscription: (...args: unknown[]) => mockActivateSubscription(...args),
  cancelSubscription: (...args: unknown[]) => mockCancelSubscription(...args),
}));

function createWebhookRequest(body = 'raw-body-string'): NextRequest {
  return new NextRequest('http://localhost:3000/api/stripe/webhook', {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('/api/stripe/webhook', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, STRIPE_WEBHOOK_SECRET: 'whsec_test' };
    mockHeaders.mockResolvedValue(new Headers({ 'stripe-signature': 'sig_test' }));
    mockWebhookEventFindUnique.mockResolvedValue(null); // No existing event (not a duplicate)
    mockWebhookEventCreate.mockResolvedValue({
      id: 'wh-1',
      eventId: 'evt_test',
      eventType: 'test',
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('署名検証', () => {
    it('stripe-signatureヘッダーがない場合、400を返す', async () => {
      mockHeaders.mockResolvedValue(new Headers()); // no stripe-signature

      const req = createWebhookRequest();
      const response = await POST(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Missing signature');
    });

    it('STRIPE_WEBHOOK_SECRETが未設定の場合、500を返す', async () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;

      const req = createWebhookRequest();
      const response = await POST(req);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Webhook secret not configured');
    });

    it('署名検証失敗の場合、400を返す', async () => {
      mockConstructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const req = createWebhookRequest();
      const response = await POST(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid signature');
    });
  });

  describe('checkout.session.completed', () => {
    it('Checkout完了時にサブスクリプションを有効化する', async () => {
      mockConstructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test',
            metadata: { userId: 'user-1', tier: 'plus' },
            subscription: 'sub_test_123',
          },
        },
      });
      mockUserUpdate.mockResolvedValue({});
      mockActivateSubscription.mockResolvedValue({ success: true });

      const req = createWebhookRequest();
      const response = await POST(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.received).toBe(true);

      // subscriptionIdを保存
      expect(mockUserUpdate).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { stripeSubscriptionId: 'sub_test_123' },
      });

      // サブスクリプション有効化
      expect(mockActivateSubscription).toHaveBeenCalledWith('user-1', 'plus');
    });

    it('metadataにuserIdがない場合、処理をスキップする', async () => {
      mockConstructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test',
            metadata: {},
            subscription: 'sub_test_123',
          },
        },
      });

      const req = createWebhookRequest();
      const response = await POST(req);

      expect(response.status).toBe(200);
      expect(mockActivateSubscription).not.toHaveBeenCalled();
    });
  });

  describe('customer.subscription.updated', () => {
    it('プラン変更があった場合にサブスクリプションを更新する', async () => {
      mockConstructEvent.mockReturnValue({
        type: 'customer.subscription.updated',
        data: {
          object: {
            customer: 'cus_test',
            status: 'active',
            items: {
              data: [{ price: { id: 'price_premium' } }],
            },
          },
        },
      });
      mockUserFindFirst.mockResolvedValue({
        id: 'user-1',
        subscriptionTier: 'plus', // was plus, now premium
      });
      mockActivateSubscription.mockResolvedValue({ success: true });

      const req = createWebhookRequest();
      const response = await POST(req);

      expect(response.status).toBe(200);
      expect(mockActivateSubscription).toHaveBeenCalledWith('user-1', 'premium');
    });

    it('プラン変更がない場合はスキップする', async () => {
      mockConstructEvent.mockReturnValue({
        type: 'customer.subscription.updated',
        data: {
          object: {
            customer: 'cus_test',
            status: 'active',
            items: {
              data: [{ price: { id: 'price_plus' } }],
            },
          },
        },
      });
      mockUserFindFirst.mockResolvedValue({
        id: 'user-1',
        subscriptionTier: 'plus', // same tier
      });

      const req = createWebhookRequest();
      const response = await POST(req);

      expect(response.status).toBe(200);
      expect(mockActivateSubscription).not.toHaveBeenCalled();
    });

    it('canceledステータスの場合に解約処理を行う', async () => {
      mockConstructEvent.mockReturnValue({
        type: 'customer.subscription.updated',
        data: {
          object: {
            customer: 'cus_test',
            status: 'canceled',
            items: { data: [] },
          },
        },
      });
      mockUserFindFirst.mockResolvedValue({
        id: 'user-1',
        subscriptionTier: 'plus',
      });
      mockCancelSubscription.mockResolvedValue(undefined);

      const req = createWebhookRequest();
      const response = await POST(req);

      expect(response.status).toBe(200);
      expect(mockCancelSubscription).toHaveBeenCalledWith('user-1');
    });

    it('unpaidステータスの場合に解約処理を行う', async () => {
      mockConstructEvent.mockReturnValue({
        type: 'customer.subscription.updated',
        data: {
          object: {
            customer: 'cus_test',
            status: 'unpaid',
            items: { data: [] },
          },
        },
      });
      mockUserFindFirst.mockResolvedValue({
        id: 'user-1',
        subscriptionTier: 'plus',
      });
      mockCancelSubscription.mockResolvedValue(undefined);

      const req = createWebhookRequest();
      const response = await POST(req);

      expect(response.status).toBe(200);
      expect(mockCancelSubscription).toHaveBeenCalledWith('user-1');
    });

    it('ユーザーが見つからない場合は処理をスキップする', async () => {
      mockConstructEvent.mockReturnValue({
        type: 'customer.subscription.updated',
        data: {
          object: {
            customer: 'cus_unknown',
            status: 'active',
            items: {
              data: [{ price: { id: 'price_plus' } }],
            },
          },
        },
      });
      mockUserFindFirst.mockResolvedValue(null);

      const req = createWebhookRequest();
      const response = await POST(req);

      expect(response.status).toBe(200);
      expect(mockActivateSubscription).not.toHaveBeenCalled();
    });
  });

  describe('customer.subscription.deleted', () => {
    it('サブスクリプション削除時に解約処理を行う', async () => {
      mockConstructEvent.mockReturnValue({
        type: 'customer.subscription.deleted',
        data: {
          object: {
            customer: 'cus_test',
          },
        },
      });
      mockUserFindFirst.mockResolvedValue({
        id: 'user-1',
        subscriptionTier: 'plus',
      });
      mockCancelSubscription.mockResolvedValue(undefined);
      mockUserUpdate.mockResolvedValue({});

      const req = createWebhookRequest();
      const response = await POST(req);

      expect(response.status).toBe(200);
      expect(mockCancelSubscription).toHaveBeenCalledWith('user-1');

      // stripeSubscriptionIdをnullにする
      expect(mockUserUpdate).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { stripeSubscriptionId: null },
      });
    });

    it('ユーザーが見つからない場合は処理をスキップする', async () => {
      mockConstructEvent.mockReturnValue({
        type: 'customer.subscription.deleted',
        data: {
          object: {
            customer: 'cus_unknown',
          },
        },
      });
      mockUserFindFirst.mockResolvedValue(null);

      const req = createWebhookRequest();
      const response = await POST(req);

      expect(response.status).toBe(200);
      expect(mockCancelSubscription).not.toHaveBeenCalled();
    });
  });

  describe('invoice.paid', () => {
    it('renewal（subscription_cycle）の場合にactivateSubscriptionが呼ばれる', async () => {
      mockConstructEvent.mockReturnValue({
        type: 'invoice.paid',
        data: {
          object: {
            id: 'inv_renewal',
            billing_reason: 'subscription_cycle',
            customer: 'cus_test',
            lines: {
              data: [{ pricing: { price_details: { price: { id: 'price_plus' } } } }],
            },
          },
        },
      });
      mockUserFindFirst.mockResolvedValue({
        id: 'user-1',
        subscriptionTier: 'plus',
      });
      mockActivateSubscription.mockResolvedValue({ success: true });

      const req = createWebhookRequest();
      const response = await POST(req);

      expect(response.status).toBe(200);
      expect(mockActivateSubscription).toHaveBeenCalledWith('user-1', 'plus');
    });

    it('初回支払い（subscription_create）の場合はスキップされる', async () => {
      mockConstructEvent.mockReturnValue({
        type: 'invoice.paid',
        data: {
          object: {
            id: 'inv_initial',
            billing_reason: 'subscription_create',
            customer: 'cus_test',
            lines: {
              data: [{ pricing: { price_details: { price: { id: 'price_plus' } } } }],
            },
          },
        },
      });

      const req = createWebhookRequest();
      const response = await POST(req);

      expect(response.status).toBe(200);
      expect(mockActivateSubscription).not.toHaveBeenCalled();
      expect(mockUserFindFirst).not.toHaveBeenCalled();
    });

    it('ユーザーが見つからない場合はスキップする', async () => {
      mockConstructEvent.mockReturnValue({
        type: 'invoice.paid',
        data: {
          object: {
            id: 'inv_renewal',
            billing_reason: 'subscription_cycle',
            customer: 'cus_unknown',
            lines: {
              data: [{ pricing: { price_details: { price: { id: 'price_plus' } } } }],
            },
          },
        },
      });
      mockUserFindFirst.mockResolvedValue(null);

      const req = createWebhookRequest();
      const response = await POST(req);

      expect(response.status).toBe(200);
      expect(mockActivateSubscription).not.toHaveBeenCalled();
    });
  });

  describe('invoice.payment_failed', () => {
    it('支払い失敗イベントを処理する', async () => {
      mockConstructEvent.mockReturnValue({
        type: 'invoice.payment_failed',
        data: {
          object: {
            customer: 'cus_test',
          },
        },
      });
      mockUserFindFirst.mockResolvedValue({
        id: 'user-1',
      });

      const req = createWebhookRequest();
      const response = await POST(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.received).toBe(true);
    });

    it('ユーザーが見つからない場合でも200を返す', async () => {
      mockConstructEvent.mockReturnValue({
        type: 'invoice.payment_failed',
        data: {
          object: {
            customer: 'cus_unknown',
          },
        },
      });
      mockUserFindFirst.mockResolvedValue(null);

      const req = createWebhookRequest();
      const response = await POST(req);

      expect(response.status).toBe(200);
    });
  });

  describe('未処理のイベント', () => {
    it('未処理のイベントタイプでも200を返す', async () => {
      mockConstructEvent.mockReturnValue({
        type: 'some.unknown.event',
        data: { object: {} },
      });

      const req = createWebhookRequest();
      const response = await POST(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.received).toBe(true);
    });
  });

  describe('ハンドラーエラー', () => {
    it('ハンドラーでエラーが発生した場合、500を返す', async () => {
      mockConstructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test',
            metadata: { userId: 'user-1', tier: 'plus' },
            subscription: 'sub_test_123',
          },
        },
      });
      mockUserUpdate.mockRejectedValue(new Error('DB error'));

      const req = createWebhookRequest();
      const response = await POST(req);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Webhook handler failed');
    });
  });

  describe('冪等性チェック', () => {
    it('重複イベントは処理をスキップして200を返す', async () => {
      mockConstructEvent.mockReturnValue({
        id: 'evt_duplicate',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test',
            metadata: { userId: 'user-1', tier: 'plus' },
            subscription: 'sub_test_123',
          },
        },
      });

      // findUniqueが既存レコードを返す = 重複
      mockWebhookEventFindUnique.mockResolvedValue({
        id: 'wh-1',
        eventId: 'evt_duplicate',
        eventType: 'checkout.session.completed',
      });

      const req = createWebhookRequest();
      const response = await POST(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.received).toBe(true);

      // ハンドラーは呼ばれない
      expect(mockActivateSubscription).not.toHaveBeenCalled();
      expect(mockUserUpdate).not.toHaveBeenCalled();
    });

    it('新規イベントは正常に処理される', async () => {
      mockConstructEvent.mockReturnValue({
        id: 'evt_new',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test',
            metadata: { userId: 'user-1', tier: 'plus' },
            subscription: 'sub_test_123',
          },
        },
      });
      mockWebhookEventFindUnique.mockResolvedValue(null); // Not a duplicate
      mockWebhookEventCreate.mockResolvedValue({ id: 'wh-1' });
      mockUserUpdate.mockResolvedValue({});
      mockActivateSubscription.mockResolvedValue({ success: true });

      const req = createWebhookRequest();
      const response = await POST(req);

      expect(response.status).toBe(200);
      // Idempotency record created after successful processing
      expect(mockWebhookEventCreate).toHaveBeenCalledWith({
        data: { eventId: 'evt_new', eventType: 'checkout.session.completed' },
      });
      expect(mockActivateSubscription).toHaveBeenCalledWith('user-1', 'plus');
    });
  });
});
