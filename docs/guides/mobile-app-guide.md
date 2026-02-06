# スマホアプリ化ガイド

Articard を iOS/Android アプリとしてリリースするための技術ガイドです。
段階的なアプローチ（PWA → Capacitor）で、既存のコードベースを最大限活用します。

## 目次

1. [概要と戦略](#1-概要と戦略)
2. [Phase 1: PWA対応](#2-phase-1-pwa対応)
3. [Phase 2: Capacitor導入](#3-phase-2-capacitor導入)
4. [Firebase設定（モバイル用）](#4-firebase設定モバイル用)
5. [アプリストア公開](#5-アプリストア公開)
6. [CI/CD パイプライン](#6-cicd-パイプライン)
7. [モバイル固有の考慮事項](#7-モバイル固有の考慮事項)
8. [チェックリスト](#8-チェックリスト)

---

## 1. 概要と戦略

### 1.1 現在のモバイル対応状況

| 項目 | 状況 | 備考 |
|------|------|------|
| レスポンシブデザイン | ✅ 対応済み | Tailwind breakpoints |
| モバイルメニュー | ✅ 対応済み | ハンバーガーメニュー |
| タッチ対応 | ✅ 対応済み | Framer Motion whileTap |
| ダークモード | ✅ 対応済み | - |
| PWA | ❌ 未対応 | manifest.json なし |
| オフライン対応 | ❌ 未対応 | Service Worker なし |
| プッシュ通知 | ❌ 未対応 | - |

### 1.2 段階的アプローチ

```
Phase 1: PWA対応
├── 最小限の変更で「ホーム画面に追加」対応
├── オフラインキャッシュ
└── 基本的なアプリ体験

Phase 2: Capacitor導入
├── ネイティブアプリとしてビルド
├── App Store / Google Play 公開
└── ネイティブ機能（プッシュ通知等）
```

### 1.3 技術選定の理由

| アプローチ | 採用 | 理由 |
|-----------|------|------|
| PWA | ✅ Phase 1 | 最小変更、Web/モバイル統一 |
| Capacitor | ✅ Phase 2 | 既存コード活用、ストア公開可能 |
| React Native | ❌ | UIコンポーネント書き直し必要 |
| Flutter | ❌ | 完全な書き直し、Dart習得必要 |

### 1.4 API互換性

Articard の REST API はモバイルアプリからそのまま利用可能:

- エンドポイント: `/api/*`
- 認証: Firebase Bearer Token
- レスポンス形式: `{ success: true, data: T }` / `{ success: false, error: {...} }`

---

## 2. Phase 1: PWA対応

### 2.1 Web App Manifest の作成

`public/manifest.json` を作成:

```json
{
  "name": "Articard - AI学習カード",
  "short_name": "Articard",
  "description": "AIで記事を生成し、コレクタブルカードを集めよう",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#3b82f6",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/home.png",
      "sizes": "390x844",
      "type": "image/png",
      "form_factor": "narrow",
      "label": "ホーム画面"
    },
    {
      "src": "/screenshots/collection.png",
      "sizes": "390x844",
      "type": "image/png",
      "form_factor": "narrow",
      "label": "コレクション"
    }
  ],
  "categories": ["education", "games", "entertainment"],
  "lang": "ja",
  "dir": "ltr"
}
```

### 2.2 HTML メタタグの追加

`src/app/layout.tsx` に追加:

```tsx
export const metadata: Metadata = {
  // 既存のメタデータ...
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Articard',
  },
  formatDetection: {
    telephone: false,
  },
};
```

`src/app/layout.tsx` の `<head>` 内に追加:

```tsx
{/* iOS用アイコン */}
<link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
<link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180x180.png" />

{/* iOS スプラッシュスクリーン */}
<link
  rel="apple-touch-startup-image"
  href="/splash/splash-1170x2532.png"
  media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)"
/>

{/* テーマカラー */}
<meta name="theme-color" content="#3b82f6" media="(prefers-color-scheme: light)" />
<meta name="theme-color" content="#0f172a" media="(prefers-color-scheme: dark)" />

{/* Microsoft Tile */}
<meta name="msapplication-TileColor" content="#3b82f6" />
<meta name="msapplication-TileImage" content="/icons/icon-144x144.png" />
```

### 2.3 Service Worker の実装

#### next-pwa パッケージのインストール

```bash
npm install next-pwa
```

#### next.config.js の設定

```js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      // API キャッシュ（ネットワーク優先）
      urlPattern: /^https:\/\/.*\/api\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60, // 1時間
        },
        networkTimeoutSeconds: 10,
      },
    },
    {
      // 画像キャッシュ（キャッシュ優先）
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'image-cache',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30日
        },
      },
    },
    {
      // Google Fonts
      urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-stylesheets',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1年
        },
      },
    },
    {
      // 静的アセット
      urlPattern: /\.(?:js|css)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-resources',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24, // 1日
        },
      },
    },
  ],
});

module.exports = withPWA({
  // 既存の設定...
});
```

#### カスタム Service Worker（オプション）

より細かい制御が必要な場合は `public/sw.js` を作成:

```js
// Service Worker のバージョン管理
const CACHE_VERSION = 'v1';
const CACHE_NAME = `articard-${CACHE_VERSION}`;

// キャッシュするアセット
const PRECACHE_ASSETS = [
  '/',
  '/offline',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// インストール時にキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// 古いキャッシュの削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('articard-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// フェッチ戦略
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API リクエスト: Network First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match(request))
    );
    return;
  }

  // ナビゲーション: Network First with Offline Fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match('/offline'))
    );
    return;
  }

  // その他: Cache First
  event.respondWith(
    caches.match(request).then((cached) => {
      return cached || fetch(request);
    })
  );
});
```

### 2.4 オフラインページの作成

`src/app/offline/page.tsx` を作成:

```tsx
export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="text-center">
        <div className="text-6xl mb-4">📶</div>
        <h1 className="text-2xl font-bold text-white mb-2">
          オフラインです
        </h1>
        <p className="text-slate-400 mb-6">
          インターネット接続を確認してください
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          再読み込み
        </button>
      </div>
    </div>
  );
}
```

### 2.5 インストール促進 UI

`src/components/pwa/InstallPrompt.tsx` を作成:

```tsx
'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // 初回訪問から3日後に表示
      const lastPrompt = localStorage.getItem('pwa-prompt-dismissed');
      if (!lastPrompt || Date.now() - parseInt(lastPrompt) > 3 * 24 * 60 * 60 * 1000) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-xl z-50">
      <div className="flex items-start gap-3">
        <div className="text-3xl">📱</div>
        <div className="flex-1">
          <h3 className="font-bold text-white mb-1">
            アプリをインストール
          </h3>
          <p className="text-sm text-slate-400 mb-3">
            ホーム画面に追加して、いつでもすぐにアクセス
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleInstall}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
            >
              インストール
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 text-slate-400 text-sm hover:text-white transition"
            >
              後で
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 2.6 iOS Safari 用の対応

iOS Safari では `beforeinstallprompt` イベントが発火しないため、手動で案内を表示:

```tsx
'use client';

import { useState, useEffect } from 'react';

export function IOSInstallGuide() {
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    // iOS Safari かつ PWA として起動していない場合に表示
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const dismissed = localStorage.getItem('ios-install-dismissed');

    if (isIOS && !isStandalone && !dismissed) {
      setShowGuide(true);
    }
  }, []);

  if (!showGuide) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 p-4 z-50">
      <div className="flex items-center gap-3">
        <div className="text-2xl">📲</div>
        <div className="flex-1">
          <p className="text-sm text-white">
            <span className="inline-flex items-center gap-1">
              タップして
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
              </svg>
              「ホーム画面に追加」を選択
            </span>
          </p>
        </div>
        <button
          onClick={() => {
            localStorage.setItem('ios-install-dismissed', 'true');
            setShowGuide(false);
          }}
          className="text-slate-400 hover:text-white"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
```

### 2.7 PWA 動作確認

```bash
# ビルド
npm run build

# プレビュー
npm run start
```

**Chrome DevTools で確認:**

1. Application タブ → Manifest: 設定が正しく読み込まれているか
2. Application タブ → Service Workers: 登録されているか
3. Lighthouse → PWA: スコアを確認

---

## 3. Phase 2: Capacitor導入

### 3.1 Capacitor のインストール

```bash
# Capacitor コア
npm install @capacitor/core @capacitor/cli

# 初期化
npx cap init "Articard" "com.articard.app" --web-dir=out

# iOS/Android プラットフォーム追加
npm install @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android
```

### 3.2 Next.js の静的エクスポート設定

`next.config.js` を更新:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
```

**注意:** 静的エクスポートでは Server Components、API Routes、動的レンダリングが使用できません。API は別途ホストする必要があります。

### 3.3 capacitor.config.ts の設定

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.articard.app',
  appName: 'Articard',
  webDir: 'out',
  server: {
    // 開発時は URL を指定、本番ビルドでは削除
    // url: 'http://localhost:3000',
    // cleartext: true,
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0f172a',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0f172a',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
  ios: {
    contentInset: 'automatic',
    scheme: 'Articard',
  },
  android: {
    backgroundColor: '#0f172a',
  },
};

export default config;
```

### 3.4 ネイティブプラグイン

#### 共通プラグインのインストール

```bash
# ステータスバー
npm install @capacitor/status-bar

# スプラッシュスクリーン
npm install @capacitor/splash-screen

# キーボード
npm install @capacitor/keyboard

# ブラウザ（外部リンク用）
npm install @capacitor/browser

# シェア機能
npm install @capacitor/share

# ローカル通知
npm install @capacitor/local-notifications

# プッシュ通知
npm install @capacitor/push-notifications

# アプリ情報
npm install @capacitor/app

# ストレージ
npm install @capacitor/preferences
```

#### プラグインの同期

```bash
npx cap sync
```

### 3.5 プッシュ通知の実装

#### プッシュ通知の初期化

`src/lib/capacitor/push-notifications.ts` を作成:

```typescript
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

export async function initPushNotifications() {
  if (!Capacitor.isNativePlatform()) {
    console.log('Push notifications are only available on native platforms');
    return null;
  }

  // 権限リクエスト
  const permStatus = await PushNotifications.requestPermissions();

  if (permStatus.receive !== 'granted') {
    console.log('Push notification permission denied');
    return null;
  }

  // 登録
  await PushNotifications.register();

  // トークン受信
  PushNotifications.addListener('registration', (token) => {
    console.log('Push registration success, token:', token.value);
    // サーバーにトークンを送信
    savePushToken(token.value);
  });

  // 登録エラー
  PushNotifications.addListener('registrationError', (error) => {
    console.error('Push registration error:', error);
  });

  // 通知受信（フォアグラウンド）
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push notification received:', notification);
  });

  // 通知タップ
  PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
    console.log('Push notification action:', notification);
    // ディープリンク処理
    handleNotificationAction(notification);
  });
}

async function savePushToken(token: string) {
  // API にトークンを保存
  await fetch('/api/push-tokens', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${await getFirebaseToken()}`,
    },
    body: JSON.stringify({ token, platform: Capacitor.getPlatform() }),
  });
}

function handleNotificationAction(notification: any) {
  // 通知データに基づいてナビゲーション
  const data = notification.notification.data;
  if (data?.cardId) {
    window.location.href = `/cards/${data.cardId}`;
  }
}
```

### 3.6 シェア機能の実装

`src/lib/capacitor/share.ts` を作成:

```typescript
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

export async function shareCard(card: {
  id: string;
  keyword: string;
  rarity: string;
  imageUrl: string;
}) {
  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/cards/${card.id}`;

  if (Capacitor.isNativePlatform()) {
    await Share.share({
      title: `${card.keyword} (${card.rarity})`,
      text: `Articardで「${card.keyword}」のカードを手に入れました！`,
      url: shareUrl,
      dialogTitle: 'カードをシェア',
    });
  } else {
    // Web の場合は Web Share API または フォールバック
    if (navigator.share) {
      await navigator.share({
        title: `${card.keyword} (${card.rarity})`,
        text: `Articardで「${card.keyword}」のカードを手に入れました！`,
        url: shareUrl,
      });
    } else {
      // クリップボードにコピー
      await navigator.clipboard.writeText(shareUrl);
      alert('リンクをコピーしました');
    }
  }
}
```

### 3.7 ビルドコマンド

#### iOS ビルド

```bash
# Next.js を静的エクスポート
npm run build

# Capacitor 同期
npx cap sync ios

# Xcode で開く
npx cap open ios
```

Xcode での追加設定:
1. Signing & Capabilities で Team を選択
2. Bundle Identifier を設定
3. 必要な Capabilities を追加（Push Notifications など）

#### Android ビルド

```bash
# Next.js を静的エクスポート
npm run build

# Capacitor 同期
npx cap sync android

# Android Studio で開く
npx cap open android
```

Android Studio での追加設定:
1. `android/app/build.gradle` でバージョン設定
2. 署名設定（リリースビルド用）

### 3.8 Live Reload（開発時）

```bash
# 開発サーバー起動
npm run dev

# capacitor.config.ts で server.url を設定してから
npx cap run ios
npx cap run android
```

---

## 4. Firebase設定（モバイル用）

### 4.1 iOS アプリ登録

1. Firebase Console → プロジェクト設定 → マイアプリ → iOS を追加
2. Bundle ID: `com.articard.app`
3. `GoogleService-Info.plist` をダウンロード
4. Xcode の `App` フォルダに追加

### 4.2 Android アプリ登録

1. Firebase Console → プロジェクト設定 → マイアプリ → Android を追加
2. パッケージ名: `com.articard.app`
3. SHA-1 フィンガープリント（Google Sign-In 使用時）:
   ```bash
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```
4. `google-services.json` をダウンロード
5. `android/app/` に配置

### 4.3 認証設定

#### ディープリンク設定

Firebase Console → Authentication → Sign-in method → Authorized domains に追加:

- `articard.com`
- `localhost`
- `com.articard.app` (iOS)

#### iOS Universal Links

`apple-app-site-association` を `public/.well-known/` に配置:

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.articard.app",
        "paths": ["*"]
      }
    ]
  }
}
```

#### Android App Links

`assetlinks.json` を `public/.well-known/` に配置:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.articard.app",
      "sha256_cert_fingerprints": ["SHA256_FINGERPRINT"]
    }
  }
]
```

### 4.4 FCM プッシュ通知設定

#### iOS (APNs)

1. Apple Developer で Push Notifications の Capability を有効化
2. APNs 認証キー（.p8）を作成
3. Firebase Console → Cloud Messaging → APNs 認証キーをアップロード

#### Android

Android は `google-services.json` を配置するだけで自動設定されます。

---

## 5. アプリストア公開

### 5.1 App Store 準備

#### 必要なもの

- Apple Developer Program 登録（年間 $99）
- App Store Connect アカウント
- 1024x1024 アプリアイコン
- スクリーンショット（6.7", 6.5", 5.5" など）
- プライバシーポリシー URL
- サポート URL

#### App Store Connect 設定

1. 新規アプリ作成
2. アプリ情報入力:
   - アプリ名: Articard
   - サブタイトル: AI学習カード
   - カテゴリ: 教育、エンターテインメント
   - 年齢制限: 4+
3. プライバシー詳細:
   - 収集データ: アカウント情報、使用状況データ
   - トラッキング: なし

#### Xcode からアップロード

```bash
# Archive 作成
Product → Archive

# App Store Connect にアップロード
Window → Organizer → Distribute App
```

#### 審査ガイドライン対策

- [ ] ログイン機能がある場合はゲストモードまたはデモアカウントを提供
- [ ] 課金がある場合は In-App Purchase を使用
- [ ] プライバシーポリシーを明記
- [ ] 著作権侵害コンテンツがないことを確認

### 5.2 Google Play 準備

#### 必要なもの

- Google Play Console 登録（一度きり $25）
- 512x512 アプリアイコン
- フィーチャーグラフィック（1024x500）
- スクリーンショット（各デバイスタイプ）
- プライバシーポリシー URL

#### リリース署名

```bash
# キーストア作成
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
cd android
./gradlew bundleRelease
```

出力: `android/app/build/outputs/bundle/release/app-release.aab`

#### Play Console 設定

1. アプリの作成
2. ストア掲載情報入力
3. コンテンツ評価アンケート回答
4. 価格と配布地域設定
5. 内部テスト → クローズドテスト → 本番公開

### 5.3 プライバシーポリシー・利用規約

`public/legal/privacy-policy.html` と `public/legal/terms.html` を作成し、以下を含める:

- 収集する個人情報
- データの使用目的
- 第三者との共有
- データ保持期間
- ユーザーの権利
- 連絡先

---

## 6. CI/CD パイプライン

### 6.1 GitHub Actions for iOS

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

      - name: Build Next.js
        run: npm run build
        env:
          NEXT_PUBLIC_FIREBASE_API_KEY: ${{ secrets.FIREBASE_API_KEY }}
          NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ${{ secrets.FIREBASE_AUTH_DOMAIN }}
          NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
          NEXT_PUBLIC_APP_URL: https://articard.com

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
          bundle-id: com.articard.app
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

#### Fastlane 設定 (ios/App/fastlane/Fastfile)

```ruby
default_platform(:ios)

platform :ios do
  desc "Push a new beta build to TestFlight"
  lane :beta do
    increment_build_number(xcodeproj: "App.xcodeproj")
    build_app(
      workspace: "App.xcworkspace",
      scheme: "App",
      export_method: "app-store"
    )
    upload_to_testflight(
      skip_waiting_for_build_processing: true
    )
  end
end
```

### 6.2 GitHub Actions for Android

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

      - name: Build Next.js
        run: npm run build
        env:
          NEXT_PUBLIC_FIREBASE_API_KEY: ${{ secrets.FIREBASE_API_KEY }}
          NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ${{ secrets.FIREBASE_AUTH_DOMAIN }}
          NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
          NEXT_PUBLIC_APP_URL: https://articard.com

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
          packageName: com.articard.app
          releaseFiles: android/app/build/outputs/bundle/release/app-release.aab
          track: internal
          status: completed
```

---

## 7. モバイル固有の考慮事項

### 7.1 パフォーマンス最適化

#### 画像最適化

```tsx
// WebP フォーマット、適切なサイズで配信
<Image
  src={card.thumbnailUrl}
  alt={card.keyword}
  width={300}
  height={420}
  loading="lazy"
  placeholder="blur"
  blurDataURL={card.placeholderUrl}
/>
```

#### バンドルサイズ削減

```bash
# バンドル分析
npm run build
npx @next/bundle-analyzer
```

- 大きなライブラリは動的インポート
- 未使用のコードは tree-shaking

#### メモリ管理

```typescript
// 画像キャッシュの制限
const MAX_CACHED_IMAGES = 100;

// 無限スクロールでのメモリ解放
useEffect(() => {
  return () => {
    // コンポーネントアンマウント時にクリーンアップ
    imageCache.clear();
  };
}, []);
```

### 7.2 オフライン時の動作

#### オフライン状態の検出

```typescript
'use client';

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

#### オフラインファースト戦略

```typescript
// TanStack Query でのキャッシュ活用
const { data: cards } = useQuery({
  queryKey: ['cards'],
  queryFn: fetchCards,
  staleTime: 1000 * 60 * 5, // 5分間はキャッシュを使用
  gcTime: 1000 * 60 * 60 * 24, // 24時間キャッシュを保持
  networkMode: 'offlineFirst',
});
```

### 7.3 ディープリンク対応

#### URL スキーム

`capacitor.config.ts` に追加:

```typescript
ios: {
  scheme: 'articard',
},
android: {
  // Android は AndroidManifest.xml で設定
},
```

#### ディープリンクハンドラー

```typescript
import { App, URLOpenListenerEvent } from '@capacitor/app';

App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
  const url = new URL(event.url);
  const path = url.pathname;

  // /cards/123 → カード詳細ページへ
  if (path.startsWith('/cards/')) {
    const cardId = path.split('/')[2];
    router.push(`/cards/${cardId}`);
  }
  // /articles/123 → 記事詳細ページへ
  else if (path.startsWith('/articles/')) {
    const articleId = path.split('/')[2];
    router.push(`/articles/${articleId}`);
  }
});
```

### 7.4 バージョン管理・強制アップデート

#### バージョンチェック API

`src/app/api/version/route.ts`:

```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ios: {
      latestVersion: '1.2.0',
      minVersion: '1.0.0',
      updateUrl: 'https://apps.apple.com/app/articard/id123456789',
    },
    android: {
      latestVersion: '1.2.0',
      minVersion: '1.0.0',
      updateUrl: 'https://play.google.com/store/apps/details?id=com.articard.app',
    },
  });
}
```

#### クライアント側チェック

```typescript
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

