// src/components/usePinned.js
import { useState, useEffect } from 'react';

export function usePinned(key = 'pinnedUsers') {
    const [pinned, setPinned] = useState([]);
    useEffect(() => {
        const raw = localStorage.getItem(key);
        if (raw) setPinned(JSON.parse(raw));
    }, [key]);
    useEffect(() => {
        localStorage.setItem(key, JSON.stringify(pinned));
    }, [key, pinned]);
    const toggle = id => {
        setPinned(ps =>
            ps.includes(id) ? ps.filter(x => x !== id) : [...ps, id]
        );
    };
    return [pinned, toggle];
}
