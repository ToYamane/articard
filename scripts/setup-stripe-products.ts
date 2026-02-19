/**
 * Stripe 商品・価格セットアップスクリプト
 *
 * テスト環境・本番環境で必要な商品（プラス/プレミアム）と
 * 月額定期価格を Stripe API で作成し、.env に Price ID を書き込む。
 *
 * 冪等: メタデータ `app: articard` で既存商品を検索し、存在すればスキップ。
 *
 * 使い方: npx tsx scripts/setup-stripe-products.ts
 *
 * 前提: .env に STRIPE_SECRET_KEY が設定されていること
 */

import Stripe from 'stripe';
import * as fs from 'fs';
import * as path from 'path';

// ── 定数 ──────────────────────────────────────────

const PRODUCTS = [
  {
    name: 'Articard プラス',
    description: '月間コイン増量・広告非表示',
    envKey: 'STRIPE_PRICE_PLUS',
    metadataKey: 'articard_plus',
    amount: 980,
  },
  {
    name: 'Articard プレミアム',
    description: '全機能アクセス・最大コイン付与',
    envKey: 'STRIPE_PRICE_PREMIUM',
    metadataKey: 'articard_premium',
    amount: 2980,
  },
] as const;

const COIN_PRODUCTS = [
  {
    name: 'Articard コイン スタンダード (600コイン)',
    envKey: 'STRIPE_PRICE_COIN_STANDARD',
    metadataKey: 'articard_coin_standard',
    amount: 980,
  },
  {
    name: 'Articard コイン バリュー (2100コイン)',
    envKey: 'STRIPE_PRICE_COIN_VALUE',
    metadataKey: 'articard_coin_value',
    amount: 2980,
  },
  {
    name: 'Articard コイン メガ (6000コイン)',
    envKey: 'STRIPE_PRICE_COIN_MEGA',
    metadataKey: 'articard_coin_mega',
    amount: 6980,
  },
] as const;

const API_VERSION = '2025-12-15.clover' as const;

// ── ヘルパー ──────────────────────────────────────

const info = (msg: string) => console.log(`[INFO] ${msg}`);
const done = (msg: string) => console.log(`[DONE] ${msg}`);
const warn = (msg: string) => console.log(`[WARN] ${msg}`);

function updateEnvFile(envPath: string, key: string, value: string): void {
  let content = '';
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf-8');
  }

  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${value}`);
  } else {
    content = content.trimEnd() + `\n${key}=${value}\n`;
  }

  fs.writeFileSync(envPath, content, 'utf-8');
  info(`.env 更新: ${key}=${value}`);
}

// ── メイン ────────────────────────────────────────

async function main() {
  // .env を読み込み（dotenv 不要で直接パース）
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex);
      const value = trimmed.slice(eqIndex + 1).replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY が .env に設定されていません');
  }

  const isLive = secretKey.startsWith('sk_live_');
  const mode = isLive ? '本番モード' : 'テストモード';

  const stripe = new Stripe(secretKey, {
    apiVersion: API_VERSION,
    typescript: true,
  });

  info(`Stripe API接続確認 (${mode})`);

  // 既存商品を検索
  info('既存商品を検索中...');
  const existingProducts = await stripe.products.list({ limit: 100, active: true });

  const results: Record<string, string> = {};

  for (const product of PRODUCTS) {
    // メタデータで既存チェック
    const existing = existingProducts.data.find(
      (p) => p.metadata?.articard_tier === product.metadataKey
    );

    let productId: string;

    if (existing) {
      warn(`商品スキップ (既存): ${existing.name} (${existing.id})`);
      productId = existing.id;

      // 既存の有効な価格を探す
      const existingPrices = await stripe.prices.list({
        product: productId,
        active: true,
        limit: 10,
      });

      const matchingPrice = existingPrices.data.find(
        (p) =>
          p.unit_amount === product.amount &&
          p.currency === 'jpy' &&
          p.recurring?.interval === 'month'
      );

      if (matchingPrice) {
        warn(`価格スキップ (既存): ¥${product.amount}/月 (${matchingPrice.id})`);
        results[product.envKey] = matchingPrice.id;
        continue;
      }
    } else {
      // 商品作成
      const created = await stripe.products.create({
        name: product.name,
        description: product.description,
        metadata: {
          app: 'articard',
          articard_tier: product.metadataKey,
        },
      });
      info(`商品作成: ${product.name} (${created.id})`);
      productId = created.id;
    }

    // 価格作成
    const price = await stripe.prices.create({
      product: productId,
      unit_amount: product.amount,
      currency: 'jpy',
      recurring: { interval: 'month' },
      metadata: {
        app: 'articard',
        articard_tier: product.metadataKey,
      },
    });
    info(`価格作成: ¥${product.amount}/月 (${price.id})`);
    results[product.envKey] = price.id;
  }

  // コイン商品（一回払い）の作成
  for (const product of COIN_PRODUCTS) {
    const existing = existingProducts.data.find(
      (p) => p.metadata?.articard_tier === product.metadataKey
    );

    let productId: string;

    if (existing) {
      warn(`商品スキップ (既存): ${existing.name} (${existing.id})`);
      productId = existing.id;

      const existingPrices = await stripe.prices.list({
        product: productId,
        active: true,
        limit: 10,
      });

      const matchingPrice = existingPrices.data.find(
        (p) => p.unit_amount === product.amount && p.currency === 'jpy' && p.recurring === null
      );

      if (matchingPrice) {
        warn(`価格スキップ (既存): ¥${product.amount} (${matchingPrice.id})`);
        results[product.envKey] = matchingPrice.id;
        continue;
      }
    } else {
      const created = await stripe.products.create({
        name: product.name,
        metadata: {
          app: 'articard',
          articard_tier: product.metadataKey,
        },
      });
      info(`商品作成: ${product.name} (${created.id})`);
      productId = created.id;
    }

    const price = await stripe.prices.create({
      product: productId,
      unit_amount: product.amount,
      currency: 'jpy',
      metadata: {
        app: 'articard',
        articard_tier: product.metadataKey,
      },
    });
    info(`価格作成: ¥${product.amount} (${price.id})`);
    results[product.envKey] = price.id;
  }

  // .env に書き込み
  for (const product of [...PRODUCTS, ...COIN_PRODUCTS]) {
    const priceId = results[product.envKey];
    if (priceId) {
      updateEnvFile(envPath, product.envKey, priceId);
    }
  }

  console.log('');
  done('セットアップ完了');

  if (isLive) {
    info('本番用 Price ID を Secret Manager に反映するには:');
    info('  ./scripts/setup-secrets.sh .env');
  }
}

main().catch((err) => {
  console.error('[ERROR]', err.message || err);
  process.exit(1);
});
