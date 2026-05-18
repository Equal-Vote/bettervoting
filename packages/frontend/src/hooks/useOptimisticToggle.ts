import { useEffect, useRef, useState } from "react";

/**
 * Optimistic toggle/select state synced with a backend resource.
 *
 * The setter (1) updates local state immediately so the MUI Switch/Radio
 * animates without waiting on the network, (2) fires `commit` right away —
 * no debounce — so the in-flight gate sees the write instantly, and
 * (3) reverts the local value if `commit` resolves false.
 *
 * Pairs with the ElectionContextProvider write gate: writes are serialized
 * upstream, so back-to-back setter calls don't race on update_date.
 */
export default <T>(defaultValue: T, commit: (value: T) => Promise<boolean>) => {
    const [localValue, setLocalValue] = useState(defaultValue);
    const committedValue = useRef(defaultValue);

    useEffect(() => {
        committedValue.current = defaultValue;
        setLocalValue(defaultValue);
    }, [defaultValue]);

    const setter = async (newValue: T) => {
        setLocalValue(newValue);
        if (newValue === committedValue.current) return;
        const success = await commit(newValue);
        if (success) {
            committedValue.current = newValue;
        } else {
            setLocalValue(committedValue.current);
        }
    };

    return [localValue, setter] as const;
};
