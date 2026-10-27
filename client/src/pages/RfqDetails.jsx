import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api.js';
import { usePolling } from '../hooks/usePolling.js';
import StatusBadge from '../components/StatusBadge.jsx';
import Countdown from '../components/Countdown.jsx';
import BidForm from '../components/BidForm.jsx';
import { fmtDateTime, fmtMoney, TRIGGER_LABELS } from '../utils/format.js';

export default function RfqDetails() {
    const { id } = useParams();
    const fetcher = useCallback(() => api.getDetails(id), [id]);
    const { data, error, reload } = usePolling(fetcher, 3000);
    const [suppliers, setSuppliers] = useState([]);

    useEffect(() => { api.listSuppliers().then(setSuppliers).catch(() => { }); }, []);

    const skew = useMemo(
        () => (data ? new Date(data.serverTime).getTime() - Date.now() : 0),
        [data?.serverTime]
    );

    if (error && !data) return <div className="errors">{error}</div>;
    if (!data) return <p className="muted">Loading…</p>;

    const { rfq, ranking, activityLog } = data;
    const active = rfq.status === 'ACTIVE';

    return (
        <>
            <Link to="/" className="back">← Back to auctions</Link>
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                        <h1>{rfq.name}</h1>
                        <span className="muted">{rfq.referenceId}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <StatusBadge status={rfq.status} />
                        <div style={{ marginTop: 6, fontSize: 20 }}>
                            {active ? <Countdown closeTime={rfq.currentCloseTime} skewMs={skew} /> : null}
                        </div>
                    </div>
                </div>
            </div>

            <div className="two-col">
                <div>
                    <div className="card">
                        <h2>Current ranking</h2>
                        {ranking.length === 0 ? <p className="muted">No bids yet.</p> : (
                            <table>
                                <thead>
                                    <tr><th>Rank</th><th>Supplier</th><th>Carrier</th><th>Freight</th><th>Origin</th><th>Dest.</th><th>Total</th><th>Transit</th><th>Valid until</th></tr>
                                </thead>
                                <tbody>
                                    {ranking.map((b) => (
                                        <tr key={b.supplierId} className={b.rank === 1 ? 'rank1' : ''}>
                                            <td>L{b.rank}</td>
                                            <td>{b.supplierName}</td>
                                            <td>{b.carrierName}</td>
                                            <td>{fmtMoney(b.freight)}</td>
                                            <td>{fmtMoney(b.originCharges)}</td>
                                            <td>{fmtMoney(b.destinationCharges)}</td>
                                            <td>{fmtMoney(b.totalPrice)}</td>
                                            <td>{b.transitDays}d</td>
                                            <td>{new Date(b.quoteValidity).toLocaleDateString('en-IN')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <div className="card">
                        <h2>All bids, lowest first</h2>
                        <table>
                            <thead><tr><th>Supplier</th><th>Total</th><th>Placed at</th></tr></thead>
                            <tbody>
                                {[...data.history].sort((a, b) => a.totalPrice - b.totalPrice).map((b) => (
                                    <tr key={b._id}>
                                        <td>{b.supplierName}</td>
                                        <td>{fmtMoney(b.totalPrice)}</td>
                                        <td>{fmtDateTime(b.createdAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="card">
                        <h2>Activity log</h2>
                        {activityLog.length === 0 ? <p className="muted">Nothing yet.</p> : (
                            <ul className="log">
                                {activityLog.map((l) => (
                                    <li key={l._id}>
                                        <span className={`tag tag-${l.type.toLowerCase()}`}>{l.type.replaceAll('_', ' ')}</span>
                                        {l.message}
                                        {l.newCloseTime && (
                                            <div className="muted">
                                                {fmtDateTime(l.oldCloseTime)} → {fmtDateTime(l.newCloseTime)}
                                            </div>
                                        )}
                                        <div className="muted">{fmtDateTime(l.createdAt)}</div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                <div>
                    <BidForm rfqId={id} suppliers={suppliers} disabled={!active} onPlaced={reload} />
                    <div className="card">
                        <h2>Auction settings</h2>
                        <table>
                            <tbody>
                                <tr><td>Trigger window (X)</td><td>{rfq.triggerWindowMinutes} min</td></tr>
                                <tr><td>Extension (Y)</td><td>{rfq.extensionMinutes} min</td></tr>
                                <tr><td>Trigger</td><td>{TRIGGER_LABELS[rfq.extensionTrigger]}</td></tr>
                                <tr><td>Bid start</td><td>{fmtDateTime(rfq.bidStartTime)}</td></tr>
                                <tr><td>Original close</td><td>{fmtDateTime(rfq.bidCloseTime)}</td></tr>
                                <tr><td>Current close</td><td>{fmtDateTime(rfq.currentCloseTime)}</td></tr>
                                <tr><td>Forced close</td><td>{fmtDateTime(rfq.forcedCloseTime)}</td></tr>
                                <tr><td>Pickup date</td><td>{fmtDateTime(rfq.pickupDate)}</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}