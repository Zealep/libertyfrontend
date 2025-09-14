import { Loan } from "./loan";
import { Payment } from "./payment";

export interface Installment {
  id: number;
  number: number;
  dueDate: string; // LocalDate como string ISO
  amount: string; // BigDecimal como string
  interest: string; // BigDecimal como string
  principalPart: string; // BigDecimal como string
  remainingBalance: string; // BigDecimal como string
  status: 'PENDING' | 'PAID' | 'LATE'; // Enum InstallmentStatus
  loan: Loan;
  payments: Payment[];
}
