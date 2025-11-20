import { Category } from "./category";

export interface Transaction {
    id?: number;
    amount: number;
    description: string;
    type: 'INCOME' | 'EXPENSE';
    category?: Category;
    transactionDate: string;
    paymentMethod?: string;
    reference?: string;
    notes?: string;
    isRecurring?: boolean;
    recurringFrequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
    attachmentUrl?: string;

}
