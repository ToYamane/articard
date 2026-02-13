import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '特定商取引法に基づく表記 | Articard',
  description: 'Articardの特定商取引法に基づく表記',
};

export default function CommercePage() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-black md:p-8">
      <h1 className="mb-8 text-2xl font-bold text-gray-900 dark:text-gray-100">
        特定商取引法に基づく表記
      </h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        最終更新日: 2026年2月12日
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <tbody>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                事業者名
              </th>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                山根聡展
              </td>
            </tr>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                代表者名
              </th>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                山根聡展
              </td>
            </tr>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                所在地
              </th>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                請求があれば遅滞なく開示いたします
              </td>
            </tr>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                電話番号
              </th>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                請求があれば遅滞なく開示いたします
              </td>
            </tr>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                連絡先
              </th>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                メールアドレス:{' '}
                <a
                  href="mailto:support@articard.app"
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  support@articard.app
                </a>
              </td>
            </tr>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                販売商品
              </th>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                ナレッジ（アプリ内通貨）の購入
              </td>
            </tr>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                販売価格
              </th>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                アプリ内の購入画面に表示される価格に準じます（税込表示）。
              </td>
            </tr>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                支払方法
              </th>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                クレジットカード決済（Stripe経由）
              </td>
            </tr>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                支払時期
              </th>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                購入手続き完了時に即時決済されます。
              </td>
            </tr>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                サービス提供時期
              </th>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                決済完了後、即時にサービスをご利用いただけます。
              </td>
            </tr>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                返品・キャンセル
              </th>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                デジタルコンテンツの性質上、購入後の返品・キャンセルには原則として応じかねます。ただし、サービスの不具合等により正常にサービスが提供されなかった場合は、個別に対応いたします。お問い合わせは上記連絡先までお願いいたします。
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
