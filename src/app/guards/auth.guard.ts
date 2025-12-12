import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { CanActivateFn } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
    const router = inject(Router);

    // Aquí verificas si hay un token o sesión activa
    // Por ahora, verifico localStorage, ajusta según tu implementación
    const token = localStorage.getItem('authToken');

    if (token) {
        return true; // Usuario autenticado, permite el acceso
    } else {
        // No autenticado, redirige al login
        router.navigate(['/auth/signin']);
        return false;
    }
};
