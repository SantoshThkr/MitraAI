import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

export const useLocalStorage = <T>(
  key: string,
  initialValue: T | (() => T),
): [T, Dispatch<SetStateAction<T>>] => {
  const [value, setValue] = useState<T>(() => {
    const fallbackValue =
      typeof initialValue === "function"
        ? (initialValue as () => T)()
        : initialValue;

    if (typeof window === "undefined") {
      return fallbackValue;
    }

    const storedValue = window.localStorage.getItem(key);
    if (!storedValue) {
      return fallbackValue;
    }

    try {
      return JSON.parse(storedValue) as T;
    } catch {
      return fallbackValue;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
};
