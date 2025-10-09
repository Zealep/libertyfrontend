import { CommonModule } from '@angular/common';
import { Component, inject, signal, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgxCustomModalComponent } from 'ngx-custom-modal';
import { Transaction } from 'src/app/model/transaction';
import { Category } from 'src/app/model/category';
import { TransactionService } from 'src/app/service/transaction.service';
import { CategoryService } from 'src/app/service/category.service';
import { ToastService } from 'src/app/service/toast.service';
import { NgSelectModule } from '@ng-select/ng-select';

@Component({
    selector: 'app-finance-dashboard',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, NgxCustomModalComponent,NgSelectModule],
    templateUrl: './finance-dashboard.component.html',
})
export class FinanceDashboardComponent implements OnInit {
    private readonly transactionService = inject(TransactionService);
    private readonly categoryService = inject(CategoryService);
    private readonly toastService = inject(ToastService);
    private readonly router = inject(Router);
    private readonly fb = inject(FormBuilder);

    @ViewChild('transactionModal') transactionModal!: NgxCustomModalComponent;
    @ViewChild('categoryModal') categoryModal!: NgxCustomModalComponent;

    transactions = signal<Transaction[]>([]);
    categories = signal<Category[]>([]);
    filteredCategories = signal<Category[]>([]);
    loading = false;

    // Formularios
    transactionForm!: FormGroup;
    categoryForm!: FormGroup;
    isEditing = false;

    // Métricas
    totalIncome = signal<number>(0);
    totalExpenses = signal<number>(0);
    balance = signal<number>(0);

    // Filtros
    currentMonth = new Date().getMonth() + 1;
    currentYear = new Date().getFullYear();

        // Opciones para métodos de pago
    paymentMethods = [
        { value: 'CASH', label: 'Efectivo', icon: 'fa-money-bill-wave' },
        { value: 'BANK_TRANSFER', label: 'Transferencia Bancaria', icon: 'fa-university' },
        { value: 'CREDIT_CARD', label: 'Tarjeta de Crédito', icon: 'fa-credit-card' },
        { value: 'DEBIT_CARD', label: 'Tarjeta de Débito', icon: 'fa-credit-card' },
        { value: 'CHECK', label: 'Cheque', icon: 'fa-file-text' }
    ];


    ngOnInit(): void {
        this.initForms();
        this.loadCategories();
        this.loadDashboardData();
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

    loadDashboardData(): void {
        this.loading = true;
        const startDate = `${this.currentYear}-${this.currentMonth.toString().padStart(2, '0')}-01`;
        const endDate = new Date(this.currentYear, this.currentMonth, 0).toISOString().split('T')[0];

        this.transactionService.getByDateRange(startDate, endDate).subscribe({
            next: (data) => {
                this.transactions.set(data);
                this.calculateMetrics(data);
                this.loading = false;
            },
            error: (error) => {
                this.toastService.showMessage('Error al cargar datos', 'error');
                this.loading = false;
            }
        });
    }

    calculateMetrics(transactions: Transaction[]): void {
        const income = transactions
            .filter(t => t.type === 'INCOME')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const expenses = transactions
            .filter(t => t.type === 'EXPENSE')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        this.totalIncome.set(income);
        this.totalExpenses.set(expenses);
        this.balance.set(income - expenses);
    }

    // Métodos para abrir modales
    addIncome(): void {
        this.isEditing = false;
        this.transactionForm.reset({
            type: 'INCOME',
            transactionDate: new Date().toISOString().split('T')[0],
            paymentMethod: 'CASH',
            isRecurring: false
        });
        this.filterCategoriesByType('INCOME');
        this.transactionModal.open();
    }

    addExpense(): void {
        this.isEditing = false;
        this.transactionForm.reset({
            type: 'EXPENSE',
            transactionDate: new Date().toISOString().split('T')[0],
            paymentMethod: 'CASH',
            isRecurring: false
        });
        this.filterCategoriesByType('EXPENSE');
        this.transactionModal.open();
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
                    const message = 'Transacción registrada correctamente';
                    this.toastService.showMessage(message, 'success');
                    this.loadDashboardData(); // Recargar datos del dashboard
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
                        this.transactionForm.get('category')?.setValue(response);
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

    // Navegación
    navigateToTransactions(): void {
        this.router.navigate(['/finance/transactions']);
    }

    navigateToCategories(): void {
        this.router.navigate(['/categories']);
    }

    private markFormGroupTouched(formGroup: FormGroup): void {
        Object.keys(formGroup.controls).forEach(key => {
            const control = formGroup.get(key);
            control?.markAsTouched();
        });
    }
}
