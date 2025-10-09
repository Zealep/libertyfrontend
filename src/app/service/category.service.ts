import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Category } from '../model/category';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root'
})
export class CategoryService {
    private readonly http = inject(HttpClient);
    URL_BACKEND: string = `${environment.url_api}/categories`;

    getAll(): Observable<Category[]> {
        return this.http.get<Category[]>(this.URL_BACKEND);
    }

    getByType(type: 'INCOME' | 'EXPENSE'): Observable<Category[]> {
        return this.http.get<Category[]>(`${this.URL_BACKEND}/type/${type}`);
    }

    getById(id: number): Observable<Category> {
        return this.http.get<Category>(`${this.URL_BACKEND}/${id}`);
    }

    save(category: Category): Observable<Category> {
        return this.http.post<Category>(this.URL_BACKEND, category);
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.URL_BACKEND}/${id}`);
    }
}
