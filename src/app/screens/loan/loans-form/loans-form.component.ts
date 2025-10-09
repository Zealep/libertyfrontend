import { CommonModule } from '@angular/common';
import { Component, inject, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { DataTableModule } from '@bhplugin/ng-datatable';
import { NgLabelTemplateDirective, NgOptionTemplateDirective, NgSelectComponent } from '@ng-select/ng-select';
import { FlatpickrDirective } from 'angularx-flatpickr';
import { error } from 'console';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
    private readonly router = inject(Router);

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

        // Método para calcular el total de cuotas
    getTotalAmount(): number {
        const installments = this.installments();
        return installments.reduce((total, installment) => total + (Number(installment.amount) || 0), 0);
    }

    // Método para calcular el total de intereses
    getTotalInterest(): number {
        const installments = this.installments();
        return installments.reduce((total, installment) => total + (Number(installment.interest) || 0), 0);
    }

    // Método para calcular el total del capital pagado
    getTotalCapital(): number {
        const installments = this.installments();
        return installments.reduce((total, installment) => total + (Number(installment.principalPart) || 0), 0);
    }

    exportToPDF(): void {
        const form = this.loanForm.value;
        const installments = this.installments();

        if (!installments || installments.length === 0) {
            this.toastService.showMessage('No hay cuotas para exportar', 'warning');
            return;
        }

        // Crear nuevo documento PDF
        const pdf = new jsPDF();

        // Configuración del documento
        const pageWidth = pdf.internal.pageSize.width;
        const pageHeight = pdf.internal.pageSize.height;
        let yPosition = 20;

        // Título principal
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text('TABLA DE AMORTIZACIÓN - PRÉSTAMO', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 15;

        // Línea separadora
        pdf.setLineWidth(0.5);
        pdf.line(20, yPosition, pageWidth - 20, yPosition);
        yPosition += 15;

        // Datos del préstamo (cabecera)
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('INFORMACIÓN DEL PRÉSTAMO', 20, yPosition);
        yPosition += 10;

        // Obtener información del cliente
        const selectedCustomer = this.customers().find(c => c.id === form.customer);
        const customerName = selectedCustomer ?
            `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : 'No seleccionado';

        // Datos en dos columnas
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);

        const leftColumn = 20;
        const rightColumn = pageWidth / 2 + 10;

        // Columna izquierda
        pdf.text(`Cliente: ${customerName}`, leftColumn, yPosition);
        pdf.text(`Monto: S/. ${parseFloat(form.principal || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}`, leftColumn, yPosition + 6);
        pdf.text(`Tasa mensual: ${form.monthlyInterestRate}%`, leftColumn, yPosition + 12);
        pdf.text(`Tipo de interés: ${form.interestType}`, leftColumn, yPosition + 18);

        // Columna derecha
        pdf.text(`Plazo: ${form.termMonths} meses`, rightColumn, yPosition);
        pdf.text(`Fecha desembolso: ${new Date(form.disbursementDate).toLocaleDateString('es-PE')}`, rightColumn, yPosition + 6);
        pdf.text(`Tipo de préstamo: ${form.isShortTerm ? 'Corto plazo' : 'Largo plazo'}`, rightColumn, yPosition + 12);

        if (form.isShortTerm && form.shortTermEndDate) {
            pdf.text(`Fecha fin: ${new Date(form.shortTermEndDate).toLocaleDateString('es-PE')}`, rightColumn, yPosition + 18);
        }

        yPosition += 30;

        // Resumen financiero
        pdf.setFont('helvetica', 'bold');
        pdf.text('RESUMEN FINANCIERO', 20, yPosition);
        yPosition += 10;

        pdf.setFont('helvetica', 'normal');
        const totalAmount = this.getTotalAmount();
        const totalInterest = this.getTotalInterest();
        const principal = parseFloat(form.principal || 0);

        /*
        pdf.text(`Total a pagar: S/. ${totalAmount.toLocaleString('es-PE', {minimumFractionDigits: 2})}`, leftColumn, yPosition);
        pdf.text(`Total intereses: S/. ${totalInterest.toLocaleString('es-PE', {minimumFractionDigits: 2})}`, rightColumn, yPosition);
        pdf.text(`Capital inicial: S/. ${principal.toLocaleString('es-PE', {minimumFractionDigits: 2})}`, leftColumn, yPosition + 6);
        pdf.text(`Rentabilidad: S/. ${totalInterest.toLocaleString('es-PE', {minimumFractionDigits: 2})}`, rightColumn, yPosition + 6);

        yPosition += 20;
        */
        // Tabla de cuotas
        const tableColumns = ['N°', 'Fecha Venc.', 'Cuota (S/.)', 'Interés (S/.)', 'Capital (S/.)', 'Saldo (S/.)'];
        const tableRows: any[][] = [];

        installments.forEach((installment, index) => {
            tableRows.push([
                (index + 1).toString(),
                new Date(installment.dueDate).toLocaleDateString('es-PE'),
                (typeof installment.amount === 'number' ? installment.amount : Number(installment.amount))?.toFixed(2) || '0.00',
                (typeof installment.interest === 'number' ? installment.interest : Number(installment.interest))?.toFixed(2) || '0.00',
                (typeof installment.principalPart === 'number' ? installment.principalPart : Number(installment.principalPart))?.toFixed(2) || '0.00',
                (typeof installment.remainingBalance === 'number' ? installment.remainingBalance : Number(installment.remainingBalance))?.toFixed(2) || '0.00'
            ]);
        });

        // Agregar fila de totales
        tableRows.push([
            'TOTAL',
            '',
            totalAmount.toFixed(2),
            totalInterest.toFixed(2),
            principal.toFixed(2),
            ''
        ]);

        // Generar tabla con autoTable
        autoTable(pdf, {
            startY: yPosition,
            head: [tableColumns],
            body: tableRows,
            theme: 'striped',
            headStyles: {
                fillColor: [41, 128, 185], // Azul
                textColor: 255,
                fontStyle: 'bold',
                fontSize: 9
            },
            bodyStyles: {
                fontSize: 8,
                textColor: 50
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245]
            },
            footStyles: {
                fillColor: [231, 76, 60], // Rojo para totales
                textColor: 255,
                fontStyle: 'bold'
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 15 },
                1: { halign: 'center', cellWidth: 25 },
                2: { halign: 'right', cellWidth: 25 },
                3: { halign: 'right', cellWidth: 25 },
                4: { halign: 'right', cellWidth: 25 },
                5: { halign: 'right', cellWidth: 25 }
            },
            margin: { top: 10, left: 20, right: 20 },
            didParseCell: (data) => {
                // Resaltar la fila de totales
                if (data.row.index === tableRows.length - 1) {
                    data.cell.styles.fillColor = [52, 152, 219];
                    data.cell.styles.textColor = 255;
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        });

        // Footer con fecha de generación
        const finalY = (pdf as any).lastAutoTable.finalY + 20;
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'italic');
        pdf.text(`Documento generado el: ${new Date().toLocaleString('es-PE')}`,
                 pageWidth / 2, finalY > pageHeight - 20 ? pageHeight - 10 : finalY,
                 { align: 'center' });

        // Guardar PDF
        const fileName = `Prestamo_${customerName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(fileName);

        this.toastService.showMessage('PDF exportado correctamente', 'success');
    }
    onCancel(): void {
        this.loanForm.reset();
        this.router.navigate(['/loans']);
    }





}
