import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api.js';
import { toIso, TRIGGER_LABELS } from '../utils/format.js';

const empty = {
    referenceId: '', name: '', bidStartTime: '', bidCloseTime: '', forcedCloseTime: '',
    pickupDate: '', triggerWindowMinutes: 10, extensionMinutes: 5, extensionTrigger: 'ANY_BID',
};

function validate(f) {
    const errors = [];
    for (const [k, v] of Object.entries(f)) if (v === '') errors.push(`${k} is required`);
    if (errors.length) return errors;
    const start = new Date(f.bidStartTime), close = new Date(f.bidCloseTime), forced = new Date(f.forcedCloseTime);
    if (close <= start) errors.push('Bid close time must be after bid start time');
    if (forced <= close) errors.push('Forced close time must be later than bid close time');
    if (Number(f.triggerWindowMinutes) < 1) errors.push('Trigger window (X) must be at least 1 minute');
    if (Number(f.extensionMinutes) < 1) errors.push('Extension (Y) must be at least 1 minute');
    return errors;
}

export default function CreateRfq() {
    const navigate = useNavigate();
    const [form, setForm] = useState(empty);
    const [errors, setErrors] = useState([]);
    const [saving, setSaving] = useState(false);

    const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

    async function onSubmit(e) {
        e.preventDefault();
        const clientErrors = validate(form);
        if (clientErrors.length) return setErrors(clientErrors);

        setSaving(true);
        try {
            const rfq = await api.createRfq({
                ...form,
                bidStartTime: toIso(form.bidStartTime),
                bidCloseTime: toIso(form.bidCloseTime),
                forcedCloseTime: toIso(form.forcedCloseTime),
                pickupDate: toIso(form.pickupDate),
                triggerWindowMinutes: Number(form.triggerWindowMinutes),
                extensionMinutes: Number(form.extensionMinutes),
            });
            navigate(`/rfqs/${rfq._id}`);
        } catch (err) {
            setErrors(err.errors || [err.message]);
            setSaving(false);
        }
    }

    const field = (label, key, type = 'text', extra = {}) => (
        <div className="field">
            <label>{label}</label>
            <input type={type} value={form[key]} onChange={set(key)} {...extra} />
        </div>
    );

    return (
        <>
            <Link to="/" className="back">← Back to auctions</Link>
            <form className="card" onSubmit={onSubmit}>
                <h1>Create RFQ</h1>
                <p className="muted">Times are in your local timezone.</p>
                {errors.length > 0 && (
                    <div className="errors"><ul>{errors.map((m) => <li key={m}>{m}</li>)}</ul></div>
                )}
                <div className="grid">
                    {field('RFQ name', 'name')}
                    {field('Reference ID', 'referenceId')}
                    {field('Bid start time', 'bidStartTime', 'datetime-local')}
                    {field('Bid close time', 'bidCloseTime', 'datetime-local')}
                    {field('Forced close time', 'forcedCloseTime', 'datetime-local')}
                    {field('Pickup / service date', 'pickupDate', 'datetime-local')}
                </div>

                <h2 style={{ marginTop: 20 }}>British auction settings</h2>
                <div className="grid">
                    {field('Trigger window X (minutes)', 'triggerWindowMinutes', 'number', { min: 1 })}
                    {field('Extension Y (minutes)', 'extensionMinutes', 'number', { min: 1 })}
                    <div className="field">
                        <label>Extension trigger</label>
                        <select value={form.extensionTrigger} onChange={set('extensionTrigger')}>
                            {Object.entries(TRIGGER_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                    </div>
                </div>

                <p style={{ marginTop: 20 }}>
                    <button className="btn" disabled={saving}>{saving ? 'Creating…' : 'Create RFQ'}</button>
                </p>
            </form>
        </>
    );
}