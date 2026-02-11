-- CreateEnum
CREATE TYPE "Rarity" AS ENUM ('common', 'rare', 'super_rare', 'legend');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('in_progress', 'completed', 'abandoned');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('purchase', 'bonus', 'consume', 'refund', 'daily');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('plus', 'premium');

-- CreateTable
CREATE TABLE "users" (
    "id" VARCHAR(128) NOT NULL,
    "nickname" VARCHAR(20) NOT NULL,
    "knowledge_balance" INTEGER NOT NULL DEFAULT 0,
    "daily_free_coins" INTEGER NOT NULL DEFAULT 90,
    "daily_coins_reset_at" TIMESTAMPTZ,
    "daily_challenge_count" INTEGER NOT NULL DEFAULT 0,
    "daily_challenge_reset_at" TIMESTAMPTZ,
    "is_premium" BOOLEAN NOT NULL DEFAULT false,
    "is_developer" BOOLEAN NOT NULL DEFAULT false,
    "premium_expires_at" TIMESTAMPTZ,
    "subscription_tier" "SubscriptionTier",
    "subscription_bonus_received" BOOLEAN NOT NULL DEFAULT false,
    "stripe_customer_id" VARCHAR(255),
    "stripe_subscription_id" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "last_active_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" VARCHAR(128) NOT NULL,
    "theme" VARCHAR(30) NOT NULL,
    "content" TEXT NOT NULL,
    "content_type" VARCHAR(20) NOT NULL DEFAULT 'essay',
    "openai_model" VARCHAR(50) NOT NULL,
    "token_usage" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" VARCHAR(128) NOT NULL,
    "article_id" UUID NOT NULL,
    "keyword" VARCHAR(50) NOT NULL,
    "card_number" INTEGER NOT NULL,
    "rarity" "Rarity" NOT NULL,
    "flavor_text" VARCHAR(100) NOT NULL,
    "context_category" VARCHAR(30) NOT NULL,
    "context_description" TEXT NOT NULL,
    "illustration_url" VARCHAR(500) NOT NULL,
    "card_image_url" VARCHAR(500) NOT NULL,
    "card_back_image_url" VARCHAR(500),
    "thumbnail_url" VARCHAR(500) NOT NULL,
    "flux_prompt" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" VARCHAR(128) NOT NULL,
    "amount" INTEGER NOT NULL,
    "transaction_type" "TransactionType" NOT NULL,
    "description" VARCHAR(100),
    "balance_after" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suggested_themes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "theme" VARCHAR(30) NOT NULL,
    "category" VARCHAR(30),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suggested_themes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" VARCHAR(128) NOT NULL,
    "scenario_id" VARCHAR(50) NOT NULL,
    "status" "SessionStatus" NOT NULL,
    "current_phase" INTEGER NOT NULL DEFAULT 0,
    "game_state" JSONB,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "challenge_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_high_scores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" VARCHAR(128) NOT NULL,
    "scenario_id" VARCHAR(50) NOT NULL,
    "high_score" INTEGER NOT NULL,
    "best_rank" VARCHAR(1) NOT NULL,
    "play_count" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "challenge_high_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_achievements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" VARCHAR(128) NOT NULL,
    "scenario_id" VARCHAR(50) NOT NULL,
    "rank" VARCHAR(1) NOT NULL,
    "coins_awarded" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "challenge_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_nickname_key" ON "users"("nickname");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripe_customer_id_key" ON "users"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripe_subscription_id_key" ON "users"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE INDEX "articles_user_id_idx" ON "articles"("user_id");

-- CreateIndex
CREATE INDEX "articles_created_at_idx" ON "articles"("created_at");

-- CreateIndex
CREATE INDEX "articles_user_id_created_at_idx" ON "articles"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "cards_user_id_idx" ON "cards"("user_id");

-- CreateIndex
CREATE INDEX "cards_article_id_idx" ON "cards"("article_id");

-- CreateIndex
CREATE INDEX "cards_rarity_idx" ON "cards"("rarity");

-- CreateIndex
CREATE INDEX "cards_created_at_idx" ON "cards"("created_at");

-- CreateIndex
CREATE INDEX "cards_user_id_created_at_idx" ON "cards"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "cards_user_id_rarity_idx" ON "cards"("user_id", "rarity");

-- CreateIndex
CREATE INDEX "cards_keyword_idx" ON "cards"("keyword");

-- CreateIndex
CREATE UNIQUE INDEX "cards_keyword_card_number_key" ON "cards"("keyword", "card_number");

-- CreateIndex
CREATE INDEX "knowledge_transactions_user_id_idx" ON "knowledge_transactions"("user_id");

-- CreateIndex
CREATE INDEX "knowledge_transactions_created_at_idx" ON "knowledge_transactions"("created_at");

-- CreateIndex
CREATE INDEX "knowledge_transactions_user_id_created_at_idx" ON "knowledge_transactions"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "suggested_themes_is_active_idx" ON "suggested_themes"("is_active");

-- CreateIndex
CREATE INDEX "suggested_themes_category_idx" ON "suggested_themes"("category");

-- CreateIndex
CREATE INDEX "challenge_sessions_user_id_idx" ON "challenge_sessions"("user_id");

-- CreateIndex
CREATE INDEX "challenge_sessions_status_idx" ON "challenge_sessions"("status");

-- CreateIndex
CREATE INDEX "challenge_sessions_user_id_status_idx" ON "challenge_sessions"("user_id", "status");

-- CreateIndex
CREATE INDEX "challenge_sessions_user_id_started_at_idx" ON "challenge_sessions"("user_id", "started_at" DESC);

-- CreateIndex
CREATE INDEX "challenge_high_scores_user_id_idx" ON "challenge_high_scores"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_high_scores_user_id_scenario_id_key" ON "challenge_high_scores"("user_id", "scenario_id");

-- CreateIndex
CREATE INDEX "challenge_achievements_user_id_idx" ON "challenge_achievements"("user_id");

-- CreateIndex
CREATE INDEX "challenge_achievements_user_id_scenario_id_idx" ON "challenge_achievements"("user_id", "scenario_id");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_achievements_user_id_scenario_id_rank_key" ON "challenge_achievements"("user_id", "scenario_id", "rank");

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_transactions" ADD CONSTRAINT "knowledge_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_sessions" ADD CONSTRAINT "challenge_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_high_scores" ADD CONSTRAINT "challenge_high_scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_achievements" ADD CONSTRAINT "challenge_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
