import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { protect } from '../middleware/auth';
import db from '../db/client';
import { Request } from 'express';

interface AuthRequest extends Request {
  user?: { id: number };
}

const router = Router();

// Set up storage engine
const storage = multer.diskStorage({
  destination: './public/uploads/',
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

// Initialize upload
const upload = multer({
  storage: storage,
  limits: { fileSize: 5000000 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    checkFileType(file, cb);
  }
}).array('images'); // 'images' is the field name

// Check file type
function checkFileType(file: Express.Multer.File, cb: multer.FileFilterCallback) {
  // Allowed extensions
  const filetypes = /jpeg|jpg|png|gif/;
  // Check extension
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime type
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Error: Images Only!'));
  }
}

router.post('/:productId', protect, (req: AuthRequest, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      return res.status(400).json({ message: 'Error: No Files Selected!' });
    }

    const productId = req.params.productId;
    const files = req.files as Express.Multer.File[];
    const imageUrls = files.map(file => `/uploads/${file.filename}`);

    try {
      const product = await db('products').where({ id: productId, user_id: req.user?.id }).first();
      if (!product) {
        return res.status(404).json({ message: 'Product not found or you are not authorized' });
      }

      const images = imageUrls.map(imageUrl => ({
        product_id: parseInt(productId),
        image_url: imageUrl,
      }));

      await db('product_images').insert(images);

      res.status(200).json({
        message: 'Files uploaded successfully!',
        filePaths: imageUrls
      });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });
});

export default router;