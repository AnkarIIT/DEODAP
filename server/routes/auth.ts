import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { AuthRequest, generateToken, requireAuth } from '../middleware/auth';
import { User } from '../types';

const router = Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const existing = db.findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 8);
    const newUser: User = {
      id: `usr-${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone || '',
      passwordHash,
      role: 'CUSTOMER',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.createUser(newUser);
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
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = db.findUserByEmail(email);
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

// Demo 1-Click Login (Admin / Customer switcher for instant evaluation)
router.post('/demo-login', async (req, res) => {
  try {
    const { role } = req.body; // 'ADMIN' or 'CUSTOMER'
    const targetEmail = role === 'ADMIN' ? 'admin@bharatcart.in' : 'customer@bharatcart.in';
    const user = db.findUserByEmail(targetEmail);
    if (!user) {
      return res.status(404).json({ error: 'Demo user not found. Please reseed database.' });
    }

    const token = generateToken(user);
    res.json({
      message: `Logged in as Demo ${user.role}!`,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Demo login failed.' });
  }
});

// Get current user profile
router.get('/me', requireAuth, (req: AuthRequest, res) => {
  const user = db.findUserById(req.user!.id);
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
