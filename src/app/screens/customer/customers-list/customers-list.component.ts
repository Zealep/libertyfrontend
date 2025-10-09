import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DataTableModule } from '@bhplugin/ng-datatable';
import { NgxCustomModalComponent } from 'ngx-custom-modal';
import { firstValueFrom } from 'rxjs';
import { Customer } from 'src/app/model/customer';
import { CustomerService } from 'src/app/service/customer.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-customers-list',
  standalone: true,
  imports: [DataTableModule, CommonModule, FormsModule, NgxCustomModalComponent, ReactiveFormsModule],
  templateUrl: './customers-list.component.html',
})
export class CustomersListComponent implements OnInit {
  loading = false;
  private readonly customerService = inject(CustomerService);
  private readonly fb = inject(FormBuilder);
  customers = signal<Customer[]>([]);
  @ViewChild('datatable') datatable: any;
  @ViewChild('addModal') addModal!: NgxCustomModalComponent;
  params!: FormGroup;
  search = '';

  cols = [
    { field: 'id', title: 'ID', isUnique: true },
    { field: 'firstName', title: 'Nombre', slot: 'firstName' },
    { field: 'lastName', title: 'Apellido', slot: 'lastName' },
    { field: 'documentNumber', title: 'Documento', slot: 'documentNumber' },
    { field: 'email', title: 'Email', slot: 'email' },
    { field: 'phone', title: 'Teléfono', slot: 'phone' },
    { field: 'state', title: 'Estado', slot: 'state' },
    { field: 'acciones', title: 'Acciones', slot: 'acciones' },
  ];

  initForm() {
    this.params = this.fb.group({
      id: [0],
      firstName: [''],
      lastName: [''],
      documentNumber: [''],
      email: [''],
      phone: [''],
      state: ['ACTIVE', Validators.required] // ← Valor por defecto 'ACTIVE'
    });
  }

  ngOnInit(): void {
    this.getAll();
  }

  getAll() {
    this.customerService.getAll().subscribe((data) => {
      this.customers.set(data);
    });
  }

  editar(row: Customer | null) {
    this.addModal.open();
    this.initForm();
    if (row) {
      this.params.setValue({
        id: row.id,
        firstName: row.firstName,
        lastName: row.lastName,
        documentNumber: row.documentNumber,
        email: row.email,
        phone: row.phone,
        state: row.state,
      });
    }
  }

  guardar() {
    if (this.params.invalid) {
      this.showMessage('Todos los campos son requeridos.', 'error');
      return;
    }

    const req: Customer = {
      id: this.params.value.id != 0 ? this.params.value.id : null,
      firstName: this.params.value.firstName,
      lastName: this.params.value.lastName,
      documentNumber: this.params.value.documentNumber,
      email: this.params.value.email,
      phone: this.params.value.phone,
      state: this.params.value.state,
    };

    this.customerService.save(req).subscribe(data => {
      this.getAll();
      this.showMessage('Registro guardado', 'success');
      this.addModal.close();
    });
  }

  eliminar(row: Customer) {
    Swal.fire({
      title: '¿Desea eliminar el registro?',
      showCancelButton: true,
      confirmButtonText: 'SI',
      icon: "warning",
    }).then(async (result) => {
      if (result.isConfirmed) {
        await firstValueFrom(this.customerService.delete(row.id!));
        this.getAll();
        this.showMessage('Registro Eliminado', 'success');
      }
    });
  }

  showMessage(msg = '', type = 'success') {
    const toast: any = Swal.mixin({
      toast: true,
      position: 'top',
      showConfirmButton: false,
      timer: 3000,
      customClass: { container: 'toast' },
    });
    toast.fire({
      icon: type,
      title: msg,
      padding: '10px 20px',
    });
  }
}
