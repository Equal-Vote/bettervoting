import { useState, useEffect } from "react";

export const useLocalStorage = <data>(key: string, defaultValue: data|null, updateRate: number|null = null): [data|null,(newValue:data|null)=>void] => {
    // This hook behaves similarly to useState however the state is also stored in local storage
    // If the value in local storage doesn't exist it is set to defaultValue
    // The optional input updateRate allows for periodic checking to see if the value in local storage has changed
    // to allow multiple components using the same key to be updated
    const getStoredValue = (key: string, defaultValue: data|null) => {
        // getting stored value
        const saved = localStorage.getItem(key);
        let initial: data|null;
        try {
            initial = JSON.parse(saved);
        } catch {
            initial = null;
        }
        if (!initial) {
            localStorage.setItem(key, JSON.stringify(defaultValue));
            return defaultValue
        }
        return initial;
    }
    const [value, setStoredValue] = useState<data|null>(() => {
        return getStoredValue(key, defaultValue);
    });

    const setValue = (newValue: data|null) => {
        localStorage.setItem(key, JSON.stringify(newValue));
        setStoredValue(newValue)
    }

    useEffect(() => {
        if (updateRate) {
            const interval = setInterval(() => {
                setStoredValue(getStoredValue(key, defaultValue))
            }, updateRate);
            return () => clearInterval(interval); //Cleanup function
        }
    }, [value])
    return [value, setValue];
};
