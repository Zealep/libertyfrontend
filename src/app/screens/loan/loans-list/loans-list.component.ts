import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal, ViewChild } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DataTableModule } from '@bhplugin/ng-datatable';
import { NgxCustomModalComponent } from 'ngx-custom-modal';
import { Loan } from 'src/app/model/loan';
import { LoansStatusPipe } from 'src/app/pipes/loans-status.pipe';
import { LoanService } from 'src/app/service/loan.service';

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

    cols = [
        { field: 'id', title: 'ID', isUnique: true },
        { field: 'cliente', title: 'Cliente' },
        { field: 'monto', title: 'Monto' },
        { field: 'tasa', title: 'Tasa' },
        { field: 'plazo', title: 'Plazo Meses' },
        { field: 'fechaInicio', title: 'Fecha Inicio' },
        { field: 'tipoInteres', title: 'Tipo Interés' },
        { field: 'esCortoPlazo', title: 'Plazo' }, // Nueva columna
        { field: 'estado', title: 'Estado' },
        { field: 'acciones', title: 'Acciones' },
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
      if(confirm('¿Está seguro de eliminar este préstamo?')){
        this.loanService.delete(id).subscribe({
          next: () =>{
            this.getALL();
          },
          error: (err) =>{
            alert('Error al eliminar el préstamo: ' + err);
          }
        });
      }
    }

    viewLoanDetails(loan: Loan) {
  this.router.navigate(['/loans', loan.id]);
}
}
