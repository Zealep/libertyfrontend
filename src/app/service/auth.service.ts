import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResponse {
    token: string;
    usuarioId: number;
    username: string;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private url = environment.url;

    constructor(private http: HttpClient) { }

    login(credentials: LoginRequest): Observable<LoginResponse> {
        return this.http.post<LoginResponse>(`${this.url}/auth/login`, credentials)
            .pipe(
                tap(response => {
                    // Guardar el token y datos del usuario
                    localStorage.setItem('authToken', response.token);
                    localStorage.setItem('userId', response.usuarioId.toString());
                    localStorage.setItem('username', response.username);
                })
            );
    }

    logout(): void {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
    }

    isAuthenticated(): boolean {
        return !!localStorage.getItem('authToken');
    }

    getToken(): string | null {
        return localStorage.getItem('authToken');
    }

    getUserId(): number | null {
        const userId = localStorage.getItem('userId');
        return userId ? parseInt(userId, 10) : null;
    }

    getUsername(): string | null {
        return localStorage.getItem('username');
    }
}
