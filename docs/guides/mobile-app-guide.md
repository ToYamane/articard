# スマホアプリ化ガイド

Articard を iOS/Android アプリとしてリリースするための技術ガイドです。
Capacitor + Static Export + Remote API アーキテクチャにより、既存のコードベースを最大限活用します。

## 目次

1. [概要と戦略](#1-概要と戦略)
2. [フェーズ一覧](#2-フェーズ一覧)
3. [Phase 0: API Base URL 抽象化](#3-phase-0-api-base-url-抽象化)
4. [Phase 1: デュアルビルド設定](#4-phase-1-デュアルビルド設定)
5. [Phase 2: Capacitor セットアップ](#5-phase-2-capacitor-セットアップ)
6. [Phase 3: Firebase Auth ネイティブ対応](#6-phase-3-firebase-auth-ネイティブ対応)
7. [Phase 4: Stripe 決済フロー対応](#7-phase-4-stripe-決済フロー対応)
8. [Phase 5: ネイティブ機能追加](#8-phase-5-ネイティブ機能追加)
9. [Phase 6: ストア公開準備](#9-phase-6-ストア公開準備)
10. [Phase 7: PWA 対応](#10-phase-7-pwa-対応)
11. [リスクと対策](#11-リスクと対策)
12. [検証方法](#12-検証方法)
13. [CI/CD パイプライン](#13-cicd-パイプライン)
14. [モバイル固有の考慮事項](#14-モバイル固有の考慮事項)
15. [参考リンク](#15-参考リンク)

---

## 1. 概要と戦略

### 1.1 現在のモバイル対応状況

| 項目                 | 状況        | 備考                   |
| -------------------- | ----------- | ---------------------- |
| レスポンシブデザイン | ✅ 対応済み | Tailwind breakpoints   |
| モバイルメニュー     | ✅ 対応済み | ハンバーガーメニュー   |
| タッチ対応           | ✅ 対応済み | Framer Motion whileTap |
| ダークモード         | ✅ 対応済み | -                      |
| PWA                  | ❌ 未対応   | manifest.json なし     |
| オフライン対応       | ❌ 未対応   | Service Worker なし    |
| プッシュ通知         | ❌ 未対応   | -                      |

### 1.2 アーキテクチャ決定: Capacitor + Static Export + Remote API

フロントエンドを `next build`（`output: 'export'`）で静的ファイル化し、Capacitor にバンドル。API 呼び出しは既存の Cloud Run（`https://articard.app/api/*`）へ絶対 URL で送信する。

```
Capacitor Shell (iOS/Android)
├── バンドル済み静的アセット（Next.js export）
│   ├── React コンポーネント
│   ├── Firebase Client SDK
│   ├── Zustand stores
│   └── Capacitor プラグイン（ネイティブ認証、共有、通知等）
└── Remote API（Cloud Run — 変更なし）
    └── /api/* エンドポイント群
```

**`server.url`（リモート URL 読み込み）を不採用にした理由:**

| 懸念             | 説明                                                                                    |
| ---------------- | --------------------------------------------------------------------------------------- |
| ストア審査リスク | Apple/Google はリモート URL をラップしただけのアプリを拒否する傾向がある                |
| プラグイン不具合 | Capacitor ネイティブプラグインが WebView 内リモートページで正しく動作しないケースがある |
| オフライン不可   | リモート URL 方式ではネットワーク不通時にアプリが一切表示できない                       |

### 1.3 技術選定の理由

| アプローチ                | 採用      | 理由                                                   |
| ------------------------- | --------- | ------------------------------------------------------ |
| Capacitor + Static Export | ✅ 採用   | 既存コード活用、ストア公開可能、ネイティブ機能追加可能 |
| `server.url`（リモート）  | ❌ 不採用 | 審査リスク、プラグイン不具合、オフライン不可           |
| React Native              | ❌        | UI コンポーネント書き直し必要                          |
| Flutter                   | ❌        | 完全な書き直し、Dart 習得必要                          |

### 1.4 パフォーマンス評価

| 観点          | Capacitor                            | ネイティブ (Swift/Kotlin) | Articard における評価                                |
| ------------- | ------------------------------------ | ------------------------- | ---------------------------------------------------- |
| 起動速度      | WebView 初期化で 0.5-1秒遅い         | 即時                      | 許容範囲（スプラッシュスクリーンで対処）             |
| UI レスポンス | 60fps 達成可能（CSS アニメーション） | 60fps ネイティブ          | カード表示・Framer Motion は問題なし                 |
| メモリ使用    | WebView 分のオーバーヘッドあり       | 最小限                    | 画像キャッシュ管理で対処                             |
| API 通信      | ネイティブと同等                     | 同等                      | 差なし                                               |
| 画像表示      | WebView 内レンダリング               | ネイティブレンダリング    | GCS からの配信のため差は軽微                         |
| 総合判定      | **十分**                             | 最適                      | Articard はコンテンツ表示中心のため Capacitor で十分 |

### 1.5 ネイティブ開発との工数比較

| 項目       | Capacitor                     | ネイティブ (iOS + Android)  |
| ---------- | ----------------------------- | --------------------------- |
| 初期開発   | 17-26日                       | 3-6ヶ月 × 2プラットフォーム |
| UI 実装    | 既存コード流用                | 全画面を一から実装          |
| API連携    | 既存 fetch ロジック流用       | 各プラットフォームで実装    |
| 継続メンテ | Web と同一コードベース        | 3つの独立したコードベース   |
| 新機能追加 | 1回の実装で全プラットフォーム | プラットフォームごとに実装  |

### 1.6 API 互換性

Articard の REST API はモバイルアプリからそのまま利用可能:

- エンドポイント: `/api/*`
- 認証: Firebase Bearer Token
- レスポンス形式: `{ success: true, data: T }` / `{ success: false, error: {...} }`

---

## 2. フェーズ一覧

| Phase    | 内容                         | 工数目安                       | 依存      |
| -------- | ---------------------------- | ------------------------------ | --------- |
| 0        | API Base URL 抽象化          | 1-2日                          | なし      |
| 1        | デュアルビルド設定           | 2-3日                          | Phase 0   |
| 2        | Capacitor セットアップ       | 2-3日                          | Phase 1   |
| 3        | Firebase Auth ネイティブ対応 | 3-4日                          | Phase 2   |
| 4        | Stripe 決済フロー対応        | 2-3日                          | Phase 2   |
| 5        | ネイティブ機能追加           | 2-3日                          | Phase 2   |
| 6        | ストア公開準備               | 3-5日                          | Phase 3-5 |
| 7        | PWA 対応（並行可）           | 2-3日                          | Phase 0   |
| **合計** |                              | **17-26日**（並列化で13-18日） |           |

```
Phase 0 ─┬─ Phase 1 ── Phase 2 ─┬─ Phase 3 ──┐
          │                       ├─ Phase 4 ──┼─ Phase 6
          │                       └─ Phase 5 ──┘
          └─ Phase 7（並行作業可）
```

---

## 3. Phase 0: API Base URL 抽象化

全てのクライアントサイド `fetch('/api/...')` を、環境変数でベース URL を切り替え可能にする。

### 3.1 新規ファイル: `src/lib/api/client.ts`

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}
```

### 3.2 環境変数の使い分け

| 環境              | `NEXT_PUBLIC_API_BASE_URL` | 結果                                       |
| ----------------- | -------------------------- | ------------------------------------------ |
| Web（開発・本番） | 空（未設定）               | 相対 URL（`/api/...`）                     |
| Mobile            | `https://articard.app`     | 絶対 URL（`https://articard.app/api/...`） |

### 3.3 変更対象ファイル

パターン: `fetch('/api/...')` → `fetch(apiUrl('/api/...'))`

| ファイル                                          | fetch 箇所数 |
| ------------------------------------------------- | ------------ |
| `src/hooks/use-auth.ts`                           | 4            |
| `src/hooks/use-subscription.ts`                   | 6            |
| `src/hooks/use-batch-card-generation.ts`          | 2            |
| `src/hooks/use-favorites.ts`                      | 2            |
| `src/hooks/use-collection.ts`                     | 1            |
| `src/hooks/use-articles.ts`                       | 1            |
| `src/app/(main)/home/page.tsx`                    | 4            |
| `src/app/(main)/challenge/page.tsx`               | 5            |
| `src/app/(main)/challenge/[sessionId]/page.tsx`   | 6            |
| `src/app/(main)/challenge/history/page.tsx`       | 1            |
| `src/app/(main)/cards/[id]/page.tsx`              | 2            |
| `src/app/(main)/articles/[id]/page.tsx`           | 2            |
| `src/components/layout/header.tsx`                | 1            |
| `src/components/auth/forgot-password-content.tsx` | 3            |
| `src/components/auth/register-form.tsx`           | 1            |
| `src/components/auth/verify-email-content.tsx`    | 2            |
| `src/components/article/theme-suggestions.tsx`    | 1            |

---

## 4. Phase 1: デュアルビルド設定

同一コードベースから Web（standalone）と Mobile（export）の両方をビルド可能にする。

### 4.1 `next.config.mjs` 変更

```javascript
const isMobile = process.env.NEXT_PUBLIC_IS_MOBILE === 'true';

const nextConfig = {
  output: isMobile ? 'export' : 'standalone',
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'storage.googleapis.com' }],
    unoptimized: isMobile || process.env.NODE_ENV === 'production',
  },
  // ...既存の設定
};
```

### 4.2 `package.json` にスクリプト追加

```json
{
  "scripts": {
    "build:web": "next build",
    "build:mobile": "cross-env NEXT_PUBLIC_IS_MOBILE=true NEXT_PUBLIC_API_BASE_URL=https://articard.app next build"
  }
}
```

### 4.3 `src/middleware.ts` に CORS 追加

Capacitor のオリジン（`capacitor://localhost`、`http://localhost`）からの API リクエストを許可する。

```typescript
const ALLOWED_ORIGINS = ['capacitor://localhost', 'http://localhost'];

// API リクエストの場合、CORS ヘッダーを追加
if (pathname.startsWith('/api/')) {
  const origin = request.headers.get('origin');
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
}
```

### 4.4 SSR ページの対処

`src/app/(public)/share/[id]/page.tsx` は SSR + Prisma 直接アクセスのため静的エクスポート不可。

**対処方針:**

- モバイルアプリからの SNS シェアリンクは Web 版 URL（`https://articard.app/share/{id}`）に飛ばす
- モバイルビルド時はこのページを除外（`next.config.mjs` の `exportPathMap` で制御、またはページ内で `generateStaticParams` を空にする）
- モバイルアプリ内のシェア機能は Phase 5 の Native Share API を使用

---

## 5. Phase 2: Capacitor セットアップ

### 5.1 依存パッケージのインストール

```bash
# Capacitor コア
npm install @capacitor/core @capacitor/cli

# プラットフォーム
npm install @capacitor/ios @capacitor/android

# プラグイン
npm install @capacitor/app @capacitor/haptics @capacitor/status-bar
npm install @capacitor/splash-screen @capacitor/keyboard
```

### 5.2 `capacitor.config.ts`

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.articard.mobile',
  appName: 'ArtiCard',
  webDir: 'out', // Next.js export 出力先
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1e0a3c',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1e0a3c',
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
    },
  },
  ios: {
    contentInset: 'automatic',
    scheme: 'articard',
  },
  android: {
    backgroundColor: '#1e0a3c',
  },
};

export default config;
```

### 5.3 セットアップ手順

```bash
# 初期化
npx cap init

# プラットフォーム追加
npx cap add ios
npx cap add android

# ビルド＆同期
npm run build:mobile && npx cap sync

# 確認
npx cap open ios      # Xcode で開く
npx cap open android  # Android Studio で開く
```

### 5.4 Live Reload（開発時）

```bash
# 開発サーバー起動
npm run dev

# capacitor.config.ts で一時的に server.url を設定してから
npx cap run ios
npx cap run android
```

---

## 6. Phase 3: Firebase Auth ネイティブ対応

### 6.1 問題: Google OAuth が WebView で動作しない

Google は WebView 内での OAuth を `disallowed_useragent` エラーで拒否する。
`signInWithPopup` / `signInWithRedirect` はネイティブ WebView 内で動作しない。

### 6.2 解決策: `@capacitor-firebase/authentication`

```bash
npm install @capacitor-firebase/authentication
```

### 6.3 `src/lib/firebase/client.ts` 変更

```typescript
import { Capacitor } from '@capacitor/core';
import { GoogleAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth';

export async function signInWithGoogle() {
  if (Capacitor.isNativePlatform()) {
    // ネイティブプラットフォーム: ネイティブ Google Sign-In SDK を使用
    const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
    const result = await FirebaseAuthentication.signInWithGoogle();
    const credential = GoogleAuthProvider.credential(result.credential?.idToken);
    return signInWithCredential(auth, credential);
  } else {
    // Web: 従来通りのポップアップ認証
    return signInWithPopup(auth, googleProvider);
  }
}
```

### 6.4 ネイティブプロジェクト設定

#### iOS

1. Firebase Console → プロジェクト設定 → マイアプリ → iOS を追加
2. Bundle ID: `app.articard.mobile`
3. `GoogleService-Info.plist` をダウンロード → Xcode の `App` フォルダに追加
4. URL schemes に `REVERSED_CLIENT_ID` を追加（`GoogleService-Info.plist` 内の値）

#### Android

1. Firebase Console → プロジェクト設定 → マイアプリ → Android を追加
2. パッケージ名: `app.articard.mobile`
3. SHA-1 フィンガープリント登録:
   ```bash
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```
4. `google-services.json` をダウンロード → `android/app/` に配置

**注意:** Email/Password 認証は Firebase JS SDK 直接利用のため変更不要。

---

## 7. Phase 4: Stripe 決済フロー対応

### 7.1 背景: 日本 MSCA（特定受信料金制度）

2025年12月の日本 MSCA により、日本の App Store で外部決済リンク（Stripe）が利用可能。ただし Apple の External Purchase Entitlement 申請と開示シートの実装が必要。

### 7.2 依存パッケージ

```bash
npm install @capacitor/browser
```

### 7.3 `src/hooks/use-subscription.ts` 変更

```typescript
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

// Stripe Checkout リダイレクト
if (Capacitor.isNativePlatform()) {
  // ネイティブ: In-App Browser で Stripe Checkout を開く
  await Browser.open({ url: data.data.url });
} else {
  // Web: 通常のリダイレクト
  window.location.href = data.data.url;
}
```

### 7.4 Stripe return URL 対応

モバイルではカスタム URL スキーム（`articard://settings?subscription=success`）を使い、Capacitor App URL listener で受け取る。

**API 側変更:**
`src/app/api/stripe/checkout/route.ts` と `src/app/api/coins/coin-checkout/route.ts` に `returnUrlScheme` パラメータ対応を追加。

```typescript
// モバイルからのリクエストの場合、return URL をカスタムスキームにする
const isMobile = req.headers.get('x-platform') === 'mobile';
const successUrl = isMobile
  ? 'articard://settings?subscription=success'
  : `${process.env.NEXT_PUBLIC_APP_URL}/settings?subscription=success`;
```

**クライアント側変更:**

```typescript
import { App } from '@capacitor/app';

// Stripe Checkout 完了後のカスタムURLスキームを受け取る
App.addListener('appUrlOpen', (event) => {
  const url = new URL(event.url);
  if (url.searchParams.get('subscription') === 'success') {
    // 購入完了処理
    queryClient.invalidateQueries({ queryKey: ['subscription'] });
  }
});
```

---

## 8. Phase 5: ネイティブ機能追加

### 8.1 ネイティブ共有

```bash
npm install @capacitor/share
```

`src/components/share/share-buttons.tsx` で `window.open` → `Share.share()` に分岐:

```typescript
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

async function handleShare() {
  if (Capacitor.isNativePlatform()) {
    await Share.share({
      title: `${card.keyword} (${card.rarity})`,
      text: `Articardで「${card.keyword}」のカードを手に入れました！`,
      url: `https://articard.app/share/${card.id}`,
      dialogTitle: 'カードをシェア',
    });
  } else {
    // Web: 既存のシェア機能
  }
}
```

### 8.2 ハプティクスフィードバック

```bash
npm install @capacitor/haptics
```

カード開封モーダル（`card-reveal-modal.tsx`、`batch-card-reveal-modal.tsx`）でレアリティに応じた振動:

```typescript
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

async function triggerHaptics(rarity: string) {
  if (!Capacitor.isNativePlatform()) return;

  switch (rarity) {
    case 'common':
      await Haptics.impact({ style: ImpactStyle.Light });
      break;
    case 'rare':
      await Haptics.impact({ style: ImpactStyle.Medium });
      break;
    case 'super_rare':
      await Haptics.impact({ style: ImpactStyle.Heavy });
      break;
    case 'legend':
      await Haptics.notification({ type: NotificationType.Success });
      break;
  }
}
```

### 8.3 セーフエリア対応

`src/app/layout.tsx` に `env(safe-area-inset-*)` CSS 追加:

```css
/* globals.css に追加 */
body {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

StatusBar プラグイン設定:

```typescript
import { StatusBar, Style } from '@capacitor/status-bar';

if (Capacitor.isNativePlatform()) {
  StatusBar.setStyle({ style: Style.Dark });
  StatusBar.setBackgroundColor({ color: '#1e0a3c' });
}
```

---

## 9. Phase 6: ストア公開準備

### 9.1 iOS（App Store）

#### 必要なもの

- Apple Developer Program 登録（$99/年）
- 1024x1024 アプリアイコン
- スクリーンショット（6.7", 6.5", 5.5" など）
- `GoogleService-Info.plist`
- 署名証明書、プロビジョニングプロファイル

#### 手順

1. App Store Connect でアプリ作成
2. アプリ情報入力:
   - アプリ名: ArtiCard
   - サブタイトル: AI学習カード
   - カテゴリ: 教育、エンターテインメント
   - 年齢制限: 4+
3. **External Purchase Entitlement 申請**（Stripe 外部決済用）
4. プライバシー詳細入力（収集データ: アカウント情報、使用状況データ）
5. TestFlight でテスト → 審査提出

#### Xcode からアップロード

```bash
# Archive → Distribute App
Product → Archive → Window → Organizer → Distribute App
```

### 9.2 Android（Google Play）

#### 必要なもの

- Google Play Console 登録（$25 一回）
- `google-services.json`
- 署名キー

#### リリース署名

```bash
keytool -genkey -v -keystore articard-release.keystore -alias articard -keyalg RSA -keysize 2048 -validity 10000
```

`android/app/build.gradle` に署名設定:

```groovy
android {
    signingConfigs {
        release {
            storeFile file('articard-release.keystore')
            storePassword System.getenv("KEYSTORE_PASSWORD")
            keyAlias 'articard'
            keyPassword System.getenv("KEY_PASSWORD")
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

#### AAB ビルド

```bash
cd android && ./gradlew bundleRelease
# 出力: android/app/build/outputs/bundle/release/app-release.aab
```

#### 手順

1. ストア掲載情報入力
2. コンテンツ評価アンケート回答
3. データセーフティセクション入力
4. 価格と配布地域設定
5. 内部テスト → クローズドテスト → 本番公開

### 9.3 共通要件

- プライバシーポリシーページ
- 利用規約ページ
- サポート連絡先

---

## 10. Phase 7: PWA 対応

ストアを使わないユーザー向けに「ホーム画面に追加」対応。Phase 0 完了後に並行作業可能。

### 10.1 `public/manifest.json`

既存の `icon-192.png`、`icon-512.png` を活用:

```json
{
  "name": "ArtiCard - AI学習カード",
  "short_name": "ArtiCard",
  "description": "AIで記事を生成し、コレクタブルカードを集めよう",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1e0a3c",
  "theme_color": "#3b82f6",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "categories": ["education", "games", "entertainment"],
  "lang": "ja",
  "dir": "ltr"
}
```

### 10.2 Service Worker

`@serwist/next`（`next-pwa` の後継、メンテナンス活発）を使用:

```bash
npm install @serwist/next serwist
```

```javascript
// next.config.mjs
import withSerwistInit from '@serwist/next';

const withSerwist = withSerwistInit({
  swSrc: 'src/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
});

export default withSerwist(nextConfig);
```

### 10.3 `src/app/layout.tsx` にメタデータ追加

```tsx
export const metadata: Metadata = {
  // 既存のメタデータ...
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ArtiCard',
  },
};
```

---

## 11. リスクと対策

| リスク                                           | 影響                         | 対策                                                             |
| ------------------------------------------------ | ---------------------------- | ---------------------------------------------------------------- |
| Google OAuth が WebView で動かない               | **高** — ログイン不可        | `@capacitor-firebase/authentication` でネイティブ認証（Phase 3） |
| Stripe リダイレクトで WebView のコンテキスト消失 | **高** — 決済不可            | `@capacitor/browser` + カスタム URL スキーム（Phase 4）          |
| Capacitor オリジンの CORS エラー                 | **中** — 全 API 呼び出し失敗 | middleware に CORS 設定追加（Phase 1）                           |
| 「Web ラッパー」としてストア審査拒否             | **中** — 公開不可            | 静的アセットバンドル + ネイティブ機能で差別化（Phase 2-5）       |
| share ページの SSR が export で動かない          | **低** — SNS 共有のみ        | Web 版 URL へ誘導、モバイルは Native Share API 使用              |

---

## 12. 検証方法

各フェーズの完了確認方法:

| Phase | 検証方法                                                                  |
| ----- | ------------------------------------------------------------------------- |
| 0-1   | `npm run build:mobile` が成功し、`out/` に HTML/JS/CSS が出力される       |
| 2     | iOS Simulator / Android Emulator でアプリが起動し、ホーム画面が表示される |
| 3     | Google OAuth でのログインが iOS/Android 両方で動作する                    |
| 4     | コイン購入フローが Stripe Checkout → アプリ復帰まで完走する               |
| 5     | カード開封時にハプティクスが動作、共有ボタンでネイティブ共有シートが開く  |
| 6     | TestFlight / 内部テストトラックでインストール・全機能動作確認             |

---

## 13. CI/CD パイプライン

### 13.1 GitHub Actions for iOS

`.github/workflows/ios.yml`:

```yaml
name: iOS Build

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: macos-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build Next.js (Mobile)
        run: npm run build:mobile
        env:
          NEXT_PUBLIC_FIREBASE_API_KEY: ${{ secrets.FIREBASE_API_KEY }}
          NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ${{ secrets.FIREBASE_AUTH_DOMAIN }}
          NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}

      - name: Sync Capacitor
        run: npx cap sync ios

      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.2'
          bundler-cache: true

      - name: Install Fastlane
        run: |
          cd ios/App
          bundle install

      - name: Import certificate
        uses: apple-actions/import-codesign-certs@v2
        with:
          p12-file-base64: ${{ secrets.IOS_P12_BASE64 }}
          p12-password: ${{ secrets.IOS_P12_PASSWORD }}

      - name: Import provisioning profile
        uses: apple-actions/download-provisioning-profiles@v1
        with:
          bundle-id: app.articard.mobile
          issuer-id: ${{ secrets.APPSTORE_ISSUER_ID }}
          api-key-id: ${{ secrets.APPSTORE_KEY_ID }}
          api-private-key: ${{ secrets.APPSTORE_PRIVATE_KEY }}

      - name: Build and upload to TestFlight
        run: |
          cd ios/App
          bundle exec fastlane beta
        env:
          FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_PASSWORD }}
```

### 13.2 GitHub Actions for Android

`.github/workflows/android.yml`:

```yaml
name: Android Build

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Install dependencies
        run: npm ci

      - name: Build Next.js (Mobile)
        run: npm run build:mobile
        env:
          NEXT_PUBLIC_FIREBASE_API_KEY: ${{ secrets.FIREBASE_API_KEY }}
          NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ${{ secrets.FIREBASE_AUTH_DOMAIN }}
          NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}

      - name: Sync Capacitor
        run: npx cap sync android

      - name: Decode Keystore
        run: echo "${{ secrets.ANDROID_KEYSTORE_BASE64 }}" | base64 -d > android/app/articard-release.keystore

      - name: Build AAB
        run: |
          cd android
          ./gradlew bundleRelease
        env:
          KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
          KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}

      - name: Upload to Play Store
        uses: r0adkll/upload-google-play@v1
        with:
          serviceAccountJsonPlainText: ${{ secrets.PLAY_STORE_SERVICE_ACCOUNT }}
          packageName: app.articard.mobile
          releaseFiles: android/app/build/outputs/bundle/release/app-release.aab
          track: internal
          status: completed
```

---

## 14. モバイル固有の考慮事項

### 14.1 ディープリンク対応

#### URL スキーム

```typescript
// capacitor.config.ts
ios: {
  scheme: 'articard',
},
```

#### ディープリンクハンドラー

```typescript
import { App, URLOpenListenerEvent } from '@capacitor/app';

App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
  const url = new URL(event.url);
  const path = url.pathname;

  if (path.startsWith('/cards/')) {
    router.push(`/cards/${path.split('/')[2]}`);
  } else if (path.startsWith('/articles/')) {
    router.push(`/articles/${path.split('/')[2]}`);
  }
});
```

### 14.2 オフライン状態の検出

```typescript
import { useState, useEffect } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
```

### 14.3 バージョン管理・強制アップデート

```typescript
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

async function checkForUpdates() {
  if (!Capacitor.isNativePlatform()) return;

  const platform = Capacitor.getPlatform();
  const appInfo = await App.getInfo();
  const currentVersion = appInfo.version;

  const response = await fetch(apiUrl('/api/version'));
  const versionInfo = await response.json();
  const platformInfo = versionInfo[platform];

  if (compareVersions(currentVersion, platformInfo.minVersion) < 0) {
    // 強制アップデート
    showForceUpdateDialog(platformInfo.updateUrl);
  } else if (compareVersions(currentVersion, platformInfo.latestVersion) < 0) {
    // 任意アップデート
    showOptionalUpdateDialog(platformInfo.updateUrl);
  }
}
```

---

## 15. 参考リンク

- [Capacitor 公式ドキュメント](https://capacitorjs.com/docs)
- [Capacitor Firebase Authentication](https://github.com/capawesome-team/capacitor-firebase/tree/main/packages/authentication)
- [@serwist/next（Service Worker）](https://serwist.pages.dev/)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Developer Policy](https://play.google.com/console/about/developer-content-policy/)
- [Fastlane](https://fastlane.tools/)
- [日本 MSCA（App Store 外部決済）](https://developer.apple.com/support/storekit-external-entitlement-jp/)
