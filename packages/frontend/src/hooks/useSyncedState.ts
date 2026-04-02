import { useEffect, useRef, useState } from "react";

/**
 * A hook that maintains a local state value kept in sync with a backend resource via optimistic updates.
 *
 * When the setter is called, the local value is updated immediately (optimistically) to keep the UI
 * responsive. The provided `updateFunc` is then called to persist the change to the backend. If the
 * backend call returns `false` (indicating failure), the local value is rolled back to what it was
 * before the update was attempted.
 *
 * @param defaultValue - The initial value for the state.
 * @param updateFunc - An async function that sends the new value to the backend and resolves to
 *                     `true` on success or `false` on failure.
 * @param delay - Debounce delay in milliseconds. The backend call is deferred until the setter
 *                hasn't been called again for this duration. Defaults to 0 (no debounce).
 * @returns A tuple of [currentValue, setter], analogous to the tuple returned by `useState`.
 */

export default <T>(defaultValue: T, updateFunc: (value: T) => Promise<boolean>, delay: number = 0) => {
    const [localValue, setLocalValue] = useState(defaultValue);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setLocalValue(defaultValue);
    }, [defaultValue]);

    return [
        localValue,
        (newValue: T) => {
            let prevValue = localValue;
            setLocalValue(newValue); // set the value optimistically

            if (debounceTimer.current) clearTimeout(debounceTimer.current);
            debounceTimer.current = setTimeout(() => {
                updateFunc(newValue).then(success => {
                    if(!success) setLocalValue(prevValue) // reset value if the request failed
                });
            }, delay);
        }
    ] as const
}