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
- **Card**: Keyword, rarity (common/rare/super_rare/legend), images, flavor text
- **KnowledgeTransaction**: In-app currency tracking

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

## Environment Variables

Required in `.env`:
- `DATABASE_URL`: PostgreSQL connection (Cloud SQL or local Docker)
- `NEXT_PUBLIC_FIREBASE_*`: Firebase client config
- `FIREBASE_ADMIN_*`: Firebase Admin SDK credentials
- `OPENAI_API_KEY`: For article generation
- `BFL_API_KEY`: FLUX image generation
- `GOOGLE_GEMINI_API_KEY`: Gemini image generation
- `GCS_BUCKET_NAME`, `GOOGLE_APPLICATION_CREDENTIALS`: Cloud Storage

## Database Setup

```bash
# Start Cloud SQL Proxy (required for development)
./cloud-sql-proxy.exe articard-ff673:asia-northeast1:articard-db --port 5433

# Push schema changes
npm run db:push
```

## Infrastructure

### GCP Project (Development)
- **Project ID**: articard-ff673
- **Region**: asia-northeast1

### Cloud SQL
- **Instance**: articard-db
- **Database**: articard
- **User**: articard_user

### Cloud Storage
- **Bucket**: articard-ff673.appspot.com (or custom bucket)
- **Structure**:
  - illustrations/{cardId}_illustration.jpg
  - cards/{cardId}_card.jpg
  - cards/{cardId}_back.jpg
  - thumbnails/{cardId}_thumb.jpg

### Firebase
- **Project**: articard-ff673
- **Auth**: Email/Password, Google OAuth

### External APIs
- **OpenAI**: GPT-4o-mini (articles), DALL-E 3 HD (legend cards)
- **FLUX (BFL)**: flux-2-klein (common), flux-2-pro (super_rare)
- **Gemini**: gemini-2.0-flash-exp (rare cards)

### Related Docs
- [Production Setup Guide](docs/production-setup.md)
