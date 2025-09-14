import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

import { catchError, throwError } from 'rxjs';
import { Loan } from '../model/loan';
import { Payment } from '../model/payment';


@Injectable({
  providedIn: 'root'
})
export class PaymentService {
    URL_BACKEND: string = `${environment.url_api}/payments`;

constructor(private http: HttpClient) { }

getAll() {
    return this.http.get<Payment[]>(`${this.URL_BACKEND}`)
    .pipe(catchError(this.handleErrorDefault));
 }

getById(id: number) {
    return this.http.get<Payment>(`${this.URL_BACKEND}/${id}`)
    .pipe(catchError(this.handleErrorDefault));

}

save(req: Payment) {
    return this.http.post(`${this.URL_BACKEND}`, req)
    .pipe(catchError(this.handleErrorDefault));
}

delete(id: number) {
    return this.http.delete(`${this.URL_BACKEND}/${id}`)
    .pipe(catchError(this.handleErrorDefault));
}
  private handleErrorDefault(error: HttpErrorResponse) {
  return throwError(() => error.error);
}
}
