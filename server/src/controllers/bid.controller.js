import mongoose from 'mongoose';
import { validateBidInput } from '../utils/validateBid.js';
import { placeBid } from '../services/bidService.js';

export async function placeBidHandler(req, res, next) {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ errors: ['Invalid RFQ id'] });
        }
        const { errors, data } = validateBidInput(req.body);
        if (errors.length) return res.status(400).json({ errors });

        const result = await placeBid(req.params.id, data);
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
}