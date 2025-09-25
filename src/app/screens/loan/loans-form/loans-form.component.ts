import { CommonModule } from '@angular/common';
import { Component, inject, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DataTableModule } from '@bhplugin/ng-datatable';
import { NgLabelTemplateDirective, NgOptionTemplateDirective, NgSelectComponent } from '@ng-select/ng-select';
import { FlatpickrDirective } from 'angularx-flatpickr';
import { error } from 'console';
import { NgxCustomModalComponent } from 'ngx-custom-modal';
import { catchError, EMPTY } from 'rxjs';
import { Customer } from 'src/app/model/customer';
import { Installment } from 'src/app/model/installment';
import { Loan } from 'src/app/model/loan';
import { CustomerService } from 'src/app/service/customer.service';
import { InstallmentService } from 'src/app/service/installment.service';
import { LoanService } from 'src/app/service/loan.service';
import { ToastService } from 'src/app/service/toast.service';
import { getTodayDate } from 'src/app/utils/utils';

@Component({
    selector: 'app-loans-form',
    standalone: true,
    imports: [
        DataTableModule,
        CommonModule,
        FormsModule,
        NgxCustomModalComponent,
        ReactiveFormsModule,
        FlatpickrDirective,
        NgLabelTemplateDirective,
        NgOptionTemplateDirective,
        NgSelectComponent,
    ],
    templateUrl: './loans-form.component.html',
})
export class LoansFormComponent {
    @ViewChild('customerModal') customerModal!: NgxCustomModalComponent;
    private readonly customerService = inject(CustomerService);
    private readonly loanService = inject(LoanService);
    private readonly installmentService = inject(InstallmentService);
    private readonly toastService = inject(ToastService);
    private readonly fb = inject(FormBuilder);

    loanForm!: FormGroup;
    customerForm!: FormGroup;
    customers = signal<Customer[]>([]); // Llena esto con tus clientes
    installments = signal<Installment[]>([]);

    interestTypes = [
        { label: 'Simple', value: 'SIMPLE' },
        { label: 'Francés', value: 'FRENCH' },
    ];

    ngOnInit(): void {
        this.initializeForms();
        this.getCustomers();
    }

        initializeForms(): void {
        this.loanForm = this.fb.group({
            customer: [null, Validators.required],
            principal: [null, [Validators.required, Validators.min(1)]],
            monthlyInterestRate: [null, [Validators.required, Validators.min(0)]],
            termMonths: [null, [Validators.required, Validators.min(1)]],
            interestType: ['SIMPLE', Validators.required],
            isShortTerm: [false], // Por defecto falso (largo plazo)
            disbursementDate: [getTodayDate(), Validators.required],
            shortTermEndDate: [null], // Campo condicional
        });

        this.customerForm = this.fb.group({
            firstName: ['', Validators.required],
            lastName: ['', Validators.required],
            documentNumber: ['', Validators.required],
            email: ['', [Validators.email]],
            phone: [''],
        });
    }

    getCustomers() {
        this.customerService.getAll().subscribe((data) => {
            this.customers.set(data);
        });
    }

    simulateInstallments() {
        const form = this.loanForm.value;

        const loan: Loan = {
            customer: {
                id: form.customer,
            } as Customer,
            principal: form.principal,
            monthlyInterestRate: form.monthlyInterestRate,
            termMonths: form.termMonths,
            interestType: form.interestType,
            disbursementDate: form.disbursementDate,
        };
        this.installmentService.simulate(loan).subscribe((data) => {
            this.installments.set(data);
            console.log('Cuotas simuladas:', data);
        });
    }

    addMonths(date: Date, months: number): Date {
        const d = new Date(date);
        d.setMonth(d.getMonth() + months);
        return d;
    }

    onSubmit() {
        const form = this.loanForm.value;

        const loan: Loan = {
            customer: {
                id: form.customer,
            } as Customer,
            principal: form.principal,
            monthlyInterestRate: form.monthlyInterestRate,
            termMonths: form.termMonths,
            interestType: form.interestType,
            isShortTerm: form.isShortTerm,
            disbursementDate: form.disbursementDate,
            shortTermEndDate: form.shortTermEndDate,
        };

        this.loanService.save(loan)
        .pipe(catchError(error => {
           this.toastService.showMessage('Error al guardar el préstamo', 'error');
            return EMPTY;
        }))
        .subscribe((data) => {
            this.toastService.showMessage('Préstamo guardado con éxito', 'success');
            this.loanForm.reset();
            this.installments.set([]);
        });
    }

     openCustomerModal(): void {
        this.customerForm.reset();
        this.customerModal.open();
    }

    closeCustomerModal(): void {
        this.customerModal.close();
    }

    saveCustomer(): void {
        if (this.customerForm.valid) {
            const newCustomer: Customer = this.customerForm.value;

            this.customerService.save(newCustomer).subscribe({
                next: (savedCustomer: Customer) => {
                    this.toastService.showMessage('Cliente registrado con éxito', 'success');

                    // Actualizar la lista de clientes
                    const currentCustomers = this.customers();
                    this.customers.set([...currentCustomers, savedCustomer]);

                    // Seleccionar el cliente recién creado en el formulario
                    this.loanForm.patchValue({ customer: savedCustomer.id });

                    // Cerrar modal
                    this.closeCustomerModal();
                },
                error: (error) => {
                    this.toastService.showMessage('Error al registrar cliente', 'error');
                }
            });
        }
    }
}
