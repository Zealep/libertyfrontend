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
    loans = signal<Loan[]>([]);
    @ViewChild('datatable') datatable: any;
    search = '';
    statusFilter = '';
    termFilter = '';


cols = [
    { field: 'id', title: 'ID', isUnique: true, slot: 'id' },
    { field: 'customer.firstName', title: 'Cliente', slot: 'customer.firstName' },  // ✅ Campo real
    { field: 'principal', title: 'Monto', slot: 'monto' },
    { field: 'monthlyInterestRate', title: 'Tasa', slot: 'monthlyInterestRate' },    // ✅ Campo real
    { field: 'termMonths', title: 'Plazo Meses', slot: 'termMonths' },      // ✅ Campo real
    { field: 'disbursementDate', title: 'Fecha Inicio', slot: 'disbursementDate' }, // ✅ Campo real
    { field: 'interestType', title: 'Tipo Interés', slot: 'interestType' },   // ✅ Campo real
    { field: 'isShortTerm', title: 'Plazo', slot: 'isShortTerm' },           // ✅ Campo real
    { field: 'status', title: 'Estado', slot: 'status' },               // ✅ Campo real
    { field: 'acciones', title: 'Acciones', slot: 'acciones', sort: false, filter: false }
];

    ngOnInit() {
    this.getALL();
    }

    getALL(){
      this.loanService.getAll().subscribe(res =>{
        this.loans.set(res);
      });
    }

    add(){
      this.router.navigate(['/loan/form']);
    }

    editar(id: number){
      this.router.navigate(['/loan/form', id]);
    }

      eliminar(id: number){
        // Modal de confirmación con SweetAlert2
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
                // Mostrar loading durante la eliminación
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
                        // Success notification
                        Swal.fire({
                            title: '¡Eliminado!',
                            text: 'El préstamo ha sido eliminado correctamente',
                            icon: 'success',
                            timer: 2000,
                            showConfirmButton: false
                        });
                        this.getALL();
                    },
                    error: (err) => {
                        // Error notification
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
}
