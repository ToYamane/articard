/**
 * Google Gemini (Nano Banana) 画像生成クライアント
 * Gemini 2.5 Flash Image を使用
 */

const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Gemini APIキーを取得
 */
function getApiKey(): string {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_GEMINI_API_KEY is not configured');
  }
  return apiKey;
}

export interface GeminiImageGenerationParams {
  prompt: string;
  aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
}

interface GeminiImageResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        inlineData?: {
          mimeType: string;
          data: string; // base64 encoded
        };
      }>;
    };
  }>;
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

/**
 * Nano Banana (Gemini 2.5 Flash Image) で画像を生成
 * rare カード用の高速・中品質モデル
 */
export async function generateWithNanoBanana(
  params: GeminiImageGenerationParams
): Promise<Buffer> {
  const apiKey = getApiKey();

  console.log('Nano Banana (Gemini) generation starting...', {
    prompt: params.prompt.substring(0, 100),
    aspectRatio: params.aspectRatio || '3:4',
  });

  // Gemini 2.0 Flash Image Generation (gemini-2.0-flash-exp with image generation)
  const response = await fetch(
    `${GEMINI_API_BASE_URL}/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Generate an image: ${params.prompt}`,
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ['IMAGE', 'TEXT'],
          responseMimeType: 'image/png',
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error:', {
      status: response.status,
      statusText: response.statusText,
      body: errorText,
    });
    throw new Error(`Gemini APIエラー (HTTP ${response.status}): ${errorText}`);
  }

  const data: GeminiImageResponse = await response.json();

  if (data.error) {
    console.error('Gemini API error response:', data.error);
    throw new Error(`Gemini APIエラー: ${data.error.message}`);
  }

  // 画像データを抽出
  const candidates = data.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error('Gemini APIから画像が生成されませんでした');
  }

  const parts = candidates[0]?.content?.parts;
  if (!parts) {
    throw new Error('Gemini APIレスポンスにpartsがありません');
  }

  // inlineDataを持つpartを探す
  const imagePart = parts.find((part) => part.inlineData);
  if (!imagePart?.inlineData) {
    throw new Error('Gemini APIレスポンスに画像データがありません');
  }

  console.log('Nano Banana generation complete, mimeType:', imagePart.inlineData.mimeType);

  // Base64からBufferに変換
  const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64');

  return imageBuffer;
}

/**
 * Gemini Imagen 3 (高品質版) で画像を生成
 * 将来的な高品質オプション用
 */
export async function generateWithGeminiImagen3(
  params: GeminiImageGenerationParams
): Promise<Buffer> {
  const apiKey = getApiKey();

  console.log('Gemini Imagen 3 generation starting...', {
    prompt: params.prompt.substring(0, 100),
  });

  // Imagen 3 API (imagen-3.0-generate-002)
  const response = await fetch(
    `${GEMINI_API_BASE_URL}/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instances: [
          {
            prompt: params.prompt,
          },
        ],
        parameters: {
          sampleCount: 1,
          aspectRatio: params.aspectRatio || '3:4',
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini Imagen 3 API error:', {
      status: response.status,
      statusText: response.statusText,
      body: errorText,
    });
    throw new Error(`Gemini Imagen 3 APIエラー (HTTP ${response.status}): ${errorText}`);
  }

  const data = await response.json();

  // Imagen 3のレスポンス形式に対応
  const predictions = data.predictions;
  if (!predictions || predictions.length === 0) {
    throw new Error('Gemini Imagen 3から画像が生成されませんでした');
  }

  const bytesBase64Encoded = predictions[0]?.bytesBase64Encoded;
  if (!bytesBase64Encoded) {
    throw new Error('Gemini Imagen 3レスポンスに画像データがありません');
  }

  console.log('Gemini Imagen 3 generation complete');

  // Base64からBufferに変換
  const imageBuffer = Buffer.from(bytesBase64Encoded, 'base64');

  return imageBuffer;
}
