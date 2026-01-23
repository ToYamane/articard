// FLUX API モック

// 1x1 透明PNGのBase64（テスト用の最小画像）
export const MOCK_IMAGE_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// モックされたイラストBuffer
export const mockIllustrationBuffer = Buffer.from(MOCK_IMAGE_BASE64, 'base64');

// FLUX APIのモックレスポンス
export const mockFluxResponse = {
  id: 'mock-generation-id',
  status: 'Ready',
  result: {
    sample: MOCK_IMAGE_BASE64,
  },
};

// FLUX APIのモッククライアント
export const mockFluxClient = {
  generateImage: jest.fn().mockResolvedValue({
    imageBuffer: mockIllustrationBuffer,
    prompt: 'A mystical card illustration featuring the concept of AI and computing',
  }),
};

// 画像生成のモック関数
export function mockImageGeneration() {
  return {
    imageBuffer: mockIllustrationBuffer,
    prompt: 'A mystical card illustration',
  };
}

// エラーをシミュレートするモック
export function mockImageGenerationError(errorMessage: string = 'FLUX API error') {
  mockFluxClient.generateImage.mockRejectedValue(new Error(errorMessage));
}

// モックリセット
export function resetFluxMock() {
  mockFluxClient.generateImage.mockReset();
  mockFluxClient.generateImage.mockResolvedValue({
    imageBuffer: mockIllustrationBuffer,
    prompt: 'A mystical card illustration',
  });
}

// fetch APIのモック（FLUX API呼び出し用）
export function mockFetchForFlux() {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url.includes('bfl.ml') || url.includes('flux')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockFluxResponse),
      });
    }
    return Promise.reject(new Error('Unknown URL'));
  });
}

export function resetFetchMock() {
  if (global.fetch && typeof (global.fetch as jest.Mock).mockReset === 'function') {
    (global.fetch as jest.Mock).mockReset();
  }
}
