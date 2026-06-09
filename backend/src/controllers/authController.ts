// backend/src/controllers/authController.ts
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { validationResult } from 'express-validator';

const prisma = new PrismaClient();

// Genera JWT Token
const generateToken = (userId: string): string => {
  const expiresInSeconds = process.env.JWT_EXPIRE_SECONDS || 604800; // 7 giorni

  const options: jwt.SignOptions = {
    expiresIn: Number(expiresInSeconds)
  };

  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'secret',
    options
  );
};

// Registrazione
export const register = async (req: Request, res: Response) => {
  try {
    // Controlla errori di validazione
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, username, password } = req.body;

    // Controlla se l'utente esiste già
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'Email o username già in uso'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crea nuovo utente
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword
      },
      select: {
        id: true,
        email: true,
        username: true,
        credits: true,
        isAdmin: true
      }
    });

    // Genera token
    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      token,
      user
    });
  } catch (error) {
    console.error('Errore registrazione:', error);
    res.status(500).json({ error: 'Errore durante la registrazione' });
  }
};

// Login
export const login = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { emailOrUsername, password } = req.body;

    // Trova utente
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrUsername },
          { username: emailOrUsername }
        ]
      }
    });

    if (!user) {
      return res.status(401).json({
        error: 'Credenziali non valide'
      });
    }

    // Verifica password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Credenziali non valide'
      });
    }

    // Genera token
    const token = generateToken(user.id);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        credits: user.credits,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    console.error('Errore login:', error);
    res.status(500).json({ error: 'Errore durante il login' });
  }
};

// Get profilo utente corrente
export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId; // Aggiunto dal middleware auth

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        credits: true,
        isAdmin: true,
        createdAt: true,
        teams: {
          include: {
            league: true,
            riders: {
              include: {
                rider: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Errore recupero profilo:', error);
    res.status(500).json({ error: 'Errore nel recupero del profilo' });
  }
};

// Update profilo
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { username, email } = req.body;

    // Controlla duplicati
    if (username || email) {
      const existing = await prisma.user.findFirst({
        where: {
          AND: [
            { id: { not: userId } },
            {
              OR: [
                username ? { username } : {},
                email ? { email } : {}
              ]
            }
          ]
        }
      });

      if (existing) {
        return res.status(400).json({
          error: 'Username o email già in uso'
        });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(username && { username }),
        ...(email && { email })
      },
      select: {
        id: true,
        email: true,
        username: true,
        credits: true
      }
    });

    res.json({
      success: true,
      user: updatedUser
    });
  } catch (error) {
    console.error('Errore aggiornamento profilo:', error);
    res.status(500).json({ error: 'Errore durante l\'aggiornamento' });
  }
};

// Cambio password
export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    // Verifica password corrente
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Password corrente non valida' });
    }

    // Hash nuova password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    res.json({
      success: true,
      message: 'Password aggiornata con successo'
    });
  } catch (error) {
    console.error('Errore cambio password:', error);
    res.status(500).json({ error: 'Errore durante il cambio password' });
  }
};
