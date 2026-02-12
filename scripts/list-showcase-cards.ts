/**
 * ショーケース用カード一覧スクリプト
 *
 * Cloud SQL Proxy 経由で DB に接続し、見栄えの良いカードを一覧表示する。
 * ユーザーが選んで gsutil cp でダウンロードする。
 *
 * 前提: Cloud SQL Proxy が起動中であること
 *   ./cloud-sql-proxy.exe articard-ff673:asia-northeast1:articard-db --port 5433
 *
 * 使い方: npx tsx scripts/list-showcase-cards.ts
 *
 * オプション:
 *   --rarity <common|rare|super_rare|legend>  特定レアリティのみ表示
 *   --limit <number>                           表示件数（デフォルト: 各レアリティ10件）
 */

import { PrismaClient, Rarity } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const rarityArg = args.includes('--rarity')
    ? (args[args.indexOf('--rarity') + 1] as Rarity)
    : null;
  const limitArg = args.includes('--limit')
    ? parseInt(args[args.indexOf('--limit') + 1], 10)
    : 10;

  const rarities: Rarity[] = rarityArg
    ? [rarityArg]
    : ['common', 'rare', 'super_rare', 'legend'];

  console.log('=== ArtiCard ショーケース用カード一覧 ===\n');

  for (const rarity of rarities) {
    const cards = await prisma.card.findMany({
      where: {
        rarity,
        cardBackImageUrl: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      take: limitArg,
      select: {
        id: true,
        keyword: true,
        rarity: true,
        flavorText: true,
        cardImageUrl: true,
        cardBackImageUrl: true,
        createdAt: true,
      },
    });

    const rarityLabel = {
      common: 'Common',
      rare: 'Rare',
      super_rare: 'Super Rare',
      legend: 'Legend',
    }[rarity];

    console.log(`--- ${rarityLabel} (${cards.length}件) ---`);
    for (const card of cards) {
      console.log(`  keyword:  ${card.keyword}`);
      console.log(`  flavor:   ${card.flavorText}`);
      console.log(`  front:    ${card.cardImageUrl}`);
      console.log(`  back:     ${card.cardBackImageUrl}`);
      console.log(`  created:  ${card.createdAt.toISOString()}`);
      console.log('');
    }
  }

  console.log('\n--- gsutil ダウンロード例 ---');
  console.log(
    'gsutil cp gs://BUCKET_NAME/cards/CARD_ID-front.webp public/promo/cards/01-front.webp'
  );
  console.log(
    'gsutil cp gs://BUCKET_NAME/cards/CARD_ID-back.webp public/promo/cards/01-back.webp'
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
