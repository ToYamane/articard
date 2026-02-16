import { Resend } from 'resend';
import { createLogger } from '@/lib/logger';

const log = createLogger({ path: 'email' });

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'Articard <noreply@articard.app>';

export async function sendVerificationCode(email: string, code: string): Promise<void> {
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: '【Articard】メール認証コード',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a1a1a; margin-bottom: 16px;">メール認証コード</h2>
        <p style="color: #4a4a4a; margin-bottom: 24px;">
          以下の認証コードを入力してメールアドレスの認証を完了してください。
        </p>
        <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a;">${code}</span>
        </div>
        <p style="color: #888; font-size: 14px;">
          このコードは10分間有効です。<br />
          心当たりがない場合は、このメールを無視してください。
        </p>
      </div>
    `,
  });

  if (error) {
    log.error('Failed to send verification email', { email, error });
    throw new Error('メールの送信に失敗しました');
  }
}

export async function sendPasswordResetCode(email: string, code: string): Promise<void> {
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: '【Articard】パスワードリセットコード',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a1a1a; margin-bottom: 16px;">パスワードリセットコード</h2>
        <p style="color: #4a4a4a; margin-bottom: 24px;">
          以下のコードを入力してパスワードをリセットしてください。
        </p>
        <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a;">${code}</span>
        </div>
        <p style="color: #888; font-size: 14px;">
          このコードは10分間有効です。<br />
          心当たりがない場合は、このメールを無視してください。
        </p>
      </div>
    `,
  });

  if (error) {
    log.error('Failed to send password reset email', { email, error });
    throw new Error('メールの送信に失敗しました');
  }
}
