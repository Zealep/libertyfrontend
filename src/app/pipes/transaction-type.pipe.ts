import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'transactionType',
    standalone: true
})
export class TransactionTypePipe implements PipeTransform {
    transform(value: string): string {
        switch (value) {
            case 'INCOME': return 'Ingreso';
            case 'EXPENSE': return 'Gasto';
            default: return value;
        }
    }
}
