import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'ArtiCard - 学んで集める、AIカードコレクション';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

function toBase64DataUri(buffer: ArrayBuffer, mime: string): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

export default async function Image() {
  const [iconData, textData] = await Promise.all([
    fetch(new URL('/public/logo/icon.webp', import.meta.url)).then((r) => r.arrayBuffer()),
    fetch(new URL('/public/logo/text.webp', import.meta.url)).then((r) => r.arrayBuffer()),
  ]);

  const iconSrc = toBase64DataUri(iconData, 'image/webp');
  const textSrc = toBase64DataUri(textData, 'image/webp');

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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          marginBottom: '32px',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={iconSrc} alt="" width={120} height={120} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={textSrc} alt="" width={320} height={80} />
      </div>
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
