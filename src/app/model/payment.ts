import { Installment } from "./installment";

export interface Payment {
  id: number;
  paymentDate: string; // LocalDate como string ISO
  amount: string; // BigDecimal como string
  type: 'NORMAL' | 'EARLY' | 'EXTRA' | 'LATE_FEE'; // Enum PaymentType
  installment: Installment;
}
