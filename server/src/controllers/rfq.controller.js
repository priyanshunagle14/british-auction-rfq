import mongoose from 'mongoose';
import Rfq from '../models/Rfq.js';
import { validateRfqInput } from '../utils/validateRfq.js';
import Bid from '../models/Bid.js';
import Supplier from '../models/Supplier.js';
import ActivityLog from '../models/ActivityLog.js';
import { deriveStatus } from '../utils/status.js';
import { getLatestBids } from '../services/bidService.js';
import { rankBids } from '../services/auctionEngine.js';

export async function createRfq(req, res, next) {
    try {
        const { errors, data } = validateRfqInput(req.body);
        if (errors.length) return res.status(400).json({ errors });

        const rfq = await Rfq.create({
            ...data,
            currentCloseTime: data.bidCloseTime,
        });
        res.status(201).json(rfq);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ errors: ['referenceId already exists'] });
        }
        next(err);
    }
}

export async function getRfq(req, res, next) {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ errors: ['Invalid RFQ id'] });
        }
        const rfq = await Rfq.findById(req.params.id).select(HIDE_LOCK);
        if (!rfq) return res.status(404).json({ errors: ['RFQ not found'] });
        res.json(rfq);
    } catch (err) {
        next(err);
    }
}
const HIDE_LOCK = '-lockToken -lockExpiresAt -__v';

export async function listRfqs(req, res, next) {
    try {
        const now = new Date();
        const rfqs = await Rfq.find().select(HIDE_LOCK).sort({ createdAt: -1 }).lean();

        // One query for all RFQs, instead of one query per RFQ (avoids the N+1 problem)
        const stats = await Bid.aggregate([
            { $group: { _id: '$rfqId', lowestBid: { $min: '$totalPrice' }, bidCount: { $sum: 1 } } },
        ]);
        const statsById = new Map(stats.map((s) => [String(s._id), s]));

        res.json({
            serverTime: now,
            rfqs: rfqs.map((r) => {
                const s = statsById.get(String(r._id));
                return {
                    ...r,
                    status: deriveStatus(now, r),
                    lowestBid: s?.lowestBid ?? null,
                    bidCount: s?.bidCount ?? 0,
                };
            }),
        });
    } catch (err) {
        next(err);
    }
}

export async function getRfqDetails(req, res, next) {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ errors: ['Invalid RFQ id'] });
        }
        const now = new Date();
        const rfq = await Rfq.findById(req.params.id).select(HIDE_LOCK).lean();
        if (!rfq) return res.status(404).json({ errors: ['RFQ not found'] });

        const [latest, allBids, logs] = await Promise.all([
            getLatestBids(rfq._id),
            Bid.find({ rfqId: rfq._id }).sort({ createdAt: -1 }).lean(),
            ActivityLog.find({ rfqId: rfq._id }).sort({ createdAt: -1 }).lean(),
        ]);

        const suppliers = await Supplier.find({
            _id: { $in: allBids.map((b) => b.supplierId) },
        }).lean();
        const nameOf = new Map(suppliers.map((s) => [String(s._id), s.name]));

        // Current ranking: latest bid per supplier, lowest total first
        const rankOf = new Map(rankBids(latest).map((r) => [r.supplierId, r.rank]));
        const ranking = latest
            .map((b) => ({
                rank: rankOf.get(String(b.supplierId)),
                supplierId: b.supplierId,
                supplierName: nameOf.get(String(b.supplierId)),
                carrierName: b.carrierName,
                freight: b.freight,
                originCharges: b.originCharges,
                destinationCharges: b.destinationCharges,
                totalPrice: b.totalPrice,
                transitDays: b.transitDays,
                quoteValidity: b.quoteValidity,
                placedAt: b.createdAt,
            }))
            .sort((a, b) => a.rank - b.rank);

        res.json({
            serverTime: now,
            rfq: { ...rfq, status: deriveStatus(now, rfq) },
            ranking,
            history: allBids.map((b) => ({ ...b, supplierName: nameOf.get(String(b.supplierId)) })),
            activityLog: logs,
        });
    } catch (err) {
        next(err);
    }
}