
const [rfqId] = process.argv.slice(2);
const BASE = 'http://localhost:5000/api';
const json = (r) => r.json();

const suppliers = await fetch(`${BASE}/suppliers`).then(json);
const before = await fetch(`${BASE}/rfqs/${rfqId}`).then(json);

const statuses = await Promise.all(
    suppliers.map((s, i) =>
        fetch(`${BASE}/rfqs/${rfqId}/bids`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                supplierId: s._id,
                carrierName: s.name,
                freight: 1000 - i * 10,
                originCharges: 100,
                destinationCharges: 100,
                transitDays: 20,
                quoteValidity: new Date(Date.now() + 7 * 864e5).toISOString(),
            }),
        }).then((r) => r.status)
    )
);

const after = await fetch(`${BASE}/rfqs/${rfqId}`).then(json);
console.log('statuses:', statuses);
console.log('close before:', before.currentCloseTime);
console.log('close after: ', after.currentCloseTime);
console.log(
    'extended by (min):',
    (new Date(after.currentCloseTime) - new Date(before.currentCloseTime)) / 60000
);