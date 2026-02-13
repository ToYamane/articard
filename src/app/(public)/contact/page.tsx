import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'お問い合わせ | Articard',
  description: 'Articardへのお問い合わせ',
};

export default function ContactPage() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-black md:p-8">
      <h1 className="mb-8 text-2xl font-bold text-gray-900 dark:text-gray-100">
        お問い合わせ
      </h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        最終更新日: 2026年2月12日
      </p>

      <p className="mb-4 leading-relaxed text-gray-600 dark:text-gray-300">
        Articardに関するお問い合わせは、以下のメールアドレスまでお気軽にご連絡ください。
      </p>

      <div className="mb-8 rounded-lg bg-gray-50 p-6 dark:bg-gray-800">
        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          メールアドレス
        </p>
        <a
          href="mailto:support@articard.app"
          className="mt-2 inline-block text-lg text-blue-600 hover:underline dark:text-blue-400"
        >
          support@articard.app
        </a>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          お問い合わせの際にお送りいただいた個人情報は、回答のためにのみ使用し、お問い合わせ対応後は適切に管理いたします。
        </p>
      </div>

      <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-900 dark:text-gray-100">
        お問い合わせの際のお願い
      </h2>
      <p className="mb-4 leading-relaxed text-gray-600 dark:text-gray-300">
        お問い合わせの際は、以下の情報をお知らせいただけるとスムーズに対応できます。
      </p>
      <ul className="mb-4 list-inside list-disc space-y-2 text-gray-600 dark:text-gray-300">
        <li>お名前（ニックネーム可）</li>
        <li>ご登録のメールアドレス</li>
        <li>お問い合わせ内容の詳細</li>
        <li>問題が発生している場合は、発生日時と状況の説明</li>
        <li>スクリーンショット等（該当する場合）</li>
      </ul>

      <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-900 dark:text-gray-100">
        回答について
      </h2>
      <p className="mb-4 leading-relaxed text-gray-600 dark:text-gray-300">
        お問い合わせへの回答は、通常3営業日以内にメールにてお返事いたします。お問い合わせ内容によっては、回答にお時間をいただく場合がございますので、あらかじめご了承ください。
      </p>
      <p className="mb-4 leading-relaxed text-gray-600 dark:text-gray-300">
        なお、以下に該当するお問い合わせにはお答えできない場合があります。
      </p>
      <ul className="mb-4 list-inside list-disc space-y-2 text-gray-600 dark:text-gray-300">
        <li>本サービスと関係のないお問い合わせ</li>
        <li>誹謗中傷や不適切な内容を含むもの</li>
        <li>個別の技術的なサポートの範囲を超えるもの</li>
      </ul>
    </div>
  );
}
