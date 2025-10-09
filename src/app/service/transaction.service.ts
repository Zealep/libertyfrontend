import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Transaction } from '../model/transaction';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root'
})
export class TransactionService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.url_api}/transactions`;

    getAll(): Observable<Transaction[]> {
        return this.http.get<Transaction[]>(this.baseUrl);
    }

    getByDateRange(startDate: string, endDate: string): Observable<Transaction[]> {
        return this.http.get<Transaction[]>(`${this.baseUrl}/range?start=${startDate}&end=${endDate}`);
    }

    getByType(type: 'INCOME' | 'EXPENSE'): Observable<Transaction[]> {
        return this.http.get<Transaction[]>(`${this.baseUrl}/type/${type}`);
    }

    getById(id: number): Observable<Transaction> {
        return this.http.get<Transaction>(`${this.baseUrl}/${id}`);
    }

    save(transaction: Transaction): Observable<Transaction> {
        return this.http.post<Transaction>(this.baseUrl, transaction);
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }

    getMonthlyReport(year: number, month: number): Observable<any> {
        return this.http.get(`${this.baseUrl}/report/monthly?year=${year}&month=${month}`);
    }

    getYearlyReport(year: number): Observable<any> {
        return this.http.get(`${this.baseUrl}/report/yearly?year=${year}`);
    }
}
