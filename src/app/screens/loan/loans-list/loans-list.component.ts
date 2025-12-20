import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal, ViewChild } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DataTableModule } from '@bhplugin/ng-datatable';
import { NgxCustomModalComponent } from 'ngx-custom-modal';
import { Loan } from 'src/app/model/loan';
import { LoansStatusPipe } from 'src/app/pipes/loans-status.pipe';
import { LoanService } from 'src/app/service/loan.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-loans-list',
    standalone: true,
    imports: [DataTableModule, CommonModule, FormsModule, NgxCustomModalComponent, ReactiveFormsModule, LoansStatusPipe],
    templateUrl: './loans-list.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoansListComponent {
    loading = false;
    private readonly loanService = inject(LoanService);
    private readonly router = inject(Router);

    // Signal principal con todos los datos
    loans = signal<Loan[]>([]);

    @ViewChild('datatable') datatable: any;
    search = '';
    statusFilter = '';
    termFilter = '';

    cols = [
        { field: 'id', title: 'ID', isUnique: true, slot: 'id' },
        { field: 'customer.firstName', title: 'Cliente', slot: 'customer.firstName' },
        { field: 'principal', title: 'Monto', slot: 'principal' },
        { field: 'monthlyInterestRate', title: 'Tasa', slot: 'monthlyInterestRate' },
        { field: 'termMonths', title: 'Plazo', slot: 'termMonths' },
        { field: 'disbursementDate', title: 'Fecha Inicio', slot: 'disbursementDate' },
        { field: 'interestType', title: 'Tipo Interés', slot: 'interestType' },
        { field: 'isShortTerm', title: 'Plazo', slot: 'isShortTerm' },
        { field: 'status', title: 'Estado', slot: 'status' },
        { field: 'sendNotification', title: 'Enviar Notificación?', slot: 'sendNotification', sort: false, filter: false },
        { field: 'acciones', title: 'Acciones', slot: 'acciones', sort: false, filter: false }
    ];

    ngOnInit() {
        this.loadLoans();
    }

    // Cargar préstamos con filtros desde el backend
    loadLoans() {
        this.loading = true;

        const status = this.statusFilter;
        const term = this.termFilter;

        // Si no hay filtros, usar getAll, sino usar getByFilters
        const request$ = (status || term)
            ? this.loanService.getByFilters(status, term)
            : this.loanService.getAll();

        request$.subscribe({
            next: (res) => {
                this.loans.set(res);
                this.loading = false;
            },
            error: (err) => {
                this.loading = false;
                Swal.fire({
                    title: 'Error',
                    text: 'No se pudieron cargar los préstamos',
                    icon: 'error',
                    confirmButtonText: 'Entendido'
                });
                console.error('Error:', err);
            }
        });
    }

    // Aplicar filtros llamando al backend
    applyFilters() {
        this.loadLoans();
    }

    // Limpiar filtros
    clearFilters() {
        this.statusFilter = '';
        this.termFilter = '';
        this.search = '';
        this.loadLoans();
    }

    // Computed para mostrar los préstamos filtrados (para el template)
    filteredLoans() {
        return this.loans();
    }

    // Métodos para las estadísticas
    getActiveLoans(): number {
        return this.loans().filter(loan => loan.status === 'ACTIVE').length;
    }

    getTotalAmount(): number {
        return this.loans().reduce((sum, loan) => sum + Number(loan.principal), 0);
    }

    getShortTermLoans(): number {
        return this.loans().filter(loan => loan.isShortTerm).length;
    }

    add() {
        this.router.navigate(['/loan/form']);
    }

    editar(id: number) {
        this.router.navigate(['/loan/form', id]);
    }

    eliminar(id: number) {
        Swal.fire({
            title: '¿Estás seguro?',
            text: 'Esta acción eliminará permanentemente el préstamo',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            reverseButtons: true,
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

                this.loanService.delete(id).subscribe({
                    next: () => {
                        Swal.fire({
                            title: '¡Eliminado!',
                            text: 'El préstamo ha sido eliminado correctamente',
                            icon: 'success',
                            timer: 2000,
                            showConfirmButton: false
                        });
                        this.loadLoans();
                    },
                    error: (err) => {
                        Swal.fire({
                            title: 'Error',
                            text: 'No se pudo eliminar el préstamo. Inténtalo nuevamente.',
                            icon: 'error',
                            confirmButtonText: 'Entendido'
                        });
                        console.error('Error al eliminar:', err);
                    }
                });
            }
        });
    }

    viewLoanDetails(loan: Loan) {
        this.router.navigate(['/loans', loan.id]);
    }

    toggleNotification(loan: Loan, event: Event) {
        const checked = (event.target as HTMLInputElement).checked;
        const newValue = checked ? 'S' : 'N';

        this.loanService.updateNotification(loan.id!, newValue).subscribe({
            next: () => {
                // Actualizar el estado local
                const updatedLoans = this.loans().map(l => 
                    l.id === loan.id ? { ...l, sendNotification: newValue } : l
                );
                this.loans.set(updatedLoans);

                Swal.fire({
                    title: '¡Actualizado!',
                    text: `Notificación ${checked ? 'activada' : 'desactivada'} correctamente`,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
            },
            error: (err) => {
                // Revertir el cambio en caso de error
                (event.target as HTMLInputElement).checked = !checked;
                
                Swal.fire({
                    title: 'Error',
                    text: 'No se pudo actualizar la notificación',
                    icon: 'error',
                    confirmButtonText: 'Entendido'
                });
                console.error('Error al actualizar notificación:', err);
            }
        });
    }
}
