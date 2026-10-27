import { useState, useEffect, useCallback } from 'react';

export function usePolling(fetcher, intervalMs) {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        try {
            setData(await fetcher());
            setError(null);
        } catch (e) {
            setError(e.message);
        }
    }, [fetcher]);

    useEffect(() => {
        load();
        const id = setInterval(load, intervalMs);
        return () => clearInterval(id);
    }, [load, intervalMs]);

    return { data, error, reload: load };
}