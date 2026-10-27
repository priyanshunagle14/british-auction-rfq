import { EXTENSION_TRIGGERS } from '../utils/constants.js';

const MINUTE = 60 * 1000;

export function rankBids(latestBids) {
    return [...latestBids]
        .sort(
            (a, b) =>
                a.totalPrice - b.totalPrice ||
                new Date(a.createdAt) - new Date(b.createdAt)
        )
        .map((bid, i) => ({
            supplierId: String(bid.supplierId),
            totalPrice: bid.totalPrice,
            rank: i + 1,
        }));
}


export function isBiddingOpen(now, rfq) {
    if (now < rfq.bidStartTime) return { open: false, reason: 'Auction has not started yet' };
    if (now >= rfq.currentCloseTime) return { open: false, reason: 'Auction is closed' };
    return { open: true };
}


export function isInTriggerWindow(now, closeTime, windowMinutes) {
    const windowStart = closeTime.getTime() - windowMinutes * MINUTE;
    return now.getTime() >= windowStart && now.getTime() < closeTime.getTime();
}


export function didRankChange(before, after) {
    if (before.length === 0) return after.length > 0;
    const afterRank = new Map(after.map((r) => [r.supplierId, r.rank]));
    return before.some((r) => afterRank.get(r.supplierId) !== r.rank);
}

export function didL1Change(before, after) {
    return (before[0]?.supplierId ?? null) !== (after[0]?.supplierId ?? null);
}


export function computeNewCloseTime(closeTime, extensionMinutes, forcedCloseTime) {
    const candidate = closeTime.getTime() + extensionMinutes * MINUTE;
    const capped = candidate > forcedCloseTime.getTime();
    return {
        newCloseTime: new Date(capped ? forcedCloseTime.getTime() : candidate),
        capped,
    };
}


export function evaluateExtension({ now, rfq, ranksBefore, ranksAfter }) {
    const { currentCloseTime, forcedCloseTime, triggerWindowMinutes: x,
        extensionMinutes: y, extensionTrigger } = rfq;

    if (!isInTriggerWindow(now, currentCloseTime, x)) {
        return { extend: false, capped: false, reason: null };
    }

    let triggered = false;
    let reason = '';
    switch (extensionTrigger) {
        case EXTENSION_TRIGGERS.ANY_BID:
            triggered = true;
            reason = `Bid received in last ${x} minutes`;
            break;
        case EXTENSION_TRIGGERS.ANY_RANK_CHANGE:
            triggered = didRankChange(ranksBefore, ranksAfter);
            reason = `Supplier rank changed in last ${x} minutes`;
            break;
        case EXTENSION_TRIGGERS.L1_CHANGE:
            triggered = didL1Change(ranksBefore, ranksAfter);
            reason = `Lowest bidder (L1) changed in last ${x} minutes`;
            break;
    }

    if (!triggered) return { extend: false, capped: false, reason: null };

    const { newCloseTime, capped } = computeNewCloseTime(currentCloseTime, y, forcedCloseTime);

    if (newCloseTime.getTime() === currentCloseTime.getTime()) {
        return {
            extend: false,
            capped: true,
            reason: `${reason}, but auction is already at its forced close time`,
        };
    }

    return { extend: true, newCloseTime, capped, reason };
}