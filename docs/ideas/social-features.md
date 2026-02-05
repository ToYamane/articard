# ソーシャル機能

ユーザー間の交流を促進し、コミュニティを形成する機能群。

---

## アイデア一覧

### 1. ユーザープロフィール＆フォローシステム

**概要**
- 公開プロフィールページの作成
- フォロー/フォロワー機能
- お気に入りカードの展示
- 統計情報（生成記事数、カード数、レアリティ分布など）の公開

**メリット**
- ビジネス: ソーシャル拡散、バイラル成長の基盤
- ユーザー: 自己表現、他ユーザーとのつながり

**実装難易度**: ★★★☆☆

**必要な変更**

データモデル:
```prisma
model UserProfile {
  id            String   @id @default(cuid())
  userId        String   @unique
  user          User     @relation(fields: [userId], references: [id])
  bio           String?  // 自己紹介（200文字以内）
  avatarUrl     String?
  bannerUrl     String?
  showcaseCards String[] // 展示カードID（最大6枚）
  isPublic      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model UserFollow {
  id          String   @id @default(cuid())
  followerId  String
  follower    User     @relation("Followers", fields: [followerId], references: [id])
  followingId String
  following   User     @relation("Following", fields: [followingId], references: [id])
  createdAt   DateTime @default(now())

  @@unique([followerId, followingId])
}
```

API:
- `GET /api/profile/:userId` - プロフィール取得
- `PUT /api/profile` - プロフィール更新
- `POST /api/follow/:userId` - フォロー
- `DELETE /api/follow/:userId` - フォロー解除
- `GET /api/followers` - フォロワー一覧
- `GET /api/following` - フォロー中一覧

UI:
- プロフィールページ
- プロフィール編集モーダル
- フォローボタン
- フォロー/フォロワー一覧モーダル
- ショーケースカード表示
- 統計ダッシュボード

**統計表示項目**:
- 総記事生成数
- 総カード獲得数
- レアリティ別カード数
- 連続ログイン記録
- 獲得バッジ
- 参加日

**参考**
- Twitter/X: フォロー/フォロワーシステム
- Steam: プロフィールのショーケース機能

---

### 2. ギルド/クラン機能

**概要**
- ユーザーが集まるグループ（ギルド）を作成
- ギルド内でのチャット、目標共有
- ギルド対抗イベント（週間カード獲得数競争など）
- ギルドレベルと特典

**メリット**
- ビジネス: コミュニティ形成、リテンション向上
- ユーザー: 所属感、協力プレイの楽しさ

**実装難易度**: ★★★★☆

**必要な変更**

データモデル:
```prisma
model Guild {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  iconUrl     String?
  bannerUrl   String?
  leaderId    String
  leader      User     @relation("GuildLeader", fields: [leaderId], references: [id])
  level       Int      @default(1)
  xp          Int      @default(0)
  maxMembers  Int      @default(30)
  isPublic    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  members     GuildMember[]
  messages    GuildMessage[]
  events      GuildEvent[]
}

model GuildMember {
  id        String   @id @default(cuid())
  guildId   String
  guild     Guild    @relation(fields: [guildId], references: [id])
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  role      String   @default("member") // leader, officer, member
  joinedAt  DateTime @default(now())
  weeklyXp  Int      @default(0) // 週間貢献XP

  @@unique([guildId, userId])
}

model GuildMessage {
  id        String   @id @default(cuid())
  guildId   String
  guild     Guild    @relation(fields: [guildId], references: [id])
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  content   String
  createdAt DateTime @default(now())
}

model GuildEvent {
  id          String   @id @default(cuid())
  guildId     String
  guild       Guild    @relation(fields: [guildId], references: [id])
  name        String
  description String?
  targetType  String   // "card_count", "article_count", "legend_count"
  targetValue Int
  startsAt    DateTime
  endsAt      DateTime
  reward      Json?
}
```

API:
- `POST /api/guilds` - ギルド作成
- `GET /api/guilds` - ギルド検索
- `GET /api/guilds/:id` - ギルド詳細
- `POST /api/guilds/:id/join` - 加入申請
- `POST /api/guilds/:id/leave` - 退会
- `GET /api/guilds/:id/messages` - チャット取得
- `POST /api/guilds/:id/messages` - チャット投稿

