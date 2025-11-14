import { useState, useEffect } from "react";

export const useSessionStorage = (key, defaultValue, updateRate = null) => {
    // This hook behaves similarly to useState however the state is also stored in session storage
    // If the value in local storage doesn't exist it is set to defaultValue
    // The optional input updateRate allows for periodic checking to see if the value in session storage has changed
    // to allow multiple components using the same key to be updated
    const getStoredValue = (key, defaultValue) => {
        const initial = sessionStorage.getItem(key);
        if(initial) return initial;
        sessionStorage.setItem(key, initial);
        return defaultValue;
    }
    
    const [value, setStoredValue] = useState(() => {
        return getStoredValue(key, defaultValue);
    });
    

    const setValue = (newValue) => {
        sessionStorage.setItem(key, newValue);
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