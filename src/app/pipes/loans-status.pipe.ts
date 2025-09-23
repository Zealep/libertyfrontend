import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'loansStatus',
  standalone: true,
})
export class LoansStatusPipe implements PipeTransform {

  transform(value: any, args?: any): any {
    switch (value) {
      case 'ACTIVE':
        return 'Activo';
      case 'CLOSED':
        return 'Cerrado';
      case 'CANCELLED':
        return 'Cancelado';
      case 'DEFAULTED':
        return 'En Mora';
      case 'REFINANCED':
        return 'Refinanciado';
      default:
        return value;
    }
  }

}
