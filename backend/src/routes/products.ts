import { Router } from 'express';
import db from '../db/client';
import { protect } from '../middleware/auth';
import { Request } from 'express';

interface AuthRequest extends Request {
  user?: { id: number };
}

const router = Router();

// Get all products
router.get('/', async (req, res) => {
  try {
    const { category, location, condition, minPrice, maxPrice, search } = req.query;

    const query = db('products')
      .join('user_roles', 'products.user_id', 'user_roles.user_id')
      .where('user_roles.role', 'seller')
      .andWhere('products.status', 'active')
      .select('products.*');

    if (category && category !== 'All') {
      query.where('products.category', category as string);
    }

    if (location && location !== 'All') {
      query.where('products.location', location as string);
    }

    if (condition && condition !== 'All') {
      query.where('products.condition', condition as string);
    }

    if (minPrice) {
      query.where('products.price', '>=', parseFloat(minPrice as string));
    }

    if (maxPrice) {
      query.where('products.price', '<=', parseFloat(maxPrice as string));
    }

    if (search) {
      query.where((builder) => {
        builder.where('products.name', 'like', `%${search}%`)
               .orWhere('products.description', 'like', `%${search}%`);
      });
    }

    const products = await query;

    for (const product of products) {
      const images = await db('product_images').where({ product_id: product.id }).select('image_url');
      product.images = images.map(img => img.image_url);
    }

    res.json(products);
  } catch (error) {
    console.error("Failed to fetch products:", error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all products for the logged-in user
router.get('/my-products', protect, async (req: AuthRequest, res) => {
  const userId = req.user?.id;

  try {
    const products = await db('products').where({ user_id: userId }).select('*');

    for (const product of products) {
      const images = await db('product_images').where({ product_id: product.id }).select('image_url');
      product.images = images.map(img => img.image_url);
    }

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get a single product
router.get('/:id', async (req, res) => {
  try {
    const product = await db('products').where({ id: req.params.id }).first();
    if (product) {
      const images = await db('product_images').where({ product_id: product.id }).select('image_url');
      product.images = images.map(img => img.image_url);
      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create a new product
router.post('/', protect, async (req: AuthRequest, res) => {
  const { name, description, price, condition, category, location, contact_phone, contact_email } = req.body;
  const userId = req.user?.id;

  if (!name || !price) {
    return res.status(400).json({ message: 'Name and price are required' });
  }

  try {
    const [newProduct] = await db('products').insert({
      name,
      description,
      price,
      condition,
      category,
      location,
      contact_phone,
      contact_email,
      user_id: userId,
    }).returning('*');
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update a product
router.put('/:id', protect, async (req: AuthRequest, res) => {
  const { name, description, price, condition, category, location, contact_phone, contact_email } = req.body;
  const userId = req.user?.id;

  try {
    const product = await db('products').where({ id: req.params.id }).first();
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.user_id !== userId) {
      return res.status(403).json({ message: 'You are not authorized to update this product' });
    }

    const [updatedProduct] = await db('products').where({ id: req.params.id }).update({
      name,
      description,
      price,
      condition,
      category,
      location,
      contact_phone,
      contact_email,
    }).returning('*');
    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete a product
router.delete('/:id', protect, async (req: AuthRequest, res) => {
  const userId = req.user?.id;

  try {
    const product = await db('products').where({ id: req.params.id }).first();
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.user_id !== userId) {
      return res.status(403).json({ message: 'You are not authorized to delete this product' });
    }

    await db('products').where({ id: req.params.id }).del();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;