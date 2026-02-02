// 文章スタイル（コンテンツタイプ）の定義
export const CONTENT_TYPES = ['essay', 'story', 'dialogue', 'poem', 'explanation'] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export interface ContentTypeInfo {
  label: string;
  description: string;
  targetLength: number;
}

export const CONTENT_TYPE_INFO: Record<ContentType, ContentTypeInfo> = {
  essay: {
    label: '論文形式',
    description: '客観的で論理的な解説',
    targetLength: 800,
  },
  story: {
    label: '物語形式',
    description: '登場人物がいるストーリー仕立て',
    targetLength: 800,
  },
  dialogue: {
    label: '会話形式',
    description: '先生と生徒などの対話形式',
    targetLength: 800,
  },
  poem: {
    label: '詩',
    description: 'リズムや韻を意識した詩的表現',
    targetLength: 300,
  },
  explanation: {
    label: 'やさしい解説',
    description: '小学生にもわかる平易な説明',
    targetLength: 600,
  },
};
