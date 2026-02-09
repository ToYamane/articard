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

