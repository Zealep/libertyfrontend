import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DataTableModule } from '@bhplugin/ng-datatable';
import { NgLabelTemplateDirective, NgOptionTemplateDirective, NgSelectComponent } from '@ng-select/ng-select';
import { FlatpickrDirective } from 'angularx-flatpickr';
import { NgxCustomModalComponent } from 'ngx-custom-modal';
import { Customer } from 'src/app/model/customer';
import { Installment } from 'src/app/model/installment';
import { Loan } from 'src/app/model/loan';
import { CustomerService } from 'src/app/service/customer.service';
import { InstallmentService } from 'src/app/service/installment.service';
import { LoanService } from 'src/app/service/loan.service';

@Component({
  selector: 'app-loans-form',
  standalone: true,
  imports: [DataTableModule, CommonModule, FormsModule, NgxCustomModalComponent, ReactiveFormsModule,FlatpickrDirective, NgLabelTemplateDirective, NgOptionTemplateDirective, NgSelectComponent],
  templateUrl: './loans-form.component.html',
})
export class LoansFormComponent {
  private readonly customerService = inject(CustomerService);
  private readonly loanService = inject(LoanService);
  private readonly installmentService = inject(InstallmentService);
  private readonly fb = inject(FormBuilder);

  loanForm!: FormGroup;
  customers = signal<Customer[]>([]); // Llena esto con tus clientes
  installments = signal<Installment[]>([]);

  interestTypes = [
    { label: 'Simple', value: 'SIMPLE' },
    { label: 'Francés', value: 'FRENCH' }
  ];

  ngOnInit(): void {
    this.loanForm = this.fb.group({
      customer: [null, Validators.required],
      principal: [null, [Validators.required, Validators.min(1)]],
      monthlyInterestRate: [null, [Validators.required, Validators.min(0)]],
      termMonths: [null, [Validators.required, Validators.min(1)]],
      interestType: ['FRENCH', Validators.required],
      disbursementDate: [null, Validators.required],
    });

    // Ejemplo: cargar clientes (reemplaza por tu servicio real)
    this.customers.set([
      { id: 1, firstName: 'Juan', lastName: 'Pérez', documentNumber: '12345678', email: 'juan.perez@example.com' } as Customer,
      { id: 2, firstName: 'María', lastName: 'Gómez', documentNumber: '87654321', email: 'maria.gomez@example.com' } as Customer
    ]);
  }

  simulateInstallments() {
    const form = this.loanForm.value;

  }



  addMonths(date: Date, months: number): Date {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
  }

  onSubmit() {
    if (this.loanForm.valid) {
      const loan: Loan = {
        ...this.loanForm.value,
        principal: this.loanForm.value.principal.toString(),
        monthlyInterestRate: this.loanForm.value.monthlyInterestRate.toString(),
        status: 'ACTIVE',
        installments: this.installments,
      };
      // Aquí puedes enviar el préstamo a tu backend o servicio
      console.log('Préstamo registrado:', loan);
    }
  }
}
