export interface ImportTransaction {
    id?: number;
    amount: number;
    description: string;
    type: 'INCOME' | 'EXPENSE';
    category?: any;
    transactionDate: string;
    paymentMethod?: string;
    reference?: string;
    notes?: string;

    // Campos para previsualización
    isValid?: boolean;
    validationErrors?: string[];
    suggestedCategory?: any;
    isEditing?: boolean;
    active?: boolean | true;
}

export interface ImportResult {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    transactions: ImportTransaction[];
}
