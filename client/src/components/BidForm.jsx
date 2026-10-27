import { useState } from 'react';
import { api } from '../api.js';
import { fmtMoney, toIso } from '../utils/format.js';

const empty = { supplierId: '', carrierName: '', freight: '', originCharges: '', destinationCharges: '', transitDays: '', quoteValidity: '' };

export default function BidForm({ rfqId, suppliers, disabled, onPlaced }) {
    const [form, setForm] = useState(empty);
    const [errors, setErrors] = useState([]);
    const [result, setResult] = useState(null);
    const [saving, setSaving] = useState(false);

    const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
    const total = ['freight', 'originCharges', 'destinationCharges']
        .reduce((sum, k) => sum + (Number(form[k]) || 0), 0);

    async function onSubmit(e) {
        e.preventDefault();
        setErrors([]); setResult(null);
        if (Object.values(form).some((v) => v === '')) return setErrors(['All fields are required']);

        setSaving(true);
        try {
            const res = await api.placeBid(rfqId, {
                supplierId: form.supplierId,
                carrierName: form.carrierName,
                freight: Number(form.freight),
                originCharges: Number(form.originCharges),
                destinationCharges: Number(form.destinationCharges),
                transitDays: Number(form.transitDays),
                quoteValidity: toIso(`${form.quoteValidity}T23:59:59`),
            });
            setResult(res);
            onPlaced();
        } catch (err) {
            setErrors(err.errors || [err.message]);
        } finally {
            setSaving(false);
        }
    }

    const num = (label, key, props = {}) => (
        <div className="field">
            <label>{label}</label>
            <input type="number" min="0" step="0.01" value={form[key]} onChange={set(key)} {...props} />
        </div>
    );

    return (
        <form className="card" onSubmit={onSubmit}>
            <h2>Submit a quote</h2>
            {disabled && <p className="muted">Bidding is not open for this auction.</p>}
            {errors.length > 0 && <div className="errors"><ul>{errors.map((m) => <li key={m}>{m}</li>)}</ul></div>}
            {result && (
                <div className="success">
                    Bid placed. You are rank {result.yourRank}.
                    {result.extended && ` Auction extended to ${new Date(result.closeTime).toLocaleTimeString()}.`}
                </div>
            )}
            <div className="field">
                <label>Supplier</label>
                <select value={form.supplierId} onChange={set('supplierId')}>
                    <option value="">Select…</option>
                    {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
            </div>
            <div className="field" style={{ marginTop: 10 }}>
                <label>Carrier name</label>
                <input value={form.carrierName} onChange={set('carrierName')} />
            </div>
            <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
                {num('Freight charges', 'freight')}
                {num('Origin charges', 'originCharges')}
                {num('Destination charges', 'destinationCharges')}
                {num('Transit time (days)', 'transitDays', { step: 1, min: 1 })}
                <div className="field">
                    <label>Quote valid until</label>
                    <input type="date" value={form.quoteValidity} onChange={set('quoteValidity')} />
                </div>
            </div>
            <p><strong>Total: {fmtMoney(total)}</strong></p>
            <button className="btn" disabled={disabled || saving}>{saving ? 'Submitting…' : 'Place bid'}</button>
        </form>
    );
}