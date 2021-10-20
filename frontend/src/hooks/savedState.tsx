import { useState } from "react";

export const useSavedState = <T,>(initialState: T | (() => T), key: string): [T, React.Dispatch<React.SetStateAction<T>>] => {
    const [value, setValue] = useState<T>(() => {
        let value = localStorage.getItem(key);

        if (value !== null) {
            try {
                return JSON.parse(value);
            } catch (error) { }
        }

        if (initialState instanceof Function) {
            let value = initialState();
            localStorage.setItem(key, JSON.stringify(value));
            return value;
        }

        localStorage.setItem(key, JSON.stringify(initialState));
        return initialState;
    });

    const saved = (value: React.SetStateAction<T>) => {
        if (value instanceof Function) {
            setValue((oldValue: T) => {
                let newValue = value(oldValue);
                localStorage.setItem(key, JSON.stringify(newValue));
                return newValue;
            });
        } else {
            localStorage.setItem(key, JSON.stringify(value));
            setValue(value);
        }
    };

    return [value, saved];
};