import { Loan } from "./loan";

export interface Customer {
  id?: number;
  firstName?: string;
  lastName?: string;
  documentNumber?: string;
  email?: string;
  phone?: string;
  state?: string; // Enum State como string
   // Relación con Loan
}
