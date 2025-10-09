import { Router } from 'express';
import db from '../db/client';
import { protect } from '../middleware/auth';
import { Request } from 'express';

interface AuthRequest extends Request {
  user?: { id: number };
}

const router = Router();

// Get user role
router.get('/', protect, async (req: AuthRequest, res) => {
  const userId = req.user?.id;

  try {
    const userRole = await db('user_roles').where({ user_id: userId }).first();
    if (userRole) {
      res.json(userRole);
    } else {
      res.status(404).json({ message: 'Role not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Set user role
router.post('/', protect, async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  const { role } = req.body;

  if (!role) {
    return res.status(400).json({ message: 'Role is required' });
  }

  try {
    const existingRole = await db('user_roles').where({ user_id: userId }).first();
    if (existingRole) {
      return res.status(409).json({ message: 'User already has a role' });
    }

    const [newUserRole] = await db('user_roles').insert({ user_id: userId, role }).returning('*');
    res.status(201).json(newUserRole);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;