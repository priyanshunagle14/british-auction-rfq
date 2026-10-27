export const fmtDateTime = (d) =>
    d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'medium' }) : '—';

export const fmtMoney = (n) =>
    n == null ? '—' : Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const toIso = (localValue) => new Date(localValue).toISOString();

export const TRIGGER_LABELS = {
    ANY_BID: 'Bid in the last X minutes',
    ANY_RANK_CHANGE: 'Any supplier rank change in the last X minutes',
    L1_CHANGE: 'Lowest bidder (L1) change in the last X minutes',
};

export const STATUS_LABELS = {
    UPCOMING: 'Upcoming',
    ACTIVE: 'Active',
    CLOSED: 'Closed',
    FORCE_CLOSED: 'Force Closed',
};

export function fmtDuration(ms) {
    if (ms <= 0) return '00:00:00';
    const s = Math.floor(ms / 1000);
    const p = (n) => String(n).padStart(2, '0');
    return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}