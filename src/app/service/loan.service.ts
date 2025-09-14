import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

import { catchError, throwError } from 'rxjs';
import { Loan } from '../model/loan';


@Injectable({
  providedIn: 'root'
})
export class LoanService {
    URL_BACKEND: string = `${environment.url_api}/loans`;

constructor(private http: HttpClient) { }

getAll() {
    return this.http.get<Loan[]>(`${this.URL_BACKEND}`)
    .pipe(catchError(this.handleErrorDefault));
 }

getById(id: number) {
    return this.http.get<Loan>(`${this.URL_BACKEND}/${id}`)
    .pipe(catchError(this.handleErrorDefault));

}

save(req: Loan) {
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
