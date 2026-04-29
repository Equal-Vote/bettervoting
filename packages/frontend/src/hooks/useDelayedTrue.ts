import { useEffect, useState } from 'react';

/**
 * Mirrors `value` with a delay applied only to the false → true edge. Going true → false is
 * immediate. Useful for showing a "loading" decoration only when an operation actually takes
 * long enough to perceive, avoiding a flash on fast round-trips.
 */
export function useDelayedTrue(value: boolean, delayMs: number): boolean {
    const [delayed, setDelayed] = useState(false);
    useEffect(() => {
        if (!value) { setDelayed(false); return; }
        const id = setTimeout(() => setDelayed(true), delayMs);
        return () => clearTimeout(id);
    }, [value, delayMs]);
    return delayed;
}

export default useDelayedTrue;
