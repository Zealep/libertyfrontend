import { Customer } from "./customer";
import { Installment } from "./installment";

export interface Loan {
  id?: number;
  customer: Customer;
  principal: string; // BigDecimal como string
  monthlyInterestRate: string; // BigDecimal como string
  termMonths: number;
  interestType: 'SIMPLE' | 'FRENCH';
  isShortTerm?: boolean; // Nuevo campo para indicar si es corto plazo
  status?: 'ACTIVE' | 'CANCELLED' | 'CLOSED'; // Ajusta según los valores de LoanStatus
  disbursementDate: string; // ISO date string
  shortTermEndDate?: string; // Fecha fin de pago para préstamos a corto plazo
  installments?: Installment[];
}
