import crypto from 'node:crypto';
import mongoose from 'mongoose';
import Rfq from '../models/Rfq.js';
import Bid from '../models/Bid.js';
import Supplier from '../models/Supplier.js';
import ActivityLog from '../models/ActivityLog.js';
import { HttpError } from '../utils/HttpError.js';
import { LOG_TYPES } from '../utils/constants.js';
import { rankBids, isBiddingOpen, evaluateExtension } from './auctionEngine.js';

const LEASE_MS = 5000;
const MAX_LOCK_ATTEMPTS = 20;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Each supplier's most recent bid on this RFQ
export async function getLatestBids(rfqId) {
    return Bid.aggregate([
        { $match: { rfqId: new mongoose.Types.ObjectId(rfqId) } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$supplierId', doc: { $first: '$$ROOT' } } },
        { $replaceRoot: { newRoot: '$doc' } },
    ]);
}

// Atomically take the lock if it is free or expired. Returns the RFQ, or null if busy.
async function acquireLock(rfqId, token) {
    for (let i = 0; i < MAX_LOCK_ATTEMPTS; i++) {
        const now = new Date();
        const rfq = await Rfq.findOneAndUpdate(
            { _id: rfqId, $or: [{ lockExpiresAt: null }, { lockExpiresAt: { $lt: now } }] },
            { $set: { lockToken: token, lockExpiresAt: new Date(now.getTime() + LEASE_MS) } },
            { new: true }
        );
        if (rfq) return rfq;
        await sleep(25 + Math.random() * 50); // small random wait, then retry
    }
    return null;
}

export async function placeBid(rfqId, input) {
    const supplier = await Supplier.findById(input.supplierId);
    if (!supplier) throw new HttpError(404, 'Supplier not found');
    if (!(await Rfq.exists({ _id: rfqId }))) throw new HttpError(404, 'RFQ not found');

    const token = crypto.randomUUID();
    const rfq = await acquireLock(rfqId, token);
    if (!rfq) throw new HttpError(503, 'Auction is busy, please retry');

    try {
        // Take "now" only AFTER we hold the lock, so every decision uses the true time
        const now = new Date();

        const open = isBiddingOpen(now, rfq);
        if (!open.open) throw new HttpError(409, open.reason);

        const totalPrice = input.freight + input.originCharges + input.destinationCharges;

        const latest = await getLatestBids(rfqId);
        const previous = latest.find((b) => String(b.supplierId) === String(input.supplierId));
        if (previous && totalPrice >= previous.totalPrice) {
            throw new HttpError(
                400,
                `New bid must be lower than your previous bid of ${previous.totalPrice}`
            );
        }

        const ranksBefore = rankBids(latest);
        const others = latest.filter((b) => String(b.supplierId) !== String(input.supplierId));
        const ranksAfter = rankBids([
            ...others,
            { supplierId: input.supplierId, totalPrice, createdAt: now },
        ]);

        const decision = evaluateExtension({ now, rfq, ranksBefore, ranksAfter });

        const bid = await Bid.create({ ...input, rfqId, totalPrice, createdAt: now });

        const logs = [
            { rfqId, type: LOG_TYPES.BID, message: `${supplier.name} bid ${totalPrice.toFixed(2)}` },
        ];

        if (decision.extend) {
            await Rfq.updateOne(
                { _id: rfqId },
                { $set: { currentCloseTime: decision.newCloseTime } }
            );
            logs.push({
                rfqId,
                type: LOG_TYPES.EXTENSION,
                message: decision.reason,
                oldCloseTime: rfq.currentCloseTime,
                newCloseTime: decision.newCloseTime,
            });
        }
        if (decision.capped) {
            logs.push({
                rfqId,
                type: LOG_TYPES.FORCE_CLOSE_CAP,
                message: 'Extension limited by the forced close time',
                oldCloseTime: rfq.currentCloseTime,
                newCloseTime: decision.extend ? decision.newCloseTime : rfq.currentCloseTime,
            });
        }
        await ActivityLog.insertMany(logs);

        return {
            bid,
            extended: decision.extend,
            closeTime: decision.extend ? decision.newCloseTime : rfq.currentCloseTime,
            yourRank: ranksAfter.find((r) => r.supplierId === String(input.supplierId)).rank,
            ranks: ranksAfter,
        };
    } finally {
        // Release only if we still own the lock (token must match)
        await Rfq.updateOne(
            { _id: rfqId, lockToken: token },
            { $set: { lockToken: null, lockExpiresAt: null } }
        );
    }
}