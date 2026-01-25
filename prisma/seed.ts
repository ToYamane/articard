import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// カテゴリ別のおすすめテーマ
const suggestedThemes = [
  // 科学・自然
  { theme: '光合成のしくみ', category: '科学' },
  { theme: '宇宙の誕生', category: '科学' },
  { theme: 'ブラックホールの謎', category: '科学' },
  { theme: 'DNAと遺伝の仕組み', category: '科学' },
  { theme: '地震が起きる理由', category: '科学' },
  { theme: '虹ができる仕組み', category: '科学' },
  { theme: '火山の噴火', category: '科学' },
  { theme: '雷のメカニズム', category: '科学' },
  { theme: '月の満ち欠け', category: '科学' },
  { theme: 'オーロラの発生原理', category: '科学' },

  // 歴史
  { theme: '万有引力の発見', category: '歴史' },
  { theme: '恐竜の絶滅', category: '歴史' },
  { theme: 'ピラミッドの建設', category: '歴史' },
  { theme: '産業革命', category: '歴史' },
  { theme: 'ルネサンスの時代', category: '歴史' },
  { theme: '大航海時代', category: '歴史' },
  { theme: '古代ローマ帝国', category: '歴史' },
  { theme: 'シルクロードの歴史', category: '歴史' },
  { theme: '日本の城の歴史', category: '歴史' },
  { theme: 'ペニシリンの発見', category: '歴史' },

  // 生物・動物
  { theme: 'ミツバチの社会', category: '生物' },
  { theme: 'イルカの知能', category: '生物' },
  { theme: '渡り鳥の不思議', category: '生物' },
  { theme: 'サンゴ礁の生態系', category: '生物' },
  { theme: 'クジラの生態', category: '生物' },
  { theme: 'アリの巣の構造', category: '生物' },
  { theme: 'ホタルが光る理由', category: '生物' },
  { theme: 'カメレオンの変色', category: '生物' },
  { theme: '深海生物の世界', category: '生物' },
  { theme: '植物の防御機構', category: '生物' },

  // テクノロジー
  { theme: '人工知能の仕組み', category: 'テクノロジー' },
  { theme: 'インターネットの歴史', category: 'テクノロジー' },
  { theme: 'ロケット技術', category: 'テクノロジー' },
  { theme: '電気自動車の仕組み', category: 'テクノロジー' },
  { theme: '3Dプリンターの技術', category: 'テクノロジー' },
  { theme: 'スマートフォンの進化', category: 'テクノロジー' },
  { theme: 'VR技術の仕組み', category: 'テクノロジー' },
  { theme: 'ドローンの技術', category: 'テクノロジー' },
  { theme: '太陽光発電', category: 'テクノロジー' },
  { theme: '量子コンピュータ', category: 'テクノロジー' },

  // 地理・環境
  { theme: 'アマゾン熱帯雨林', category: '地理' },
  { theme: '北極と南極の違い', category: '地理' },
  { theme: '砂漠の生態系', category: '地理' },
  { theme: '海流と気候', category: '地理' },
  { theme: 'プレートテクトニクス', category: '地理' },
  { theme: '世界の不思議な地形', category: '地理' },
  { theme: '気候変動のメカニズム', category: '地理' },
  { theme: '水の循環', category: '地理' },
  { theme: '森林の役割', category: '地理' },
  { theme: '世界遺産の秘密', category: '地理' },

  // 文化・芸術
  { theme: '絵画の技法', category: '文化' },
  { theme: '世界の音楽', category: '文化' },
  { theme: '日本の伝統工芸', category: '文化' },
  { theme: '映画の歴史', category: '文化' },
  { theme: '建築の様式', category: '文化' },
  { theme: '写真の発明', category: '文化' },
  { theme: 'オリンピックの歴史', category: '文化' },
  { theme: '言語の起源', category: '文化' },
  { theme: '食文化の多様性', category: '文化' },
  { theme: '祭りの意味', category: '文化' },

  // 人体・健康
  { theme: '睡眠の科学', category: '人体' },
  { theme: '脳の働き', category: '人体' },
  { theme: '免疫システム', category: '人体' },
  { theme: '心臓の仕組み', category: '人体' },
  { theme: '筋肉の構造', category: '人体' },
  { theme: '消化の過程', category: '人体' },
  { theme: '五感のメカニズム', category: '人体' },
  { theme: '骨の再生', category: '人体' },
  { theme: '血液の役割', category: '人体' },
  { theme: '記憶の仕組み', category: '人体' },

  // 宇宙・天文
  { theme: '太陽系の惑星', category: '宇宙' },
  { theme: '銀河系の構造', category: '宇宙' },
  { theme: '星の一生', category: '宇宙' },
  { theme: '宇宙探査の歴史', category: '宇宙' },
  { theme: '国際宇宙ステーション', category: '宇宙' },
  { theme: '火星移住計画', category: '宇宙' },
  { theme: '隕石と地球', category: '宇宙' },
  { theme: '宇宙望遠鏡', category: '宇宙' },
  { theme: '彗星の軌道', category: '宇宙' },
  { theme: '宇宙での生活', category: '宇宙' },

  // 数学・論理
  { theme: '素数の神秘', category: '数学' },
  { theme: '無限の概念', category: '数学' },
  { theme: '黄金比の美', category: '数学' },
  { theme: '暗号の数学', category: '数学' },
  { theme: '確率の不思議', category: '数学' },
  { theme: 'フラクタル図形', category: '数学' },
  { theme: 'ゲーム理論', category: '数学' },
  { theme: '数学パズル', category: '数学' },
  { theme: '円周率の歴史', category: '数学' },
  { theme: '対称性の美しさ', category: '数学' },
];

async function main() {
  console.log('Seeding suggested themes...');

  // 既存のデータをクリア
  await prisma.suggestedTheme.deleteMany();

  // テーマを一括挿入
  const result = await prisma.suggestedTheme.createMany({
    data: suggestedThemes,
  });

  console.log(`Created ${result.count} suggested themes.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
