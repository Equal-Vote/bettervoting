import { useState, useEffect } from "react";

export function setCookie(name: string ,value: string, hours: number | null =null) {
    let expires = "";
    if (hours) {
        const date = new Date();
        date.setTime(date.getTime() + (hours*60*60*1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}

function getCookie(name: string) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i=0;i < ca.length;i++) {
        let c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0){
        return c.substring(nameEQ.length,c.length);
        }
    }
    return null;
}

// function cookieExists(name: string){
//     return getCookie(name) != null;
// }

function deleteCookie(name: string) {
    document.cookie = name +'=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}

export const useCookie = (key: string, defaultValue: string, expiration: number|null = null, updateRate: number | null = null): [string, (newValue: string) => void] => {
    // This hook behaves similarly to useState however the state is also stored in a cookie
    // If the cookie doesn't exist it is set to defaultValue
    // The optional input updateRate allows for periodic checking to see if the value cookie has been updated or expired
   
    const getStoredValue = (key: string, defaultValue: string) => {
        // getting stored value
        const saved = getCookie(key);
        if (!saved && defaultValue!==null) { 
            // If cookie doesn't exist and default value is set, 
            setCookie(key, defaultValue, expiration);
            return defaultValue
        }
        return saved;
    } 
    
    const [value, setStoredValue] = useState(() => {
        return getStoredValue(key, defaultValue);
    });

    const setValue = (newValue: string) => {
        if (newValue === null) {
            deleteCookie(key)
            setStoredValue(newValue)
            return
        }
        setCookie(key, newValue, expiration);
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