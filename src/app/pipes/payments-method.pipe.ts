import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'paymentsMethod',
  standalone: true,
})
export class PaymentsMethodPipe implements PipeTransform {

  transform(value: any, args?: any): any {
    switch (value) {
      case 'CASH':
        return 'Efectivo';
      case 'BANK_TRANSFER':
        return 'Transferencia Bancaria';
      case 'CREDIT_CARD':
        return 'Tarjeta de Crédito';
      case 'DEBIT_CARD':
        return 'Tarjeta de Débito';
      case 'CHECK':
        return 'Cheque';
      case 'DIGITAL_WALLET':
        return 'Billetera Digital';
      default:
        return value;
    }
  }

}
