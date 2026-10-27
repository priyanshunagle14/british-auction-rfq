import { Router } from 'express';
import { createRfq, getRfq, listRfqs, getRfqDetails } from '../controllers/rfq.controller.js';
import { placeBidHandler } from '../controllers/bid.controller.js';

const router = Router();
router.get('/', listRfqs);
router.post('/', createRfq);
router.get('/:id/details', getRfqDetails);
router.get('/:id', getRfq);
router.post('/:id/bids', placeBidHandler);

export default router;