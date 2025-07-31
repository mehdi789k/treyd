
import { useState, useEffect, useCallback } from 'react';

export const timezones: { id: string; name: string }[] = [
  { id: 'UTC', name: 'هماهنگ جهانی (UTC)' },
  { id: 'Asia/Tehran', name: 'ایران (تهران)' },
  { id: 'Europe/London', name: 'لندن' },
  { id: 'Europe/Berlin', name: 'اروپای مرکزی (برلین)' },
  { id: 'America/New_York', name: 'زمان شرقی (نیویورک)' },
  { id: 'America/Chicago', name: 'زمان مرکزی (شیکاگو)' },
  { id: 'America/Denver', name: 'زمان کوهستانی (دنور)' },
  { id: 'America/Los_Angeles', name: 'زمان اقیانوس آرام (لس آنجلس)' },
  { id: 'Asia/Tokyo', name: 'ژاپن (توکیو)' },
  { id: 'Australia/Sydney', name: 'استرالیا (سیدنی)' },
  { id: 'Asia/Dubai', name: 'دبی' },
];

const TIMEZONE_STORAGE_KEY = 'financialAnalystTimezone';

export const useTimezone = (): [string, (tz: string) => void] => {
    const [timezone, setTimezoneInternal] = useState<string>(() => {
        try {
            const storedTz = window.localStorage.getItem(TIMEZONE_STORAGE_KEY);
            // Try to use stored, then browser's, then fallback to UTC
            return storedTz || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        } catch {
            return 'UTC';
        }
    });

    useEffect(() => {
        try {
            window.localStorage.setItem(TIMEZONE_STORAGE_KEY, timezone);
        } catch (error) {
            console.error("Could not save timezone to localStorage", error);
        }
    }, [timezone]);

    const setTimezone = useCallback((tz: string) => {
        // Ensure the timezone is valid before setting
        if (timezones.some(t => t.id === tz)) {
            setTimezoneInternal(tz);
        }
    }, []);

    return [timezone, setTimezone];
};


export const formatTimestamp = (
    timestamp: number,
    timeZone: string,
    options?: Intl.DateTimeFormatOptions
): string => {
    const defaultOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone,
    };
    try {
        return new Intl.DateTimeFormat('fa-IR', { ...defaultOptions, ...options }).format(new Date(timestamp));
    } catch (e) {
        console.error("Error formatting date for timezone:", timeZone, e);
        // Fallback to UTC if timezone is invalid
        return new Intl.DateTimeFormat('fa-IR', { ...defaultOptions, timeZone: 'UTC' }).format(new Date(timestamp));
    }
};

export const formatDateForChart = (
    dateString: string,
    timeZone: string
): string => {
     try {
        const date = new Date(dateString);
        // Format to a short, readable date for chart axes
        return new Intl.DateTimeFormat('fa-IR-u-nu-latn', { 
            month: 'short', 
            day: 'numeric',
            timeZone
        }).format(date);
    } catch (e) {
        console.warn("Could not format date string for chart:", dateString, e);
        return dateString.split('T')[0]; // Fallback to simple date part
    }
}
