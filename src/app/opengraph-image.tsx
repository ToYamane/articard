import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const alt = 'ArtiCard - 学んで集める、AIカードコレクション';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const iconSrc = `data:image/png;base64,${readFileSync(join(process.cwd(), 'public/logo/icon.png')).toString('base64')}`;
  const textSrc = `data:image/png;base64,${readFileSync(join(process.cwd(), 'public/logo/text.png')).toString('base64')}`;

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
      {/* ロゴ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          marginBottom: '32px',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={iconSrc} width={120} height={120} alt="" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={textSrc} width={384} height={96} alt="" />
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
