export interface Category {
    id?: number;
    name: string;
    description?: string;
    type: 'INCOME' | 'EXPENSE';
    color?: string;
    icon?: string;
    active: boolean;
}
