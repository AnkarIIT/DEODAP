import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../db';
import { AuthRequest, generateToken, requireAuth } from '../middleware/auth';
import { User } from '../types';

const router = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(80),
  email: z.string().trim().toLowerCase().email('Please enter a valid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.').max(128),
  phone: z.string().trim().regex(/^[0-9+\-\s]{10,15}$/, 'Please enter a valid phone number.').optional().or(z.literal('')),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

// Register new user
router.post('/register', async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid registration details.' });
    }

    const { name, email, password, phone } = parsed.data;
    const existing = await db.findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser: User = {
      id: `usr-${Date.now()}`,
      name,
      email,
      phone: phone || '',
      passwordHash,
      role: 'CUSTOMER',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.createUser(newUser);
    const token = generateToken(newUser);

    res.status(201).json({
      message: 'Account created successfully!',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Registration failed.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const { email, password } = parsed.data;
    const user = await db.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken(user);
    res.json({
      message: 'Welcome back!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Login failed.' });
  }
});

// Get current user profile
router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  const user = await db.findUserById(req.user!.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt,
    },
  });
});

export default router;
