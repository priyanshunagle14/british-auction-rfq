import { useState, useEffect } from 'react';
import { fmtDuration } from '../utils/format.js';

export default function Countdown({ closeTime, skewMs = 0 }) {
    const [, tick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => tick((n) => n + 1), 1000);
        return () => clearInterval(id);
    }, []);

    const remaining = new Date(closeTime).getTime() - (Date.now() + skewMs);
    if (remaining <= 0) return <span className="muted">Ended</span>;
    return <span className={remaining < 10 * 60 * 1000 ? 'countdown urgent' : 'countdown'}>{fmtDuration(remaining)}</span>;
}