UI:
- ギルド一覧・検索ページ
- ギルド詳細ページ
- ギルド作成フォーム
- ギルドチャット
- メンバー管理画面
- ランキング表示

**ギルドレベル特典**:
| レベル | 必要XP | 特典 |
|--------|--------|------|
| 1 | 0 | 基本機能 |
| 5 | 5,000 | 最大メンバー50人 |
| 10 | 20,000 | ギルドバナーカスタマイズ |
| 15 | 50,000 | 限定バッジ |
| 20 | 100,000 | ギルド専用カードフレーム |

**参考**
- Discord: サーバー機能
- Clash of Clans: クラン対戦

---

### 3. 友人間対戦モード

**概要**
- フレンドとリアルタイムでクイズ対戦
- お互いの記事からクイズを出題
- スコアベースの勝敗判定
- ランキング（フレンド内、全体）

**メリット**
- ビジネス: アクティブ率向上、バイラル効果
- ユーザー: 競争の楽しさ、学習効果の向上

**実装難易度**: ★★★★★

**必要な変更**

データモデル:
```prisma
model Battle {
  id           String   @id @default(cuid())
  player1Id    String
  player1      User     @relation("Player1", fields: [player1Id], references: [id])
  player2Id    String
  player2      User     @relation("Player2", fields: [player2Id], references: [id])
  status       String   @default("waiting") // waiting, in_progress, completed
  player1Score Int      @default(0)
  player2Score Int      @default(0)
  winnerId     String?
  winner       User?    @relation("Winner", fields: [winnerId], references: [id])
  rounds       BattleRound[]
  createdAt    DateTime @default(now())
  completedAt  DateTime?
}

model BattleRound {
  id             String   @id @default(cuid())
  battleId       String
  battle         Battle   @relation(fields: [battleId], references: [id])
  roundNumber    Int
  articleId      String
  article        Article  @relation(fields: [articleId], references: [id])
  question       String
  options        String[] // 4択
  correctIndex   Int
  player1Answer  Int?
  player2Answer  Int?
  player1Time    Int?     // 回答時間（ミリ秒）
  player2Time    Int?
}

model BattleInvite {
  id          String   @id @default(cuid())
  senderId    String
  sender      User     @relation("Sender", fields: [senderId], references: [id])
  receiverId  String
  receiver    User     @relation("Receiver", fields: [receiverId], references: [id])
  status      String   @default("pending") // pending, accepted, declined, expired
  battleId    String?
  battle      Battle?  @relation(fields: [battleId], references: [id])
  expiresAt   DateTime
  createdAt   DateTime @default(now())
}

model UserBattleStats {
  id          String @id @default(cuid())
  userId      String @unique
  user        User   @relation(fields: [userId], references: [id])
  totalWins   Int    @default(0)
  totalLosses Int    @default(0)
  totalDraws  Int    @default(0)
  rating      Int    @default(1000) // ELOレーティング
  winStreak   Int    @default(0)
}
```

技術要件:
- WebSocket または Server-Sent Events でリアルタイム通信
- Redis等でセッション管理
- マッチメイキングロジック

API:
- `POST /api/battles/invite/:userId` - 対戦招待
- `POST /api/battles/invite/:id/accept` - 招待承諾
- `GET /api/battles/:id` - 対戦状態取得
- `POST /api/battles/:id/answer` - 回答送信
- `GET /api/battles/stats` - 戦績

WebSocket Events:
- `battle:start` - 対戦開始
- `battle:round` - ラウンド開始
- `battle:answer` - 相手の回答
- `battle:result` - ラウンド結果
- `battle:end` - 対戦終了

UI:
- フレンド一覧＆招待ボタン
- 対戦待機画面
- 対戦画面（クイズUI）
- リザルト画面
- 戦績ページ
- ランキング表示

**対戦ルール案**:
- 5ラウンド制
- 各ラウンド15秒以内に回答
- 正解: 100点、早答えボーナス: 最大50点
- 合計点で勝敗決定

**参考**
- QuizUp: リアルタイムクイズ対戦
- Kahoot!: グループクイズ
