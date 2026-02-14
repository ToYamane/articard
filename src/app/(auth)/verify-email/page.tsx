'use client';

import { AuthGuard } from '@/components/auth';
import { VerifyEmailContent } from '@/components/auth';

export default function VerifyEmailPage() {
  return (
    <AuthGuard requireAuth={true} requireSetup={false}>
      <VerifyEmailContent />
    </AuthGuard>
  );
}
