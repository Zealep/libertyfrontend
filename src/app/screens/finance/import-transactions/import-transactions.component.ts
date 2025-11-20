import { CommonModule } from '@angular/common';
import { Component, inject, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgxCustomModalComponent } from 'ngx-custom-modal';
import { Category } from 'src/app/model/category';
import { ImportService } from 'src/app/service/import.service';
import { CategoryService } from 'src/app/service/category.service';
import { TransactionService } from 'src/app/service/transaction.service';
import { ToastService } from 'src/app/service/toast.service';
import { ImportResult } from 'src/app/model/import';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-import-transactions',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, NgSelectModule, NgxCustomModalComponent],
    templateUrl: './import-transactions.component.html'
})
export class ImportTransactionsComponent {
    private readonly importService = inject(ImportService);
    private readonly categoryService = inject(CategoryService);
    private readonly transactionService = inject(TransactionService);
    private readonly toastService = inject(ToastService);
    private readonly router = inject(Router);
    private readonly fb = inject(FormBuilder);

    @ViewChild('editModal') editModal!: NgxCustomModalComponent;

    importResult = signal<ImportResult | null>(null);
    categories = signal<Category[]>([]);
    loading = false;
    selectedFile: File | null = null;
    editForm!: FormGroup;
    currentEditIndex = -1;

    ngOnInit(): void {
        this.loadCategories();
        this.initEditForm();
    }

    initEditForm(): void {
        this.editForm = this.fb.group({
            amount: ['', [Validators.required, Validators.min(0.01)]],
            description: ['', Validators.required],
            type: ['', Validators.required],
            category: ['', Validators.required],
            transactionDate: ['', Validators.required],
            paymentMethod: ['CASH'],
            reference: [''],
            notes: ['']
        });
    }

    loadCategories(): void {
        this.categoryService.getAll().subscribe({
            next: (data) => {
                this.categories.set(data.filter(c => c.active));
            },
            error: () => {
                this.toastService.showMessage('Error al cargar categorías', 'error');
            }
        });
    }

    onFileSelected(event: any): void {
        const file = event.target.files[0];
        if (file) {
            this.selectedFile = file;
            this.processFile(file);
        }
    }

    processFile(file: File): void {
        this.loading = true;

        this.importService.parseCSV(file).subscribe({
            next: (result) => {
                this.importResult.set(result);
                this.loading = false;

                if (result.validRows === 0) {
                    this.toastService.showMessage('No se encontraron transacciones válidas', 'warning');
                } else {
                    this.toastService.showMessage(
                        `${result.validRows} transacciones válidas de ${result.totalRows} encontradas`,
                        'success'
                    );
                }
            },
            error: (error) => {
                this.loading = false;
                this.toastService.showMessage('Error al procesar el archivo', 'error');
                console.error(error);
            }
        });
    }

    editTransaction(index: number): void {
        const transaction = this.importResult()?.transactions[index];
        if (!transaction) return;

        this.currentEditIndex = index;
        this.editForm.patchValue({
            amount: transaction.amount,
            description: transaction.description,
            type: transaction.type,
            category: transaction.category,
            transactionDate: transaction.transactionDate,
            paymentMethod: transaction.paymentMethod || 'CASH',
            reference: transaction.reference || '',
            notes: transaction.notes || ''
        });

        this.editModal.open();
    }

    saveEdit(): void {
        if (this.editForm.valid && this.importResult()) {
            const result = this.importResult();
            if (result && result.transactions[this.currentEditIndex]) {
                const formValue = this.editForm.value;
                result.transactions[this.currentEditIndex] = {
                    ...result.transactions[this.currentEditIndex],
                    ...formValue,
                    isValid: true,
                    validationErrors: []
                };

                // Recalcular contadores
                result.validRows = result.transactions.filter(t => t.isValid).length;
                result.invalidRows = result.transactions.filter(t => !t.isValid).length;

                this.importResult.set({ ...result });
                this.editModal.close();
                this.toastService.showMessage('Transacción actualizada', 'success');
            }
        }
    }

    removeTransaction(index: number): void {
        const result = this.importResult();
        if (result) {
            result.transactions.splice(index, 1);
            result.totalRows = result.transactions.length;
            result.validRows = result.transactions.filter(t => t.isValid).length;
            result.invalidRows = result.transactions.filter(t => !t.isValid).length;

            this.importResult.set({ ...result });
            this.toastService.showMessage('Transacción eliminada', 'info');
        }
    }

    saveAllTransactions(): void {
    const result = this.importResult();
    if (!result || result.validRows === 0) {
        this.toastService.showMessage('No hay transacciones válidas para guardar', 'warning');
        return;
    }

    // Mostrar spinner overlay
    Swal.fire({
        title: 'Guardando transacciones',
        html: `
            <div class="text-center">
                <i class="fa fa-spinner fa-spin text-4xl text-primary mb-4"></i>
                <p class="text-gray-600 mt-4">Procesando <span id="progress">0</span> de ${result.validRows} transacciones...</p>
            </div>
        `,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    const validTransactions = result.transactions.filter(t => t.isValid);
    let saved = 0;
    let errors = 0;

    validTransactions.forEach((transaction) => {
        this.transactionService.save(transaction).subscribe({
            next: () => {
                saved++;
                // Actualizar progreso
                const progressElement = document.getElementById('progress');
                if (progressElement) {
                    progressElement.textContent = (saved + errors).toString();
                }

                if (saved + errors === validTransactions.length) {
                    this.finishImport(saved, errors);
                }
            },
            error: () => {
                errors++;
                const progressElement = document.getElementById('progress');
                if (progressElement) {
                    progressElement.textContent = (saved + errors).toString();
                }

                if (saved + errors === validTransactions.length) {
                    this.finishImport(saved, errors);
                }
            }
        });
    });
}

finishImport(saved: number, errors: number): void {
    if (errors === 0) {
        Swal.fire({
            icon: 'success',
            title: '¡Éxito!',
            text: `${saved} transacciones guardadas correctamente`,
            timer: 2000,
            showConfirmButton: false
        }).then(() => {
            this.router.navigate(['/finance/dashboard']);
        });
    } else {
        Swal.fire({
            icon: 'warning',
            title: 'Proceso completado',
            text: `${saved} transacciones guardadas, ${errors} con errores`,
            confirmButtonText: 'Entendido'
        }).then(() => {
            this.router.navigate(['/finance/dashboard']);
        });
    }
}

    cancel(): void {
        this.router.navigate(['/finance/dashboard']);
    }

    getCategoriesByType(type: string): Category[] {
        return this.categories().filter(c => c.type === type);
    }

    downloadTemplate(): void {
        const template = 'Fecha,Monto,Descripción,Tipo,Referencia\n' +
                        '2024-01-15,100.50,Venta de producto,INCOME,REF-001\n' +
                        '15/01/2024,-50.00,Compra en supermercado,EXPENSE,\n' +
                        '2024-01-16,200,Pago de cliente,INCOME,REF-002';

        const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'plantilla_transacciones.csv';
        link.click();
    }
}
