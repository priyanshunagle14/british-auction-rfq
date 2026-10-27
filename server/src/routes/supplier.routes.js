import { Router } from 'express';
import Supplier from '../models/Supplier.js';

const router = Router();
router.get('/', async (req, res, next) => {
    try {
        res.json(await Supplier.find().sort({ name: 1 }));
    } catch (err) {
        next(err);
    }
});

export default router;