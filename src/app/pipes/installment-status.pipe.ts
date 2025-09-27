import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'installmentStatus',
  standalone: true,
})
export class InstallmentStatusPipe implements PipeTransform {

  transform(value: any, args?: any): any {
    switch (value) {
      case 'PENDING':
        return 'Pendiente';
      case 'PAID':
        return 'Pagado';
      case 'LATE':
        return 'Atrasado';
      default:
        return value;
    }
  }

}
