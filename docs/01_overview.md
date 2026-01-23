# 01. システム概要

## 1.1 サービス概要

### サービス名
**Articard**

### ターゲットユーザー
- 子どもから大人まで幅広い年齢層
- 学習に興味がある人
- コレクション要素を楽しみたい人

### コアバリュー
1. **学習 × エンターテイメント** - 学ぶことが楽しくなる体験
2. **ユニーク性** - 世界に1枚だけのカードを所有する喜び
3. **文脈レア度** - 同じキーワードでも記事の文脈でレア度が変わる

## 1.2 システム構成図

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (Browser/App)                     │
│                         Next.js + React + Motion                 │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Cloud Run                                │
│                    Next.js API Routes                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Article API  │  │  Card API    │  │ Collection   │          │
│  │              │  │              │  │    API       │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  OpenAI     │      │  FLUX API   │      │ Cloud SQL   │
│  API        │      │             │      │ PostgreSQL  │
└─────────────┘      └─────────────┘      └─────────────┘
         │                    │
         ▼                    ▼
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  Moderation │      │   Cloud     │      │  Firebase   │
│  API        │      │  Storage    │      │    Auth     │
└─────────────┘      └─────────────┘      └─────────────┘
```

## 1.3 技術スタック詳細

### フロントエンド

| 技術 | バージョン | 用途 |
|------|-----------|------|
| Next.js | 14.x | フレームワーク |
| React | 18.x | UIライブラリ |
| Motion (Framer Motion) | 11.x | アニメーション |
| TypeScript | 5.x | 型安全性 |
| Tailwind CSS | 3.x | スタイリング |

### バックエンド

| 技術 | 用途 |
|------|------|
| Next.js API Routes | APIエンドポイント |
| Prisma | ORM |
| Zod | バリデーション |

### インフラ（GCP）

| サービス | 用途 |
|----------|------|
| Cloud Run | アプリケーションホスティング |
| Cloud SQL (PostgreSQL 15) | データベース |
| Cloud Storage | カード画像保存 |
| Firebase Authentication | ユーザー認証 |
| Cloud Build | CI/CD |
| Secret Manager | APIキー管理 |

### 外部API

| API | 用途 | 価格目安 |
|-----|------|---------|
| OpenAI GPT-4o-mini | 記事生成 | ~$0.01/記事 |
| OpenAI Moderation | コンテンツフィルター | 無料 |
| FLUX API (BFL公式) | イラスト生成 | ~$0.03/枚 |

> **Note**: FLUX APIはBlack Forest Labs (BFL) の公式APIを使用します。

### 画像アクセス方式

| 方式 | 詳細 |
|------|------|
| アクセス方式 | Cloud Storage 公開URL |
| 認証 | 不要（公開アクセス） |
| URL形式 | `https://storage.googleapis.com/{bucket}/{path}` |

### エラーUI方式

| エラー種別 | 表示方式 | 例 |
|-----------|---------|-----|
| 軽微なエラー | トースト通知 | ネットワークエラー、入力バリデーション |
| 重要なエラー | モーダルダイアログ | 認証エラー、課金エラー、致命的エラー |
| 操作確認 | モーダルダイアログ | カード削除、記事削除 |

### 環境構成

| 環境 | 用途 | URL例 |
|------|------|-------|
| development | ローカル開発 | `http://localhost:3000` |
| staging | 検証環境 | `https://articard-staging-xxx.run.app` |
| production | 本番環境 | `https://articard.com` |

## 1.4 非機能要件

### パフォーマンス
- 記事生成: 10秒以内
- カード生成（イラスト含む）: 15秒以内
- ページ読み込み: 3秒以内

### スケーラビリティ
- Cloud Runの自動スケーリング
- 同時接続数: 1000ユーザー想定

### セキュリティ
- Firebase Authenticationによる認証
- OpenAI Moderation APIによる入力フィルター
- HTTPS必須
- APIキーはSecret Managerで管理

### 可用性
- 99.5% SLA目標
- Cloud SQLの自動バックアップ

## 1.5 開発環境

```bash
# 必要なツール
- Node.js 20.x
- npm or pnpm
- Docker (ローカルDB用)
- gcloud CLI
- Firebase CLI

# 環境変数
OPENAI_API_KEY=
FLUX_API_KEY=
DATABASE_URL=
NEXT_PUBLIC_FIREBASE_CONFIG=
GOOGLE_CLOUD_PROJECT=
GCS_BUCKET_NAME=
```
