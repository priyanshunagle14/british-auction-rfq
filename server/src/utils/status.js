export const STATUS = {
    UPCOMING: 'UPCOMING',
    ACTIVE: 'ACTIVE',
    CLOSED: 'CLOSED',
    FORCE_CLOSED: 'FORCE_CLOSED',
};

export function deriveStatus(now, rfq) {
    if (now < rfq.bidStartTime) return STATUS.UPCOMING;
    if (now < rfq.currentCloseTime) return STATUS.ACTIVE;
    // Closed. If the close time was pushed all the way to the forced limit, it's a forced close.
    return rfq.currentCloseTime.getTime() >= rfq.forcedCloseTime.getTime()
        ? STATUS.FORCE_CLOSED
        : STATUS.CLOSED;
}