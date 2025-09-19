import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

import { catchError, throwError } from 'rxjs';
import { Loan } from '../model/loan';
import { Installment } from '../model/installment';


@Injectable({
  providedIn: 'root'
})
export class InstallmentService {
    URL_BACKEND: string = `${environment.url_api}/installments`;

constructor(private http: HttpClient) { }

simulate() {
    return this.http.get<Installment[]>(`${this.URL_BACKEND}/simulate`)
    .pipe(catchError(this.handleErrorDefault));
 }


  private handleErrorDefault(error: HttpErrorResponse) {
  return throwError(() => error.error);
}
}
