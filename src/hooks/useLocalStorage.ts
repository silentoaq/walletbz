// hooks/useLocalStorage.ts
import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  // 獲取初始值
  const readValue = (): T => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  };

  const [storedValue, setStoredValue] = useState<T>(readValue);

  // 更新 localStorage 的函數
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      localStorage.setItem(key, JSON.stringify(valueToStore));
      
      // 觸發自定義事件，讓其他組件知道 localStorage 已更新
      window.dispatchEvent(new Event('storage-changed'));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  // 監聽其他組件或頁面對 localStorage 的更改
  useEffect(() => {
    const handleStorageChange = () => {
      setStoredValue(readValue());
    };
    
    window.addEventListener('storage-changed', handleStorageChange);
    return () => {
      window.removeEventListener('storage-changed', handleStorageChange);
    };
  }, []);

  return [storedValue, setValue] as const;
}