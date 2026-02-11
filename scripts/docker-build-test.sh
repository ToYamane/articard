#!/bin/bash
# ===================================
# Articard Docker ローカルビルド検証
# .env からビルド引数を読み取り Docker ビルドを実行
# ===================================
set -euo pipefail

# 色付き出力
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# .env ファイルのパスを決定
ENV_FILE="${1:-.env}"
if [ ! -f "$ENV_FILE" ]; then
  error ".env ファイルが見つかりません: $ENV_FILE"
  echo "使い方: $0 [.envファイルパス]"
  exit 1
fi

info "環境変数ファイル: $ENV_FILE"

# .env から値を読み取る関数
get_env_value() {
  local key="$1"
  local value
  value=$(grep -E "^${key}=" "$ENV_FILE" | head -1 | cut -d'=' -f2- | sed 's/^"//;s/"$//' | sed "s/^'//;s/'$//")
  echo "$value"
}

# ビルド引数を読み取り
NEXT_PUBLIC_FIREBASE_API_KEY=$(get_env_value "NEXT_PUBLIC_FIREBASE_API_KEY")
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$(get_env_value "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN")
NEXT_PUBLIC_FIREBASE_PROJECT_ID=$(get_env_value "NEXT_PUBLIC_FIREBASE_PROJECT_ID")
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$(get_env_value "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET")
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$(get_env_value "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID")
NEXT_PUBLIC_FIREBASE_APP_ID=$(get_env_value "NEXT_PUBLIC_FIREBASE_APP_ID")
NEXT_PUBLIC_APP_URL=$(get_env_value "NEXT_PUBLIC_APP_URL")
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$(get_env_value "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY")

IMAGE_NAME="articard:local-test"

info "Docker ビルド開始..."
echo ""

docker build \
  --build-arg NEXT_PUBLIC_FIREBASE_API_KEY="$NEXT_PUBLIC_FIREBASE_API_KEY" \
  --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN" \
  --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID="$NEXT_PUBLIC_FIREBASE_PROJECT_ID" \
  --build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET" \
  --build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" \
  --build-arg NEXT_PUBLIC_FIREBASE_APP_ID="$NEXT_PUBLIC_FIREBASE_APP_ID" \
  --build-arg NEXT_PUBLIC_APP_URL="$NEXT_PUBLIC_APP_URL" \
  --build-arg NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" \
  -t "$IMAGE_NAME" \
  .

echo ""
info "ビルド成功: $IMAGE_NAME"
echo ""
echo "ローカルで実行する場合:"
echo "  docker run --rm -p 3000:3000 --env-file $ENV_FILE $IMAGE_NAME"