async function checkForUpdates() {
  if (!Capacitor.isNativePlatform()) return;

  const platform = Capacitor.getPlatform();
  const appInfo = await App.getInfo();
  const currentVersion = appInfo.version;

  const response = await fetch('/api/version');
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

function showForceUpdateDialog(updateUrl: string) {
  // 閉じられないモーダルでアップデートを促す
  // Browser.open({ url: updateUrl });
}
```

---

## 8. チェックリスト

### 8.1 PWA対応チェックリスト

- [ ] `manifest.json` が正しく配置されている
- [ ] 全サイズのアイコンが用意されている
- [ ] Service Worker が登録されている
- [ ] オフラインページが表示される
- [ ] HTTPS で配信されている
- [ ] Lighthouse PWA スコアが 90+ である
- [ ] 「ホーム画面に追加」が機能する
- [ ] iOS Safari でも正しく動作する

### 8.2 Capacitor ビルドチェックリスト

- [ ] `capacitor.config.ts` が正しく設定されている
- [ ] iOS: `GoogleService-Info.plist` が配置されている
- [ ] Android: `google-services.json` が配置されている
- [ ] プラグインが正しくインストールされている
- [ ] `npx cap sync` でエラーがない
- [ ] iOS シミュレーターで動作する
- [ ] Android エミュレーターで動作する

### 8.3 ストア公開チェックリスト

#### 共通

- [ ] プライバシーポリシーが公開されている
- [ ] 利用規約が公開されている
- [ ] サポート連絡先が設定されている
- [ ] アプリアイコンが用意されている
- [ ] スクリーンショットが用意されている

#### App Store (iOS)

- [ ] Apple Developer Program に登録している
- [ ] App Store Connect でアプリが作成されている
- [ ] 署名証明書とプロビジョニングプロファイルが設定されている
- [ ] コンテンツ年齢制限が設定されている
- [ ] プライバシー詳細が入力されている
- [ ] TestFlight でテスト済み

#### Google Play (Android)

- [ ] Google Play Console でアプリが作成されている
- [ ] 署名キーが設定されている
- [ ] コンテンツ評価アンケートに回答している
- [ ] データセーフティセクションが入力されている
- [ ] 内部テストで動作確認済み

---

## 参考リンク

- [Next.js PWA](https://github.com/shadowwalker/next-pwa)
- [Capacitor 公式ドキュメント](https://capacitorjs.com/docs)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Developer Policy](https://play.google.com/console/about/developer-content-policy/)
- [Fastlane](https://fastlane.tools/)
