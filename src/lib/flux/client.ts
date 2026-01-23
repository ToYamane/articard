const BFL_API_BASE_URL = 'https://api.bfl.ml/v1';

interface FluxGenerationParams {
  prompt: string;
  width?: number;
  height?: number;
  steps?: number;
  guidance?: number;
}

interface FluxGenerationResponse {
  id: string;
}

interface FluxResultResponse {
  status: 'Ready' | 'Pending' | 'Error' | 'Request Moderated' | 'Content Moderated' | 'Task not found';
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

/**
 * FLUX APIで画像生成リクエストを送信
 */
export async function requestImageGeneration(
  params: FluxGenerationParams
): Promise<string> {
  const apiKey = getApiKey();

  const response = await fetch(`${BFL_API_BASE_URL}/flux-pro-1.1`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Key': apiKey,
    },
    body: JSON.stringify({
      prompt: params.prompt,
      width: params.width || 512,
      height: params.height || 768,
      steps: params.steps || 30,
      guidance: params.guidance || 7.5,
      safety_tolerance: 2, // Moderate safety settings
      output_format: 'jpeg',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('FLUX API request error:', error);
    throw new Error('イラストの生成リクエストに失敗しました');
  }

  const data: FluxGenerationResponse = await response.json();
  return data.id;
}

/**
 * 生成結果を取得（ポーリング）
 */
export async function getGenerationResult(taskId: string): Promise<string> {
  const apiKey = getApiKey();

  const maxAttempts = 60; // 最大60回（約60秒）
  const pollInterval = 1000; // 1秒間隔

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`${BFL_API_BASE_URL}/get_result?id=${taskId}`, {
      headers: {
        'X-Key': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error('結果の取得に失敗しました');
    }

    const data: FluxResultResponse = await response.json();

    switch (data.status) {
      case 'Ready':
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
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('画像のダウンロードに失敗しました');
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
