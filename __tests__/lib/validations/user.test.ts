import {
  nicknameSchema,
  registerUserSchema,
  updateUserSchema,
  emailSchema,
  passwordSchema,
  loginSchema,
  signUpSchema,
} from '@/lib/validations/user';

describe('nicknameSchema', () => {
  describe('正常系', () => {
    it('2文字のニックネームを許可する', () => {
      const result = nicknameSchema.safeParse('AB');
      expect(result.success).toBe(true);
    });

    it('20文字のニックネームを許可する', () => {
      const nickname = 'あ'.repeat(20);
      const result = nicknameSchema.safeParse(nickname);
      expect(result.success).toBe(true);
    });

    it('英数字を許可する', () => {
      const result = nicknameSchema.safeParse('User123');
      expect(result.success).toBe(true);
    });

    it('ひらがなを許可する', () => {
      const result = nicknameSchema.safeParse('ゆーざー');
      expect(result.success).toBe(true);
    });

    it('カタカナを許可する', () => {
      const result = nicknameSchema.safeParse('ユーザー');
      expect(result.success).toBe(true);
    });

    it('漢字を許可する', () => {
      const result = nicknameSchema.safeParse('太郎');
      expect(result.success).toBe(true);
    });

    it('混合文字を許可する', () => {
      const result = nicknameSchema.safeParse('山田Taro123');
      expect(result.success).toBe(true);
    });
  });

  describe('異常系', () => {
    it('1文字のニックネームを拒否する', () => {
      const result = nicknameSchema.safeParse('A');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('2文字以上');
      }
    });

    it('21文字以上のニックネームを拒否する', () => {
      const nickname = 'あ'.repeat(21);
      const result = nicknameSchema.safeParse(nickname);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('20文字以内');
      }
    });

    it('スペースを含むニックネームを拒否する', () => {
      const result = nicknameSchema.safeParse('user name');
      expect(result.success).toBe(false);
    });

    it('記号を含むニックネームを拒否する', () => {
      const result = nicknameSchema.safeParse('user@name');
      expect(result.success).toBe(false);
    });

    it('絵文字を含むニックネームを拒否する', () => {
      const result = nicknameSchema.safeParse('user🎉');
      expect(result.success).toBe(false);
    });

    it('空文字を拒否する', () => {
      const result = nicknameSchema.safeParse('');
      expect(result.success).toBe(false);
    });
  });
});

describe('registerUserSchema', () => {
  it('有効なニックネームで登録できる', () => {
    const result = registerUserSchema.safeParse({ nickname: 'テストユーザー' });
    expect(result.success).toBe(true);
  });

  it('nicknameが必須', () => {
    const result = registerUserSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('updateUserSchema', () => {
  it('nicknameの更新を許可する', () => {
    const result = updateUserSchema.safeParse({ nickname: '新しい名前' });
    expect(result.success).toBe(true);
  });

  it('空のオブジェクトを許可する（更新なし）', () => {
    const result = updateUserSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('emailSchema', () => {
  describe('正常系', () => {
    it('有効なメールアドレスを許可する', () => {
      const result = emailSchema.safeParse('test@example.com');
      expect(result.success).toBe(true);
    });

    it('サブドメインを含むメールを許可する', () => {
      const result = emailSchema.safeParse('test@mail.example.com');
      expect(result.success).toBe(true);
    });
  });

  describe('異常系', () => {
    it('@なしのメールを拒否する', () => {
      const result = emailSchema.safeParse('testexample.com');
      expect(result.success).toBe(false);
    });

    it('ドメインなしのメールを拒否する', () => {
      const result = emailSchema.safeParse('test@');
      expect(result.success).toBe(false);
    });

    it('空文字を拒否する', () => {
      const result = emailSchema.safeParse('');
      expect(result.success).toBe(false);
    });
  });
});

describe('passwordSchema', () => {
  describe('正常系', () => {
    it('8文字のパスワードを許可する', () => {
      const result = passwordSchema.safeParse('12345678');
      expect(result.success).toBe(true);
    });

    it('100文字のパスワードを許可する', () => {
      const password = 'a'.repeat(100);
      const result = passwordSchema.safeParse(password);
      expect(result.success).toBe(true);
    });

    it('記号を含むパスワードを許可する', () => {
      const result = passwordSchema.safeParse('Pass@123!');
      expect(result.success).toBe(true);
    });
  });

  describe('異常系', () => {
    it('7文字のパスワードを拒否する', () => {
      const result = passwordSchema.safeParse('1234567');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('8文字以上');
      }
    });

    it('101文字以上のパスワードを拒否する', () => {
      const password = 'a'.repeat(101);
      const result = passwordSchema.safeParse(password);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('100文字以内');
      }
    });
  });
});

describe('loginSchema', () => {
  it('有効なログイン情報を許可する', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(result.success).toBe(true);
  });

  it('emailが必須', () => {
    const result = loginSchema.safeParse({ password: 'password123' });
    expect(result.success).toBe(false);
  });

  it('passwordが必須', () => {
    const result = loginSchema.safeParse({ email: 'test@example.com' });
    expect(result.success).toBe(false);
  });
});

describe('signUpSchema', () => {
  it('有効なサインアップ情報を許可する', () => {
    const result = signUpSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });
    expect(result.success).toBe(true);
  });

  it('パスワード不一致を拒否する', () => {
    const result = signUpSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password456',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('パスワードが一致しません');
    }
  });

  it('confirmPasswordが必須', () => {
    const result = signUpSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });
});
