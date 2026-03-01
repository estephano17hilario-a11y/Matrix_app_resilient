
export interface SpecialEvent {
    id: string;
    title: string;
    date: string; // ISO Date String (YYYY-MM-DD)
    type: 'BIRTHDAY' | 'ANNIVERSARY' | 'OTHER';
    notes?: string;
    notifyTime?: string; // "09:00"
    showInCalendar?: boolean;
    recurrence?: 'NONE' | 'ANNUAL' | 'MONTHLY';
}
