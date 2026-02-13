import { ImageResponse } from 'next/og';

export const alt = 'ArtiCard - 学んで集める、AIカードコレクション';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #2563eb 100%)',
      }}
    >
      {/* ロゴテキスト */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: '80px',
            fontWeight: 800,
            color: 'white',
            letterSpacing: '-0.02em',
          }}
        >
          ArtiCard
        </div>
      </div>
      {/* サブタイトル */}
      <div
        style={{
          display: 'flex',
          fontSize: '32px',
          color: 'rgba(255, 255, 255, 0.9)',
          fontWeight: 400,
          letterSpacing: '0.05em',
        }}
      >
        学んで集める、AIカードコレクション
      </div>
    </div>,
    { ...size }
  );
}
