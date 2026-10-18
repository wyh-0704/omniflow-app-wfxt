import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import type { AuthUser, LoginResponse } from '../../shared/types/api';

const router = Router();

// Credentials are read from the environment. The defaults only exist so the
// app is usable out of the box — set AUTH_USERNAME / AUTH_PASSWORD / JWT_SECRET
// before deploying.
const AUTH_USERNAME = process.env.AUTH_USERNAME || 'admin';
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || 'admin123';
const JWT_SECRET = process.env.JWT_SECRET || 'omniflow-dev-secret-change-me';
const JWT_EXPIRES_SECONDS = Number(process.env.JWT_EXPIRES_SECONDS || 60 * 60 * 24 * 7);
const BCRYPT_ROUNDS = 10;

interface StoredUser {
  username: string;
  passwordHash: string;
}

// In-memory user store, seeded with the environment account. Registered users
// live for the lifetime of the process.
const users = new Map<string, StoredUser>();

const seedUser = (username: string, password: string): StoredUser => {
  const user: StoredUser = {
    username,
    passwordHash: bcrypt.hashSync(password, BCRYPT_ROUNDS),
  };
  users.set(username.toLowerCase(), user);
  return user;
};

seedUser(AUTH_USERNAME, AUTH_PASSWORD);

const usernameSchema = z
  .string()
  .trim()
  .min(3, '用户名至少 3 个字符')
  .max(32, '用户名最多 32 个字符')
  .regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线');

const passwordSchema = z
  .string()
  .min(6, '密码至少 6 位')
  .max(128, '密码最多 128 位');

const loginSchema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(128),
});

const registerSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
});

const issueToken = (username: string) =>
  jwt.sign({ sub: username }, JWT_SECRET, { expiresIn: JWT_EXPIRES_SECONDS });

router.post('/login', (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: '请输入用户名和密码' });
    return;
  }

  const { username, password } = parsed.data;
  const stored = users.get(username.toLowerCase());
  if (!stored || !bcrypt.compareSync(password, stored.passwordHash)) {
    res.status(401).json({ success: false, message: '用户名或密码错误' });
    return;
  }

  const user: AuthUser = { username: stored.username };
  const data: LoginResponse = { token: issueToken(stored.username), user };
  res.json({ success: true, data });
});

router.post('/register', (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message || '注册信息不合法',
    });
    return;
  }

  const { username, password, confirmPassword } = parsed.data;
  if (password !== confirmPassword) {
    res.status(400).json({ success: false, message: '两次输入的密码不一致' });
    return;
  }
  if (users.has(username.toLowerCase())) {
    res.status(409).json({ success: false, message: '该用户名已被注册' });
    return;
  }

  const stored = seedUser(username, password);
  const user: AuthUser = { username: stored.username };
  const data: LoginResponse = { token: issueToken(stored.username), user };
  res.status(201).json({ success: true, data });
});

router.get('/me', (req: Request, res: Response) => {
  const header = req.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    res.status(401).json({ success: false, message: '未登录' });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    const user: AuthUser = { username: String(payload.sub || '') };
    res.json({ success: true, data: user });
  } catch {
    res.status(401).json({ success: false, message: '登录已过期，请重新登录' });
  }
});

export default router;
