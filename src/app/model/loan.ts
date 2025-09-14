import { Customer } from "./customer";
import { Installment } from "./installment";

export interface Loan {
  id: number;
  customer: Customer;
  principal: string; // BigDecimal como string
  monthlyInterestRate: string; // BigDecimal como string
  termMonths: number;
  interestType: 'SIMPLE' | 'FRENCH';
  status: 'ACTIVE' | 'INACTIVE' | 'CLOSED'; // Ajusta según los valores de LoanStatus
  disbursementDate: string; // ISO date string
  installments: Installment[];
}
