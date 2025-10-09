import { CommonModule } from '@angular/common';
import { Component, inject, signal, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DataTableModule } from '@bhplugin/ng-datatable';
import { NgxCustomModalComponent } from 'ngx-custom-modal';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Loan } from 'src/app/model/loan';
import { Installment } from 'src/app/model/installment';
import { Payment } from 'src/app/model/payment';
import { LoanService } from 'src/app/service/loan.service';
import { InstallmentService } from 'src/app/service/installment.service';
import { PaymentService } from 'src/app/service/payment.service';
import { InstallmentStatusPipe } from 'src/app/pipes/installment-status.pipe';
import { ToastService } from 'src/app/service/toast.service';
import { PaymentsMethodPipe } from 'src/app/pipes/payments-method.pipe';
import { LoansStatusPipe } from 'src/app/pipes/loans-status.pipe';

@Component({
  selector: 'app-loan-details',
  standalone: true,
  imports: [CommonModule, DataTableModule, NgxCustomModalComponent, ReactiveFormsModule,InstallmentStatusPipe,PaymentsMethodPipe,LoansStatusPipe],
  templateUrl: './loan-details.component.html'
})
export class LoanDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private loanService = inject(LoanService);
  private installmentService = inject(InstallmentService);
  private paymentService = inject(PaymentService);
  private fb = inject(FormBuilder);
  private toastService = inject(ToastService);

  @ViewChild('paymentModal') paymentModal!: NgxCustomModalComponent;


  loanId = signal<number>(0);
  loan = signal<Loan | null>(null);
  installments = signal<Installment[]>([]);
  payments = signal<Payment[]>([]);
  loading = signal(false);
  processing = false;

  paymentForm!: FormGroup;
  selectedInstallment: Installment | null = null;

  installmentCols = [
    { field: 'installmentNumber', title: 'N° Cuota' },
    { field: 'dueDate', title: 'Fecha Vencimiento' },
    { field: 'amount', title: 'Monto' },
    { field: 'status', title: 'Estado' },
    { field: 'actions', title: 'Acciones' }
  ];

  paymentCols = [
    { field: 'paymentDate', title: 'Fecha Pago' },
    { field: 'amount', title: 'Monto' },
    { field: 'installmentNumber', title: 'N° Cuota' },
    { field: 'paymentMethod', title: 'Método' }
  ];

  ngOnInit() {
    this.loanId.set(+this.route.snapshot.params['id']);
    this.initPaymentForm();
    this.loadLoanDetails();
  }

    initPaymentForm() {
    this.paymentForm = this.fb.group({
      installmentId: ['', Validators.required],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      paymentMethod: ['', Validators.required],
      paymentDate: [new Date().toISOString().split('T')[0], Validators.required],
      referenceNumber: [''],
      notes: ['']
    });
  }

  loadLoanDetails() {
    this.loading.set(true);
    const id = this.loanId();

    // Cargar información del préstamo
    this.loanService.getById(id).subscribe(loan => {
      this.loan.set(loan);
    });

    // Cargar pagos
    this.paymentService.getByLoanId(id).subscribe(payments => {
      this.payments.set(payments);
      this.loading.set(false);
    });
  }

  payInstallment(installment: Installment) {
    this.selectedInstallment = installment;
    this.paymentForm.patchValue({
      installmentId: installment.id,
      amount: installment.amount,
      paymentDate: new Date().toISOString().split('T')[0]
    });
    this.paymentModal.open();
  }

 processPayment() {
    if (this.paymentForm.invalid) {
      this.toastService.showMessage('Por favor complete todos los campos requeridos', 'error');
      return;
    }

    this.processing = true;

    const payment: Payment = {
      amount: this.paymentForm.value.amount,
      paymentDate: this.paymentForm.value.paymentDate,
      installment: { id: this.paymentForm.value.installmentId } as Installment,
      paymentMethod: this.paymentForm.value.paymentMethod,
      referenceNumber: this.paymentForm.value.referenceNumber,
      notes: this.paymentForm.value.notes
    };

    this.paymentService.save(payment).subscribe({
      next: (response) => {
        this.processing = false;
        this.toastService.showMessage('Pago procesado exitosamente', 'success');
        this.paymentModal.close();
        this.loadLoanDetails(); // Recargar datos
        this.paymentForm.reset();
        this.selectedInstallment = null;
      },
      error: (error) => {
        this.processing = false;
        this.toastService.showMessage('Error al procesar el pago', 'error');
        console.error(error);
      }
    });
  }

  goBack() {
    this.router.navigate(['/loans']);
  }
}
