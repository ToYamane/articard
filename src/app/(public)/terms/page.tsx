import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '利用規約 | Articard',
  description: 'Articardの利用規約',
};

export default function TermsPage() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-black md:p-8">
      <h1 className="mb-8 text-2xl font-bold text-gray-900 dark:text-gray-100">利用規約</h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">最終更新日: 2026年2月15日</p>

      <p className="mb-4 leading-relaxed text-gray-600 dark:text-gray-300">
        本利用規約（以下「本規約」）は、山根聡展（以下「運営者」）が提供するArticard（以下「本サービス」）の利用条件を定めるものです。ユーザーの皆様には、本規約に同意の上、本サービスをご利用いただきます。
      </p>

      <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-900 dark:text-gray-100">
        第1条 サービスの概要
      </h2>
      <p className="mb-4 leading-relaxed text-gray-600 dark:text-gray-300">
        本サービスは、AI技術を活用して学習記事を生成し、記事のキーワードからコレクティブルカードを作成する学習プラットフォームです。ユーザーはテーマを入力することで、AIが生成した学習記事と、レアリティの異なるカードを取得できます。
      </p>

      <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-900 dark:text-gray-100">
        第2条 利用登録
      </h2>
      <p className="mb-4 leading-relaxed text-gray-600 dark:text-gray-300">
        本サービスの利用にあたり、ユーザーは以下の条件を満たす必要があります。
      </p>
      <ul className="mb-4 list-inside list-disc space-y-2 text-gray-600 dark:text-gray-300">
        <li>正確な情報を用いてアカウント登録を行うこと</li>
        <li>1人につき1つのアカウントのみを保有すること</li>
        <li>アカウント情報を第三者と共有しないこと</li>
        <li>18歳未満の場合は保護者の同意を得ていること</li>
      </ul>

      <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-900 dark:text-gray-100">
        第2条の2 有料サービス
      </h2>
      <ul className="mb-4 list-inside list-disc space-y-2 text-gray-600 dark:text-gray-300">
        <li>
          本サービスでは、コイン（アプリ内通貨）を購入することで、記事生成やカード作成等の機能を利用できます。
        </li>
        <li>購入済みコインに有効期限はありません。</li>
        <li>
          決済はStripeによるクレジットカード決済で行われ、購入手続き完了時に即時決済されます。
        </li>
        <li>
          デジタルコンテンツの性質上、購入後のコインの返金には原則として応じかねます。ただし、サービスの不具合等により正常にサービスが提供されなかった場合は、個別に対応いたします。
        </li>
      </ul>

      <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-900 dark:text-gray-100">
        第2条の3 サブスクリプション
      </h2>
      <ul className="mb-4 list-inside list-disc space-y-2 text-gray-600 dark:text-gray-300">
        <li>
          本サービスでは、月額制のサブスクリプションプランを提供しています。プランの内容および価格は、アプリ内の購入画面に表示されます。
        </li>
        <li>サブスクリプションは月額自動更新です。Stripe経由で毎月同日に課金されます。</li>
        <li>解約はアプリ内の設定画面からいつでも行うことができます。</li>
        <li>
          解約後も、契約期間の終了日まではサブスクリプション特典を引き続きご利用いただけます。
        </li>
        <li>サブスクリプションの日割り返金には対応しておりません。</li>
      </ul>

      <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-900 dark:text-gray-100">
        第2条の4 退会
      </h2>
      <ul className="mb-4 list-inside list-disc space-y-2 text-gray-600 dark:text-gray-300">
        <li>
          ユーザーは、アプリ内の設定画面からいつでもアカウントを削除し、退会することができます。
        </li>
        <li>退会時に残存するコインおよびサブスクリプションの残期間について、返金は行いません。</li>
        <li>アカウント削除後、30日以内にユーザーの個人データを削除いたします。</li>
      </ul>

      <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-900 dark:text-gray-100">
        第3条 禁止事項
      </h2>
      <p className="mb-4 leading-relaxed text-gray-600 dark:text-gray-300">
        ユーザーは、本サービスの利用にあたり、以下の行為を行ってはなりません。
      </p>
      <ul className="mb-4 list-inside list-disc space-y-2 text-gray-600 dark:text-gray-300">
        <li>法令または公序良俗に違反する行為</li>
        <li>犯罪行為に関連する行為</li>
        <li>本サービスのサーバーまたはネットワークの機能を破壊・妨害する行為</li>
        <li>本サービスの運営を妨害するおそれのある行為</li>
        <li>他のユーザーに関する個人情報等を収集・蓄積する行為</li>
        <li>不正アクセスをし、またはこれを試みる行為</li>
        <li>他のユーザーに成りすます行為</li>
        <li>本サービスに関連して反社会的勢力に対して直接・間接に利益を供与する行為</li>
        <li>自動化ツール等を用いて大量のリクエストを送信する行為</li>
        <li>その他、運営が不適切と判断する行為</li>
      </ul>

      <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-900 dark:text-gray-100">
        第3条の2 アカウントの停止・削除
      </h2>
      <p className="mb-4 leading-relaxed text-gray-600 dark:text-gray-300">
        運営者は、ユーザーが前条の禁止事項に違反した場合、またはその他運営者が不適切と判断した場合、事前の通知なくアカウントの停止または削除を行うことができます。アカウント停止・削除時に残存するコインの返金は行いません。
      </p>

      <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-900 dark:text-gray-100">
        第4条 知的財産権
      </h2>
      <p className="mb-4 leading-relaxed text-gray-600 dark:text-gray-300">
        本サービスに関する知的財産権は、すべて運営者または正当な権利者に帰属します。ユーザーが本サービスを通じて生成したコンテンツ（記事・カード画像等）については、以下の範囲で使用することができます。
      </p>
      <ul className="mb-4 list-inside list-disc space-y-2 text-gray-600 dark:text-gray-300">
        <li>個人的な学習・鑑賞目的での利用</li>
        <li>SNS、ブログ、個人サイト等での共有・掲載</li>
      </ul>
      <p className="mb-4 leading-relaxed text-gray-600 dark:text-gray-300">
        ただし、生成コンテンツを販売する行為、または営利を主目的とした利用（広告収益を主目的としたサイトへの掲載等）は禁止します。なお、AIによって生成されたコンテンツの著作権の扱いは、各国の法令に従います。
      </p>

      <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-900 dark:text-gray-100">
        第5条 免責事項
      </h2>
      <ul className="mb-4 list-inside list-disc space-y-2 text-gray-600 dark:text-gray-300">
        <li>
          本サービスは現状有姿で提供され、特定の目的への適合性について保証するものではありません。
        </li>
        <li>AIによって生成されたコンテンツの正確性、完全性について保証しません。</li>
        <li>
          本サービスの利用により生じた損害について、運営者の故意または重過失による場合を除き、一切の責任を負いません。
        </li>
        <li>サービスの中断、変更、終了によりユーザーに生じた損害について責任を負いません。</li>
        <li>
          サービスを終了する場合は、30日前までにサービス上で通知いたします。また、終了日までに未使用コインを利用いただけるよう、十分な使い切り期間を設けます。
        </li>
      </ul>

      <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-900 dark:text-gray-100">
        第6条 利用規約の変更
      </h2>
      <p className="mb-4 leading-relaxed text-gray-600 dark:text-gray-300">
        運営者は、必要に応じて本規約を変更することができます。重要な変更を行う場合は、変更の14日前までにサービス上で通知いたします。変更後も本サービスの利用を継続した場合、ユーザーは変更後の規約に同意したものとみなします。
      </p>

      <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-900 dark:text-gray-100">
        第7条 準拠法・管轄裁判所
      </h2>
      <p className="mb-4 leading-relaxed text-gray-600 dark:text-gray-300">
        本規約の解釈にあたっては日本法を準拠法とします。本サービスに関して紛争が生じた場合には、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
      </p>
    </div>
  );
}
