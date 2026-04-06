import { useEffect, useRef, useState } from "react";
import useSnackbar from "~/components/SnackbarContext";

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
 *                hasn't been called again for this duration. Defaults to 500.
 * @returns A tuple of [currentValue, setter], analogous to the tuple returned by `useState`.
 */

export default <T>(defaultValue: T, updateFunc: (value: T) => Promise<boolean>, delay: number = 500) => {
    const { setSnack } = useSnackbar();
    const [localValue, setLocalValue] = useState(defaultValue);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const committedValue = useRef(defaultValue);

    useEffect(() => {
        committedValue.current = defaultValue;
        setLocalValue(defaultValue);
    }, [defaultValue]);

    return [
        localValue,
        (newValue: T) => {
            setLocalValue(newValue); // set the value optimistically

            if (debounceTimer.current) clearTimeout(debounceTimer.current);

            if(committedValue.current == newValue) return; // detect no-op

            debounceTimer.current = setTimeout(() => {
                updateFunc(newValue).then(success => {
                    if(success){
                        committedValue.current = newValue;
                    }else{
                        setLocalValue(committedValue.current); // reset to last confirmed value if the request failed
                        setSnack({ message: 'Election Update Failed', severity: 'error', open: true, autoHideDuration: 6000 });
                    }
                });
            }, delay);
        }
    ] as const
}