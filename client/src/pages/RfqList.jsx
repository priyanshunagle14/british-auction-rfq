import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { usePolling } from '../hooks/usePolling.js';
import StatusBadge from '../components/StatusBadge.jsx';
import Countdown from '../components/Countdown.jsx';
import { fmtDateTime, fmtMoney } from '../utils/format.js';

export default function RfqList() {
    const navigate = useNavigate();
    const fetcher = useCallback(() => api.listRfqs(), []);
    const { data, error } = usePolling(fetcher, 5000);

    const skew = useMemo(
        () => (data ? new Date(data.serverTime).getTime() - Date.now() : 0),
        [data?.serverTime]
    );

    if (error && !data) return <div className="errors">{error}</div>;
    if (!data) return <p className="muted">Loading…</p>;

    return (
        <div className="card">
            <h1>Auctions</h1>
            <p className="muted">Refreshes every 5 seconds</p>
            {data.rfqs.length === 0 ? (
                <p>No RFQs yet. Create one to get started.</p>
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th>RFQ</th><th>Status</th><th>Lowest bid</th><th>Bids</th>
                            <th>Current close</th><th>Forced close</th><th>Time left</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.rfqs.map((r) => (
                            <tr key={r._id} className="link" onClick={() => navigate(`/rfqs/${r._id}`)}>
                                <td>{r.name}<div className="muted">{r.referenceId}</div></td>
                                <td><StatusBadge status={r.status} /></td>
                                <td>{fmtMoney(r.lowestBid)}</td>
                                <td>{r.bidCount}</td>
                                <td>{fmtDateTime(r.currentCloseTime)}</td>
                                <td>{fmtDateTime(r.forcedCloseTime)}</td>
                                <td>{r.status === 'ACTIVE' ? <Countdown closeTime={r.currentCloseTime} skewMs={skew} /> : '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}