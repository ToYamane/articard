import { logger } from '@/lib/logger';

const BFL_API_BASE_URL = 'https://api.bfl.ai/v1';

// FLUX モデルタイプ
export type FluxModel =
  | 'flux-pro-1.1' // FLUX 1.1 Pro (現在使用中) ~$0.04
  | 'flux-2-pro' // FLUX.2 Pro (最高品質) ~$0.04
  | 'flux-2-dev' // FLUX.2 Dev (32Bパラメータ) ~$0.015
  | 'flux-2-klein' // FLUX.2 Klein (超高速) ~$0.01
  | 'flux-schnell'; // FLUX.1 Schnell (最速・最安) ~$0.003

// モデルごとのエンドポイント
const MODEL_ENDPOINTS: Record<FluxModel, string> = {
  'flux-pro-1.1': 'flux-pro-1.1',
  'flux-2-pro': 'flux-2-pro',
  'flux-2-dev': 'flux-2-dev',
  'flux-2-klein': 'flux-2-klein',
  'flux-schnell': 'flux-schnell',
};

interface FluxGenerationParams {
  prompt: string;
  model?: FluxModel;
  width?: number;
  height?: number;
  prompt_upsampling?: boolean;
  seed?: number;
  safety_tolerance?: number; // 0 (most strict) to 6 (more permissive)
  output_format?: 'jpeg' | 'png';
}

interface FluxGenerationResponse {
  id: string;
  polling_url: string;
}

interface FluxResultResponse {
  status:
    | 'Ready'
    | 'Pending'
    | 'Error'
    | 'Request Moderated'
    | 'Content Moderated'
    | 'Task not found';
  result?: {
    sample: string; // URL to the generated image
  };
}

/**
 * FLUX APIキーを取得
 */
function getApiKey(): string {
  const apiKey = process.env.BFL_API_KEY;
  if (!apiKey) {
    throw new Error('BFL_API_KEY is not configured');
  }
  return apiKey;
}

export interface FluxRequestResult {
  taskId: string;
  pollingUrl: string;
}

/**
 * FLUX APIで画像生成リクエストを送信
 * @param params - 生成パラメータ
 * @param params.model - 使用するFLUXモデル (デフォルト: flux-pro-1.1)
 */
export async function requestImageGeneration(
  params: FluxGenerationParams
): Promise<FluxRequestResult> {
  const apiKey = getApiKey();
  const model = params.model || 'flux-pro-1.1';
  const endpoint = MODEL_ENDPOINTS[model];

  logger.info(`FLUX API request starting with model: ${model}`);

  const response = await fetch(`${BFL_API_BASE_URL}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Key': apiKey,
    },
    body: JSON.stringify({
      prompt: params.prompt,
      width: params.width || 512,
      height: params.height || 768,
      prompt_upsampling: params.prompt_upsampling ?? false,
      safety_tolerance: params.safety_tolerance ?? 2, // 0-6, default 2
      output_format: params.output_format || 'jpeg',
      ...(params.seed !== undefined && { seed: params.seed }),
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error('FLUX API request error', {
      status: response.status,
      statusText: response.statusText,
      body: error,
      prompt: params.prompt.substring(0, 100),
    });
    throw new Error(`イラストの生成リクエストに失敗しました (HTTP ${response.status}): ${error}`);
  }

  const data: FluxGenerationResponse = await response.json();
  logger.info('FLUX API request success', { taskId: data.id, pollingUrl: data.polling_url });
  return { taskId: data.id, pollingUrl: data.polling_url };
}

/**
 * 生成結果を取得（ポーリング）
 * @param pollingUrl - APIレスポンスから取得したpolling_url
 */
export async function getGenerationResult(pollingUrl: string): Promise<string> {
  const apiKey = getApiKey();

  const maxAttempts = 60; // 最大60回（約60秒）
  const pollInterval = 1000; // 1秒間隔

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(pollingUrl, {
      headers: {
        'X-Key': apiKey,
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('FLUX API get_result error', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        pollingUrl,
      });
      throw new Error(`結果の取得に失敗しました (HTTP ${response.status}): ${errorText}`);
    }

    const data: FluxResultResponse = await response.json();

    switch (data.status) {
      case 'Ready':
        logger.info('FLUX API generation ready', {
          imageUrl: data.result?.sample?.substring(0, 50),
        });
        if (data.result?.sample) {
          return data.result.sample;
        }
        throw new Error('画像URLが見つかりません');

      case 'Pending':
        // 待機して再試行
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
        break;

      case 'Error':
        throw new Error('イラストの生成中にエラーが発生しました');

      case 'Request Moderated':
      case 'Content Moderated':
        throw new Error('コンテンツが安全性フィルターによりブロックされました');

      case 'Task not found':
        throw new Error('生成タスクが見つかりません');

      default:
        throw new Error(`予期しないステータス: ${data.status}`);
    }
  }

  throw new Error('イラストの生成がタイムアウトしました');
}

/**
 * 画像をダウンロード
 */
export async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error('画像のダウンロードに失敗しました');
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
