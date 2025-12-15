import { useState, useEffect } from 'react';

const STORAGE_KEY = 'matrix_oracle_usage';
const DAILY_LIMIT = 5;

interface UsageData {
    count: number;
    date: string; // YYYY-MM-DD
}

export const useTokenLimit = (isPro: boolean = false) => {
    const [remaining, setRemaining] = useState<number>(DAILY_LIMIT);
    const [isLimitReached, setIsLimitReached] = useState(false);

    // Get today's date string
    const getToday = () => new Date().toISOString().split('T')[0];

    useEffect(() => {
        if (isPro) {
            setRemaining(999);
            setIsLimitReached(false);
            return;
        }

        const loadUsage = () => {
            const stored = localStorage.getItem(STORAGE_KEY);
            const today = getToday();

            if (stored) {
                const data: UsageData = JSON.parse(stored);
                if (data.date === today) {
                    const left = Math.max(0, DAILY_LIMIT - data.count);
                    setRemaining(left);
                    setIsLimitReached(left <= 0);
                } else {
                    // New day, reset
                    resetUsage(today);
                }
            } else {
                // First time
                resetUsage(today);
            }
        };

        loadUsage();
    }, [isPro]);

    const resetUsage = (date: string) => {
        const newData: UsageData = { count: 0, date };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
        setRemaining(DAILY_LIMIT);
        setIsLimitReached(false);
    };

    const consumeToken = () => {
        if (isPro) return true;

        const stored = localStorage.getItem(STORAGE_KEY);
        const today = getToday();
        let count = 0;

        if (stored) {
            const data: UsageData = JSON.parse(stored);
            if (data.date === today) {
                count = data.count;
            }
        }

        if (count >= DAILY_LIMIT) {
            setIsLimitReached(true);
            return false;
        }

        const newData: UsageData = { count: count + 1, date: today };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
        
        const newRemaining = Math.max(0, DAILY_LIMIT - (count + 1));
        setRemaining(newRemaining);
        setIsLimitReached(newRemaining <= 0);
        
        return true;
    };

    return {
        remaining,
        isLimitReached,
        consumeToken,
        limit: DAILY_LIMIT
    };
};
