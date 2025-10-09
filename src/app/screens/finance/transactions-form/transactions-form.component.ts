import { CommonModule } from '@angular/common';
import { Component, inject, signal, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgxCustomModalComponent } from 'ngx-custom-modal';
import { Transaction } from 'src/app/model/transaction';
import { Category } from 'src/app/model/category';
import { TransactionService } from 'src/app/service/transaction.service';
import { CategoryService } from 'src/app/service/category.service';
import { ToastService } from 'src/app/service/toast.service';

@Component({
    selector: 'app-transactions-form',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        FormsModule,
        NgSelectModule,
        NgxCustomModalComponent
    ],
    templateUrl: './transactions-form.component.html',
})
export class TransactionsFormComponent implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly transactionService = inject(TransactionService);
    private readonly categoryService = inject(CategoryService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly toastService = inject(ToastService);

    @ViewChild('categoryModal') categoryModal!: NgxCustomModalComponent;

    transactionForm!: FormGroup;
    categories = signal<Category[]>([]);
    filteredCategories = signal<Category[]>([]);
    isEditing = false;
    transactionId: number | null = null;

    // Categoría modal
    categoryForm!: FormGroup;

    ngOnInit(): void {
        this.initForm();
        this.initCategoryForm();
        this.loadCategories();

        // Verificar si es edición
        this.transactionId = Number(this.route.snapshot.params['id']);
        if (this.transactionId) {
            this.isEditing = true;
            this.loadTransaction(this.transactionId);
        }

        // Verificar tipo desde query params
        const type = this.route.snapshot.queryParams['type'];
        if (type && (type === 'INCOME' || type === 'EXPENSE')) {
            this.transactionForm.patchValue({ type });
            this.filterCategoriesByType(type);
        }
    }

    initForm(): void {
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

        // Filtrar categorías cuando cambie el tipo
        this.transactionForm.get('type')?.valueChanges.subscribe(type => {
            this.filterCategoriesByType(type);
            this.transactionForm.get('category')?.setValue('');
        });
    }

    initCategoryForm(): void {
        this.categoryForm = this.fb.group({
            name: ['', Validators.required],
            description: [''],
            type: ['', Validators.required],
            color: ['#3b82f6'],
            icon: ['fa-tag'],
            active: [true]
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

    loadTransaction(id: number): void {
        this.transactionService.getById(id).subscribe({
            next: (transaction) => {
                this.transactionForm.patchValue({
                    id: transaction.id,
                    amount: transaction.amount,
                    description: transaction.description,
                    type: transaction.type,
                    category: transaction.category.id,
                    transactionDate: transaction.transactionDate,
                    paymentMethod: transaction.paymentMethod,
                    reference: transaction.reference,
                    notes: transaction.notes,
                    isRecurring: transaction.isRecurring,
                    recurringFrequency: transaction.recurringFrequency
                });
                this.filterCategoriesByType(transaction.type);
            },
            error: (error) => {
                this.toastService.showMessage('Error al cargar la transacción', 'error');
                this.router.navigate(['/finance/transactions']);
            }
        });
    }

    onSubmit(): void {
        if (this.transactionForm.valid) {
            const formValue = this.transactionForm.value;

            // Buscar la categoría completa
            const selectedCategory = this.categories().find(c => c.id === formValue.category);

            const transaction: Transaction = {
                ...formValue,
                category: selectedCategory!,
                amount: parseFloat(formValue.amount)
            };

            this.transactionService.save(transaction).subscribe({
                next: (response) => {
                    const message = this.isEditing ? 'Transacción actualizada correctamente' : 'Transacción registrada correctamente';
                    this.toastService.showMessage(message, 'success');
                    this.router.navigate(['/finance/transactions']);
                },
                error: (error) => {
                    this.toastService.showMessage('Error al guardar la transacción', 'error');
                }
            });
        } else {
            this.toastService.showMessage('Por favor, completa todos los campos requeridos', 'warning');
            this.markFormGroupTouched();
        }
    }

    openCategoryModal(): void {
        this.categoryForm.patchValue({
            type: this.transactionForm.get('type')?.value || ''
        });
        this.categoryModal.open();
    }

    saveCategory(): void {
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
        }
    }

    cancel(): void {
        this.router.navigate(['/finance/transactions']);
    }

    private markFormGroupTouched(): void {
        Object.keys(this.transactionForm.controls).forEach(key => {
            const control = this.transactionForm.get(key);
            control?.markAsTouched();
        });
    }
}
