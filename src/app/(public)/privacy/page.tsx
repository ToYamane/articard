import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'プライバシーポリシー | Articard',
  description: 'Articardのプライバシーポリシー',
};

export default function PrivacyPage() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-black md:p-8">
      <h1 className="mb-8 text-2xl font-bold text-gray-900 dark:text-gray-100">
        プライバシーポリシー
      </h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">最終更新日: 2026年2月15日</p>

      <p className="mb-4 leading-relaxed text-gray-600 dark:text-gray-300">
        個人情報取扱事業者:
        山根聡展（以下「運営者」）が提供するArticard（以下「本サービス」）は、ユーザーのプライバシーを尊重し、個人情報の保護に努めます。本プライバシーポリシーは、本サービスにおける個人情報の取り扱いについて説明するものです。
      </p>

      <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-900 dark:text-gray-100">
        1. 収集する情報
      </h2>
      <p className="mb-4 leading-relaxed text-gray-600 dark:text-gray-300">
        本サービスでは、以下の情報を収集します。
      </p>
      <ul className="mb-4 list-inside list-disc space-y-2 text-gray-600 dark:text-gray-300">
        <li>
          <strong>アカウント情報:</strong> Firebase
          Authenticationを通じて取得するメールアドレス、表示名、プロフィール画像URL等の認証情報
        </li>
        <li>
          <strong>Googleアカウント情報:</strong>{' '}
          Googleアカウントでログインした場合、Googleから提供されるメールアドレス、表示名、プロフィール画像を取得します
        </li>
        <li>
          <strong>プロフィール情報:</strong> ユーザーが設定するニックネーム等の情報
        </li>
        <li>
          <strong>利用データ:</strong>{' '}
          生成した記事、作成したカード、コレクション情報等のサービス利用に関するデータ
        </li>
        <li>
          <strong>技術情報:</strong>{' '}
          アクセスログ、IPアドレス、ブラウザ情報、デバイス情報等の技術的な情報
        </li>
      </ul>

      <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-900 dark:text-gray-100">
        2. 情報の利用目的
      </h2>
      <p className="mb-4 leading-relaxed text-gray-600 dark:text-gray-300">
        収集した情報は、以下の目的で利用します。
      </p>
      <ul className="mb-4 list-inside list-disc space-y-2 text-gray-600 dark:text-gray-300">
        <li>本サービスの提供・運営・改善</li>
        <li>ユーザー認証およびアカウント管理</li>
        <li>AI機能による記事・カード生成の実行</li>
        <li>ユーザーサポートへの対応</li>
        <li>利用状況の分析およびサービス改善</li>
        <li>不正利用の防止およびセキュリティの確保</li>
        <li>重要なお知らせや規約変更の通知</li>
      </ul>

      <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-900 dark:text-gray-100">
        3. 第三者提供
      </h2>
      <p className="mb-4 leading-relaxed text-gray-600 dark:text-gray-300">
        本サービスは、以下の場合を除き、ユーザーの個人情報を第三者に提供しません。
      </p>
      <ul className="mb-4 list-inside list-disc space-y-2 text-gray-600 dark:text-gray-300">
        <li>ユーザーの同意がある場合</li>
        <li>法令に基づく場合</li>
        <li>人の生命、身体または財産の保護のために必要な場合</li>
        <li>サービス提供に必要な業務委託先（下記参照）への提供</li>
      </ul>
      <p className="mb-4 leading-relaxed text-gray-600 dark:text-gray-300">
        本サービスでは、以下の外部サービスを利用しています。
      </p>
      <ul className="mb-4 list-inside list-disc space-y-2 text-gray-600 dark:text-gray-300">
        <li>
          <strong>Firebase Authentication (Google):</strong> ユーザー認証
        </li>
        <li>
          <strong>Google Cloud Platform:</strong> データベース・ストレージ等のインフラ
        </li>
        <li>
          <strong>OpenAI:</strong> 記事生成AI・カード画像生成（DALL-E）
        </li>
        <li>
          <strong>FLUX (Black Forest Labs):</strong> カード画像生成
        </li>
        <li>
          <strong>Google Gemini:</strong> カード画像生成
        </li>
        <li>
          <strong>Stripe:</strong>{' '}
          決済処理。なお、クレジットカード情報は当サービスのサーバーには保存されず、Stripeが直接処理します。
        </li>
      </ul>

      <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-900 dark:text-gray-100">
        4. Cookieおよび類似技術
      </h2>
      <p className="mb-4 leading-relaxed text-gray-600 dark:text-gray-300">
        本サービスでは、ユーザー認証の維持およびサービスの適切な提供のために、Cookieおよびローカルストレージなどのブラウザ技術を使用します。これらはサービスの機能に不可欠なものであり、無効にした場合、サービスが正常に動作しないことがあります。
      </p>

      <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-900 dark:text-gray-100">
        5. AIへのデータ提供
      </h2>
      <p className="mb-4 leading-relaxed text-gray-600 dark:text-gray-300">
        本サービスで利用するAI（OpenAI、FLUX、Gemini等）はAPI経由で利用しており、ユーザーの入力データや生成コンテンツがAIモデルの学習に使用されることはありません。
      </p>

      <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-900 dark:text-gray-100">
        6. データの保管と安全管理
      </h2>
      <p className="mb-4 leading-relaxed text-gray-600 dark:text-gray-300">
        ユーザーのデータは、Google Cloud Platform上のサーバー（東京リージョン:
        asia-northeast1）に保管されます。アカウント削除後、30日以内に個人データを削除いたします。
      </p>
      <p className="mb-4 leading-relaxed text-gray-600 dark:text-gray-300">
        当サービスでは、個人情報の安全管理のために以下の措置を講じています。
      </p>
      <ul className="mb-4 list-inside list-disc space-y-2 text-gray-600 dark:text-gray-300">
        <li>すべての通信における暗号化（TLS）の実施</li>
        <li>データベースおよびサーバーへのアクセス制御</li>
        <li>定期的なセキュリティ更新およびソフトウェアの保守</li>
        <li>不正アクセス、紛失、破損、漏洩の防止に向けた継続的な対策</li>
      </ul>

      <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-900 dark:text-gray-100">
        7. データの国外移転
      </h2>
      <p className="mb-4 leading-relaxed text-gray-600 dark:text-gray-300">
        本サービスのAI機能を利用する際、ユーザーが入力したテーマや生成指示が、以下のAPIプロバイダーのサーバー（主に米国）に送信されます。
      </p>
      <ul className="mb-4 list-inside list-disc space-y-2 text-gray-600 dark:text-gray-300">
        <li>
          <strong>OpenAI（米国）:</strong> 記事生成およびカード画像生成（DALL-E）
        </li>
        <li>
          <strong>FLUX / Black Forest Labs（米国）:</strong> カード画像生成
        </li>
        <li>
          <strong>Google Gemini（米国）:</strong> カード画像生成
        </li>
        <li>
          <strong>Stripe（米国）:</strong> 決済データの処理
        </li>
      </ul>
      <p className="mb-4 leading-relaxed text-gray-600 dark:text-gray-300">
        各プロバイダーは適切なセキュリティ措置を講じており、データは各社のプライバシーポリシーに基づいて取り扱われます。
      </p>

      <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-900 dark:text-gray-100">
        8. ユーザーの権利
      </h2>
      <p className="mb-4 leading-relaxed text-gray-600 dark:text-gray-300">
        ユーザーは、自己の個人情報について以下の権利を有します。
      </p>
      <ul className="mb-4 list-inside list-disc space-y-2 text-gray-600 dark:text-gray-300">
        <li>個人情報の開示を請求する権利</li>
        <li>個人情報の訂正・追加・削除を請求する権利</li>
        <li>個人情報の利用停止を請求する権利</li>
        <li>アカウントの削除を請求する権利</li>
      </ul>
      <p className="mb-4 leading-relaxed text-gray-600 dark:text-gray-300">
        これらの権利を行使する場合は、お問い合わせ窓口までご連絡ください。
      </p>

      <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-900 dark:text-gray-100">
        9. ポリシーの変更
      </h2>
      <p className="mb-4 leading-relaxed text-gray-600 dark:text-gray-300">
        本プライバシーポリシーは、必要に応じて変更されることがあります。重要な変更がある場合は、本サービス上で通知します。変更後も本サービスの利用を継続した場合、ユーザーは変更後のポリシーに同意したものとみなします。
      </p>

      <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-900 dark:text-gray-100">
        10. お問い合わせ
      </h2>
      <p className="mb-4 leading-relaxed text-gray-600 dark:text-gray-300">
        プライバシーに関するお問い合わせは、以下の連絡先までお願いいたします。
      </p>
      <p className="mb-4 leading-relaxed text-gray-600 dark:text-gray-300">
        メールアドレス:{' '}
        <a
          href="mailto:support@articard.app"
          className="text-blue-600 hover:underline dark:text-blue-400"
        >
          support@articard.app
        </a>
      </p>
    </div>
  );
}
