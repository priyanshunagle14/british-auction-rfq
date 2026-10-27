async function request(path, options = {}) {
    const res = await fetch(`/api${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
        const errors = body.errors || ['Request failed'];
        const err = new Error(errors.join(', '));
        err.errors = errors;
        throw err;
    }
    return body;
}

export const api = {
    listRfqs: () => request('/rfqs'),
    getDetails: (id) => request(`/rfqs/${id}/details`),
    createRfq: (data) => request('/rfqs', { method: 'POST', body: JSON.stringify(data) }),
    placeBid: (id, data) =>
        request(`/rfqs/${id}/bids`, { method: 'POST', body: JSON.stringify(data) }),
    listSuppliers: () => request('/suppliers'),
};