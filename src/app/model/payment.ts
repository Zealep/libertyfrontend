import { Installment } from "./installment";

export interface Payment {
  id?: number;
  paymentDate: string; // LocalDate como string ISO
  amount: string; // BigDecimal como string
  paymentMethod: string;
  referenceNumber: string;
  notes: string;
  installment: Installment;
}
