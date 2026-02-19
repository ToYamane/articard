#!/bin/bash
# ===================================
# Articard Secret Manager セットアップ
# .env から値を読み取り GCP Secret Manager に登録
# ===================================
set -euo pipefail

PROJECT_ID="articard-ff673"
REGION="asia-northeast1"

# 色付き出力
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# .env ファイルのパスを決定
ENV_FILE="${1:-.env}"
if [ ! -f "$ENV_FILE" ]; then
  error ".env ファイルが見つかりません: $ENV_FILE"
  echo "使い方: $0 [.envファイルパス]"
  exit 1
fi

info "環境変数ファイル: $ENV_FILE"
info "GCP プロジェクト: $PROJECT_ID"
echo ""

# .env から値を読み取る関数
get_env_value() {
  local key="$1"
  local value
  value=$(grep -E "^${key}=" "$ENV_FILE" | head -1 | cut -d'=' -f2- | sed 's/^"//;s/"$//' | sed "s/^'//;s/'$//")
  echo "$value"
}

# シークレットを作成/更新する関数（冪等）
create_or_update_secret() {
  local secret_name="$1"
  local env_key="$2"

  local value
  value=$(get_env_value "$env_key")

  if [ -z "$value" ]; then
    warn "スキップ: $env_key が .env に未設定 (シークレット: $secret_name)"
    return
  fi

  # シークレットが存在するか確認
  if gcloud secrets describe "$secret_name" --project="$PROJECT_ID" &>/dev/null; then
    # 既存のシークレット → 新しいバージョンを追加
    echo -n "$value" | gcloud secrets versions add "$secret_name" \
      --project="$PROJECT_ID" \
      --data-file=- \
      --quiet
    info "更新: $secret_name (← $env_key)"
  else
    # 新規シークレット作成
    echo -n "$value" | gcloud secrets create "$secret_name" \
      --project="$PROJECT_ID" \
      --replication-policy="automatic" \
      --data-file=- \
      --quiet
    info "作成: $secret_name (← $env_key)"
  fi
}

# --- シークレット定義 ---
# フォーマット: "Secret Manager名::.env変数名"
SECRETS=(
  # Database
  "articard-database-url::DATABASE_URL"

  # Firebase Client (6個)
  "articard-firebase-api-key::NEXT_PUBLIC_FIREBASE_API_KEY"
  "articard-firebase-auth-domain::NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
  "articard-firebase-project-id::NEXT_PUBLIC_FIREBASE_PROJECT_ID"
  "articard-firebase-storage-bucket::NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
  "articard-firebase-messaging-sender-id::NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
  "articard-firebase-app-id::NEXT_PUBLIC_FIREBASE_APP_ID"

  # Firebase Admin (3個)
  "articard-firebase-admin-project-id::FIREBASE_ADMIN_PROJECT_ID"
  "articard-firebase-admin-email::FIREBASE_ADMIN_CLIENT_EMAIL"
  "articard-firebase-admin-key::FIREBASE_ADMIN_PRIVATE_KEY"

  # AI APIs (3個)
  "articard-openai-key::OPENAI_API_KEY"
  "articard-bfl-key::BFL_API_KEY"
  "articard-gemini-key::GOOGLE_GEMINI_API_KEY"

  # Stripe (8個)
  "articard-stripe-secret-key::STRIPE_SECRET_KEY"
  "articard-stripe-webhook-secret::STRIPE_WEBHOOK_SECRET"
  "articard-stripe-publishable-key::NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
  "articard-stripe-price-plus::STRIPE_PRICE_PLUS"
  "articard-stripe-price-premium::STRIPE_PRICE_PREMIUM"
  "articard-stripe-price-coin-standard::STRIPE_PRICE_COIN_STANDARD"
  "articard-stripe-price-coin-value::STRIPE_PRICE_COIN_VALUE"
  "articard-stripe-price-coin-mega::STRIPE_PRICE_COIN_MEGA"

  # Email (1個)
  "articard-resend-key::RESEND_API_KEY"
)

# --- 1. シークレット作成/更新 ---
echo "=========================================="
echo " 1/3: シークレット作成/更新"
echo "=========================================="

for entry in "${SECRETS[@]}"; do
  secret_name="${entry%%::*}"
  env_key="${entry##*::}"
  create_or_update_secret "$secret_name" "$env_key"
done

echo ""

# --- 2. Cloud Build サービスアカウントへの権限付与 ---
echo "=========================================="
echo " 2/3: Cloud Build サービスアカウント権限付与"
echo "=========================================="

PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
CLOUD_BUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

info "Cloud Build SA: $CLOUD_BUILD_SA"

for entry in "${SECRETS[@]}"; do
  secret_name="${entry%%::*}"
  # 既にバインディングが存在する場合はスキップされる（冪等）
  gcloud secrets add-iam-policy-binding "$secret_name" \
    --project="$PROJECT_ID" \
    --member="serviceAccount:${CLOUD_BUILD_SA}" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet &>/dev/null || true
done

info "Cloud Build SA への権限付与完了"
echo ""

# --- 3. Cloud Run サービスアカウントへの権限付与 ---
echo "=========================================="
echo " 3/3: Cloud Run サービスアカウント権限付与"
echo "=========================================="

# デフォルトの Compute Engine サービスアカウント（Cloud Run が使用）
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

info "Cloud Run SA: $COMPUTE_SA"

for entry in "${SECRETS[@]}"; do
  secret_name="${entry%%::*}"
  gcloud secrets add-iam-policy-binding "$secret_name" \
    --project="$PROJECT_ID" \
    --member="serviceAccount:${COMPUTE_SA}" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet &>/dev/null || true
done

info "Cloud Run SA への権限付与完了"
echo ""

# --- 完了 ---
echo "=========================================="
info "全シークレットのセットアップが完了しました"
echo "=========================================="
echo ""
echo "次のステップ:"
echo "  1. gcloud builds submit --config=cloudbuild.production.yaml"
echo "  2. デプロイ後にヘルスチェックを確認"
