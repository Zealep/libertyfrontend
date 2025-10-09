import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal, ViewChild, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DataTableModule } from '@bhplugin/ng-datatable';
import { NgxCustomModalComponent } from 'ngx-custom-modal';
import { Category } from 'src/app/model/category';
import { CategoryService } from 'src/app/service/category.service';
import { ToastService } from 'src/app/service/toast.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-categories-list',
    standalone: true,
    imports: [DataTableModule, CommonModule, FormsModule, NgxCustomModalComponent, ReactiveFormsModule],
    templateUrl: './categories-list.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriesListComponent implements OnInit {
    private readonly categoryService = inject(CategoryService);
    private readonly toastService = inject(ToastService);
    private readonly fb = inject(FormBuilder);

    loading = false;
    categories = signal<Category[]>([]);
    @ViewChild('datatable') datatable: any;
    @ViewChild('categoryModal') categoryModal!: NgxCustomModalComponent;

    categoryForm!: FormGroup;
    search = '';
    typeFilter = '';
    isEditing = false;

    cols = [
        { field: 'id', title: 'ID', slot: 'id' },
        { field: 'name', title: 'Nombre', slot: 'nombre' },
        { field: 'type', title: 'Tipo', slot: 'tipo' },
        { field: 'description', title: 'Descripción', slot: 'descripcion' },
        { field: 'active', title: 'Estado', slot: 'estado' },
        { field: 'acciones', title: 'Acciones', slot: 'acciones', sort: false, filter: false }
    ];

    ngOnInit(): void {
        this.initForm();
        this.getAll();
    }

    initForm(): void {
        this.categoryForm = this.fb.group({
            id: [null],
            name: ['', Validators.required],
            description: [''],
            type: ['', Validators.required],
            color: ['#3b82f6'],
            icon: ['fa-tag'],
            active: [true]
        });
    }

    getAll(): void {
        this.loading = true;
        this.categoryService.getAll().subscribe({
            next: (res) => {
                this.categories.set(res);
                this.loading = false;
            },
            error: (err) => {
                this.loading = false;
                this.toastService.showMessage('Error al cargar categorías', 'error');
                console.error('Error:', err);
            }
        });
    }

    openModal(): void {
        this.isEditing = false;
        this.categoryForm.reset({
            color: '#3b82f6',
            icon: 'fa-tag',
            active: true
        });
        this.categoryModal.open();
    }

    editar(category: Category): void {
        this.isEditing = true;
        this.categoryForm.patchValue(category);
        this.categoryModal.open();
    }

    eliminar(category: Category): void {
        Swal.fire({
            title: '¿Estás seguro?',
            text: 'Esta acción eliminará permanentemente la categoría',
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

                this.categoryService.delete(category.id!).subscribe({
                    next: () => {
                        Swal.fire({
                            title: '¡Eliminado!',
                            text: 'La categoría ha sido eliminada correctamente',
                            icon: 'success',
                            timer: 2000,
                            showConfirmButton: false
                        });
                        this.getAll();
                    },
                    error: (err) => {
                        Swal.fire({
                            title: 'Error',
                            text: 'No se pudo eliminar la categoría. Puede estar en uso.',
                            icon: 'error',
                            confirmButtonText: 'Entendido'
                        });
                        console.error('Error al eliminar:', err);
                    }
                });
            }
        });
    }

    toggleStatus(category: Category): void {
        const newCategory = { ...category, active: !category.active };

        this.categoryService.save(newCategory).subscribe({
            next: () => {
                const status = newCategory.active ? 'activado' : 'desactivado';
                this.toastService.showMessage(`Categoría ${status} correctamente`, 'success');
                this.getAll();
            },
            error: (err) => {
                this.toastService.showMessage('Error al cambiar el estado', 'error');
                console.error('Error:', err);
            }
        });
    }

    guardar(): void {
        if (this.categoryForm.valid) {
            const category: Category = this.categoryForm.value;

            this.categoryService.save(category).subscribe({
                next: () => {
                    const message = this.isEditing ? 'Categoría actualizada correctamente' : 'Categoría creada correctamente';
                    this.toastService.showMessage(message, 'success');
                    this.getAll();
                    this.categoryModal.close();
                },
                error: (err) => {
                    this.toastService.showMessage('Error al guardar la categoría', 'error');
                    console.error('Error:', err);
                }
            });
        } else {
            this.toastService.showMessage('Por favor, completa todos los campos requeridos', 'warning');
            this.markFormGroupTouched();
        }
    }

    filterByType(type: string): void {
        this.typeFilter = type;
    }

    getIncomeCategories(): number {
        return this.categories().filter(c => c.type === 'INCOME' && c.active).length;
    }

    getExpenseCategories(): number {
        return this.categories().filter(c => c.type === 'EXPENSE' && c.active).length;
    }

    getTotalCategories(): number {
        return this.categories().filter(c => c.active).length;
    }

    private markFormGroupTouched(): void {
        Object.keys(this.categoryForm.controls).forEach(key => {
            const control = this.categoryForm.get(key);
            control?.markAsTouched();
        });
    }
}
