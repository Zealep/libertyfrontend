import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal, ViewChild, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { DataTableModule } from '@bhplugin/ng-datatable';
import { NgxCustomModalComponent } from 'ngx-custom-modal';
import { Transaction } from 'src/app/model/transaction';
import { Category } from 'src/app/model/category';
import { TransactionService } from 'src/app/service/transaction.service';
import { CategoryService } from 'src/app/service/category.service';
import { ToastService } from 'src/app/service/toast.service';
import { TransactionTypePipe } from 'src/app/pipes/transaction-type.pipe';
import Swal from 'sweetalert2';
import { PaymentsMethodPipe } from 'src/app/pipes/payments-method.pipe';
import { NgSelectModule } from '@ng-select/ng-select';

@Component({
    selector: 'app-transactions-list',
    standalone: true,
    imports: [DataTableModule, CommonModule, FormsModule, NgxCustomModalComponent, ReactiveFormsModule, TransactionTypePipe,PaymentsMethodPipe,NgSelectModule],
    templateUrl: './transactions-list.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionsListComponent implements OnInit {
    private readonly transactionService = inject(TransactionService);
    private readonly categoryService = inject(CategoryService);
    private readonly router = inject(Router);
    private readonly toastService = inject(ToastService);
    private readonly fb = inject(FormBuilder);


    loading = false;
    transactions = signal<Transaction[]>([]);
    categories = signal<Category[]>([]);
    filteredCategories = signal<Category[]>([]);
    startDate = '';
    endDate = '';

    @ViewChild('datatable') datatable: any;
    @ViewChild('transactionModal') transactionModal!: NgxCustomModalComponent;
    @ViewChild('categoryModal') categoryModal!: NgxCustomModalComponent;

    transactionForm!: FormGroup;
    categoryForm!: FormGroup;
    search = '';
    typeFilter = '';
    isEditing = false;


    transactionTypeOptions = [
    { value: 'INCOME', label: 'Ingresos', icon: 'fa-arrow-up' },
    { value: 'EXPENSE', label: 'Gastos', icon: 'fa-arrow-down' }
];

paymentMethods = [
    { value: 'CASH', label: 'Efectivo', icon: 'fa-money-bill-wave' },
    { value: 'BANK_TRANSFER', label: 'Transferencia Bancaria', icon: 'fa-university' },
    { value: 'CREDIT_CARD', label: 'Tarjeta de Crédito', icon: 'fa-credit-card' },
    { value: 'DEBIT_CARD', label: 'Tarjeta de Débito', icon: 'fa-credit-card' },
    { value: 'CHECK', label: 'Cheque', icon: 'fa-file-text' }
];

    cols = [
        { field: 'id', title: 'ID', slot: 'id' },
        { field: 'transactionDate', title: 'Fecha', slot: 'transactionDate' },
        { field: 'description', title: 'Descripción', slot: 'description' },
        { field: 'category.name', title: 'Categoría', slot: 'category.name' },
        { field: 'type', title: 'Tipo', slot: 'type' },
        { field: 'amount', title: 'Monto', slot: 'amount' },
        { field: 'paymentMethod', title: 'Método', slot: 'paymentMethod' },
        { field: 'acciones', title: 'Acciones', slot: 'acciones', sort: false, filter: false }
    ];

    ngOnInit(): void {
        this.initForms();
        this.loadCategories();
             // Establecer fechas por defecto (mes actual)
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        this.startDate = this.formatDate(firstDay);
        this.endDate = this.formatDate(lastDay);
        this.getAll();
    }

    initForms(): void {
        // Formulario de transacción
        this.transactionForm = this.fb.group({
            id: [null],
            amount: ['', [Validators.required, Validators.min(0.01)]],
            description: ['', Validators.required],
            type: ['', Validators.required],
            category: ['', Validators.required],
            transactionDate: [new Date().toISOString().split('T')[0], Validators.required],
            paymentMethod: ['CASH', Validators.required],
            reference: [''],
            notes: [''],
            isRecurring: [false],
            recurringFrequency: ['']
        });

        // Formulario de categoría
        this.categoryForm = this.fb.group({
            name: ['', Validators.required],
            description: [''],
            type: ['', Validators.required],
            color: ['#3b82f6'],
            icon: ['fa-tag'],
            active: [true]
        });

        // Filtrar categorías cuando cambie el tipo
        this.transactionForm.get('type')?.valueChanges.subscribe(type => {
            this.filterCategoriesByType(type);
            this.transactionForm.get('category')?.setValue('');
        });
    }

    loadCategories(): void {
        this.categoryService.getAll().subscribe({
            next: (data) => {
                this.categories.set(data.filter(c => c.active));
                this.filteredCategories.set(data.filter(c => c.active));
            },
            error: (error) => {
                this.toastService.showMessage('Error al cargar categorías', 'error');
            }
        });
    }

    filterCategoriesByType(type: string): void {
        if (type) {
            const filtered = this.categories().filter(c => c.type === type);
            this.filteredCategories.set(filtered);
        } else {
            this.filteredCategories.set(this.categories());
        }
    }

   getAll(): void {
        if (!this.startDate || !this.endDate) {
            this.toastService.showMessage('Seleccione un rango de fechas', 'warning');
            return;
        }

        if (this.startDate > this.endDate) {
            this.toastService.showMessage('La fecha inicial debe ser menor a la fecha final', 'error');
            return;
        }

        this.loading = true;
        this.transactionService.getByDateRange(
            this.startDate,
            this.endDate,
            this.typeFilter
        ).subscribe({
            next: (res) => {
                const mappedData = res.map(transaction => ({
                    ...transaction,
                    fecha: transaction.transactionDate,
                    descripcion: transaction.description,
                    categoria: transaction.category?.name,
                    tipo: transaction.type,
                    monto: transaction.amount,
                    metodo: transaction.paymentMethod
                }));
                this.transactions.set(mappedData);
                this.loading = false;
            },
            error: (err) => {
                this.loading = false;
                this.toastService.showMessage('Error al cargar transacciones', 'error');
                console.error('Error:', err);
            }
        });
    }
    applyDateFilter(): void {
        this.getAll();
    }
       applyTypeFilter(): void {
        this.getAll();
    }


    clearDateFilter(): void {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        this.startDate = this.formatDate(firstDay);
        this.endDate = this.formatDate(lastDay);
        this.typeFilter = '';
        this.getAll();
    }

    private formatDate(date: Date): string {
        return date.toISOString().split('T')[0];
    }

    // Métodos para abrir modales
    openTransactionModal(type?: 'INCOME' | 'EXPENSE'): void {
        this.isEditing = false;
        this.transactionForm.reset({
            transactionDate: new Date().toISOString().split('T')[0],
            paymentMethod: 'CASH',
            isRecurring: false,
            type: type || ''
        });

        if (type) {
            this.filterCategoriesByType(type);
        }

        this.transactionModal.open();
    }

    addIncome(): void {
        this.openTransactionModal('INCOME');
    }

    addExpense(): void {
        this.openTransactionModal('EXPENSE');
    }

    editar(transaction: Transaction): void {
        this.isEditing = true;
        this.transactionForm.patchValue({
            id: transaction.id,
            amount: transaction.amount,
            description: transaction.description,
            type: transaction.type,
            category: transaction.category,
            transactionDate: transaction.transactionDate,
            paymentMethod: transaction.paymentMethod,
            reference: transaction.reference,
            notes: transaction.notes,
            isRecurring: transaction.isRecurring,
            recurringFrequency: transaction.recurringFrequency
        });
        this.filterCategoriesByType(transaction.type);
        this.transactionModal.open();
    }

    eliminar(transaction: Transaction): void {
        Swal.fire({
            title: '¿Estás seguro?',
            text: 'Esta acción eliminará permanentemente la transacción',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            reverseButtons: true
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'Eliminando...',
                    text: 'Por favor espera',
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    showConfirmButton: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                this.transactionService.delete(transaction.id!).subscribe({
                    next: () => {
                        Swal.fire({
                            title: '¡Eliminado!',
                            text: 'La transacción ha sido eliminada correctamente',
                            icon: 'success',
                            timer: 2000,
                            showConfirmButton: false
                        });
                        this.getAll();
                    },
                    error: (err) => {
                        Swal.fire({
                            title: 'Error',
                            text: 'No se pudo eliminar la transacción. Inténtalo nuevamente.',
                            icon: 'error',
                            confirmButtonText: 'Entendido'
                        });
                        console.error('Error al eliminar:', err);
                    }
                });
            }
        });
    }

    // Guardar transacción
    guardarTransaccion(): void {
        if (this.transactionForm.valid) {
            const formValue = this.transactionForm.value;


            const transaction: Transaction = {
                ...formValue,
                amount: parseFloat(formValue.amount)
            };

            this.transactionService.save(transaction).subscribe({
                next: (response) => {
                    const message = this.isEditing ? 'Transacción actualizada correctamente' : 'Transacción registrada correctamente';
                    this.toastService.showMessage(message, 'success');
                    this.getAll();
                    this.transactionModal.close();
                },
                error: (error) => {
                    this.toastService.showMessage('Error al guardar la transacción', 'error');
                }
            });
        } else {
            this.toastService.showMessage('Por favor, completa todos los campos requeridos', 'warning');
            this.markFormGroupTouched(this.transactionForm);
        }
    }

    // Modal de categoría
    openCategoryModal(): void {
        this.categoryForm.patchValue({
            type: this.transactionForm.get('type')?.value || '',
            color: '#3b82f6',
            isActive: true
        });
        this.categoryModal.open();
    }

    guardarCategoria(): void {
        if (this.categoryForm.valid) {
            const category: Category = this.categoryForm.value;

            this.categoryService.save(category).subscribe({
                next: (response) => {
                    this.toastService.showMessage('Categoría creada correctamente', 'success');
                    this.loadCategories();
                    this.categoryModal.close();
                    this.categoryForm.reset();

                    // Seleccionar la nueva categoría
                    setTimeout(() => {
                        this.transactionForm.get('category')?.setValue(response.id);
                    }, 100);
                },
                error: (error) => {
                    this.toastService.showMessage('Error al crear la categoría', 'error');
                }
            });
        } else {
            this.markFormGroupTouched(this.categoryForm);
        }
    }

    // Métodos auxiliares
    filterByType(type: string): void {
        this.typeFilter = type;
    }

    exportToPDF(): void {
        this.toastService.showMessage('Funcionalidad en desarrollo', 'info');
    }

    // Métodos de totales actualizados para usar signal
    getTotalBalance(): number {
        const transactions = this.transactions();

        // Filtrar por tipo si está seleccionado
        let filtered = transactions;
        if (this.typeFilter) {
            filtered = transactions.filter(t => t.type === this.typeFilter);
        }

        const income = filtered
            .filter(t => t.type === 'INCOME')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const expenses = filtered
            .filter(t => t.type === 'EXPENSE')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        return income - expenses;
    }

    getTotalIncome(): number {
        let transactions = this.transactions();

        if (this.typeFilter === 'INCOME') {
            return transactions
                .filter(t => t.type === 'INCOME')
                .reduce((sum, t) => sum + Number(t.amount), 0);
        }

        return transactions
            .filter(t => t.type === 'INCOME')
            .reduce((sum, t) => sum + Number(t.amount), 0);
    }

    getTotalExpenses(): number {
        let transactions = this.transactions();

        if (this.typeFilter === 'EXPENSE') {
            return transactions
                .filter(t => t.type === 'EXPENSE')
                .reduce((sum, t) => sum + Number(t.amount), 0);
        }

        return transactions
            .filter(t => t.type === 'EXPENSE')
            .reduce((sum, t) => sum + Number(t.amount), 0);
    }

    private markFormGroupTouched(formGroup: FormGroup): void {
        Object.keys(formGroup.controls).forEach(key => {
            const control = formGroup.get(key);
            control?.markAsTouched();
        });
    }
}
