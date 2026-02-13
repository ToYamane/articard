# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Articard is an AI-powered learning platform that generates educational articles and collectible cards. Users input themes to generate articles via OpenAI, then unique collectible cards are created from article keywords with varying rarity levels and AI-generated illustrations.

## Common Commands

```bash
# Development
npm run dev                 # Start dev server (localhost:3000)
npm run type-check          # TypeScript check
npm run lint                # ESLint
npm run test                # Run all tests
npm run test -- path/to/test.ts  # Run single test file

# Database (Cloud SQL via Proxy)
./cloud-sql-proxy.exe articard-ff673:asia-northeast1:articard-db --port 5433
npm run db:push             # Push schema changes
npm run db:studio           # Open Prisma Studio GUI
```

## Testing

### Test Structure

テストは `__tests__/` ディレクトリに配置（src外）:

- `__tests__/__mocks__/` - 外部サービスモック（Firebase, OpenAI, FLUX, Stripe, next/server）
- `__tests__/helpers/` - テストヘルパー・データファクトリ
- `__tests__/lib/` - ライブラリ・サービスのユニットテスト
- `__tests__/app/api/` - APIルートテスト

### Test Patterns

- サービステスト: `jest.mock('@/lib/prisma')` で個別メソッドをモック
- APIルートテスト: `jest.mock('@/lib/auth')` + helpers の `createAuthenticatedRequest`
- withAuthParams ルート: `handler(req, { params: Promise.resolve({ id }) })`
- $transaction モック: `mockImplementation(async (cb) => cb(mockTxPrisma))`

詳細は [テスト運用ガイド](docs/guides/testing.md) を参照。

## Architecture

### Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Framer Motion
- **State**: Zustand (auth) + TanStack Query (server state)
- **Backend**: Next.js API Routes with Bearer token auth
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: Firebase Authentication
- **Storage**: Google Cloud Storage
- **AI**: OpenAI (articles), FLUX/Gemini/DALL-E (images based on rarity)

### Directory Structure

```
src/
├── app/
│   ├── (auth)/          # Login, register, setup pages
│   ├── (main)/          # Protected pages (home, articles, cards, collection, settings)
│   └── api/             # REST API routes
├── components/
│   ├── ui/              # Reusable UI components
│   ├── article/         # Article generation UI
│   ├── card/            # Card display components
│   └── collection/      # Collection browsing
├── lib/
│   ├── services/        # Business logic (article-service, card-service)
│   ├── openai/          # OpenAI integration
│   ├── flux/            # FLUX image generation
│   ├── gemini/          # Gemini image generation
│   ├── firebase/        # Firebase auth (client & admin)
│   ├── gcs/             # Google Cloud Storage
│   ├── card/            # Card logic (rarity calculation, image composition)
│   ├── validations/     # Zod schemas
│   └── errors/          # Error handling
├── stores/              # Zustand stores
└── types/               # TypeScript definitions

docs/
├── specs/     # Feature specifications and design docs
├── logs/      # Work logs and change history
├── ideas/     # Future ideas and proposals
└── guides/    # Setup and operation guides
```

### API Pattern

All API routes use Bearer token auth and return consistent responses:

```typescript
// Success: { success: true, data: T }
// Error: { success: false, error: { code: string, message: string } }
```

### Database Models

- **User**: Firebase UID, nickname, premium status, isDeveloper flag
- **Article**: Theme, content, OpenAI model/token usage
- **Card**: Keyword, rarity (common/rare/super_rare/legend), images, flavor text. articleId is nullable (SetNull on article deletion)
- **KnowledgeTransaction**: In-app currency tracking
- **FavoriteCard / FavoriteArticle**: User bookmark (many-to-many)
- **StripeWebhookEvent**: Webhook idempotency check

### Card Rarity System

Cards use probability-based rarity with different image generation models:

- Common (60%): FLUX 1.1 Pro
- Rare (25%): Google Gemini
- Super Rare (10%): FLUX 2 Pro
- Legend (5%): DALL-E 3 HD

Developer users can specify rarity directly via `isDeveloper` flag.

## Key Patterns

### Validation

Use Zod schemas in `src/lib/validations/` for all API input validation.

### Error Handling

Use `ApiError` class from `src/lib/errors/` for consistent error responses.

### Services

Business logic lives in `src/lib/services/`. Services handle database operations and external API calls.

### State Management

- `useAuthStore` (Zustand): Firebase user and profile state
- TanStack Query: Server state for cards, articles, etc.

## Documentation

### Structure

- `docs/specs/` - Feature specifications and design documents
- `docs/logs/` - Work logs and implementation records
- `docs/ideas/` - Future ideas and proposals
- `docs/guides/` - Setup and operation guides

### Recording Implementations

When completing significant features or refactoring:

1. Create a log entry in `docs/logs/` with date prefix (e.g., `2025-02-04-batch-generation.md`)
2. Include: overview, key changes, files modified, and any architectural decisions

## Environment Variables

Required in `.env`:

- `DATABASE_URL`: PostgreSQL connection (Cloud SQL or local Docker)
- `NEXT_PUBLIC_FIREBASE_*`: Firebase client config
- `FIREBASE_ADMIN_*`: Firebase Admin SDK credentials
- `OPENAI_API_KEY`: For article generation
- `BFL_API_KEY`: FLUX image generation
- `GOOGLE_GEMINI_API_KEY`: Gemini image generation
- `GCS_BUCKET_NAME`, `GOOGLE_APPLICATION_CREDENTIALS`: Cloud Storage

## Infrastructure

See [Production Setup Guide](docs/guides/production-setup.md) for full details.

| Resource    | Value                                    |
| ----------- | ---------------------------------------- |
| GCP Project | articard-ff673 (asia-northeast1)         |
| Database    | Cloud SQL PostgreSQL (articard-db)       |
| Storage     | GCS: illustrations/, cards/, thumbnails/ |
| Auth        | Firebase (Email/Password, Google OAuth)  |
| AI APIs     | OpenAI, FLUX (BFL), Gemini               |

## Compact Instructions

When context is compacted, preserve:

- API patterns: `{ success, data }` / `{ success, error }` format
- Card rarity system: Common(60%)/Rare(25%)/SuperRare(10%)/Legend(5%)
- Key locations: `src/lib/services/`, `src/lib/validations/`, `src/lib/errors/`
- Auth pattern: Firebase Bearer token validation
