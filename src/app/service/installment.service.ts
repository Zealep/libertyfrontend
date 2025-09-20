import { Loan } from './../model/loan';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

import { catchError, throwError } from 'rxjs';
import { Installment } from '../model/installment';


@Injectable({
  providedIn: 'root'
})
export class InstallmentService {
    URL_BACKEND: string = `${environment.url_api}/installments`;

constructor(private http: HttpClient) { }

simulate(loan: Loan) {
    return this.http.post<Installment[]>(`${this.URL_BACKEND}/simulate`, loan)
    .pipe(catchError(this.handleErrorDefault));
 }


  private handleErrorDefault(error: HttpErrorResponse) {
  return throwError(() => error.error);
}
}
