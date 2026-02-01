import { Router } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/auth.service';
import { logger } from '../utils/logger';

const router = Router();
const authService = new AuthService();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  tenantSlug: z.string().min(1),
});

router.post('/login', async (req, res) => {
  try {
    const input = loginSchema.parse(req.body);

    const result = await authService.login(input);

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }

    if (error instanceof Error) {
      logger.warn({ error: error.message }, 'Login failed');
      res.status(401).json({
        error: 'Authentication failed',
        message: error.message,
      });
      return;
    }

    logger.error({ error }, 'Login error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', async (req, res) => {
  // Implement token blacklist logic if needed
  res.json({ message: 'Logged out successfully' });
});

export default router;
