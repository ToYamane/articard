'use client';

import { AuthGuard, NicknameSetupForm } from '@/components/auth';

export default function SetupPage() {
  return (
    <AuthGuard requireAuth={true} requireSetup={false}>
      <NicknameSetupForm />
    </AuthGuard>
  );
}
