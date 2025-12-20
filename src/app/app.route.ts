import { Routes } from '@angular/router';

// dashboard
import { IndexComponent } from './index';
import { AppLayout } from './layouts/app-layout';
import { AuthLayout } from './layouts/auth-layout';
import { BoxedSigninComponent } from './layouts/auth/boxed-signin';
import { BoxedSignupComponent } from './layouts/auth/boxed-signup';
import { BoxedLockscreenComponent } from './layouts/auth/boxed-lockscreen';
import { BoxedPasswordResetComponent } from './layouts/auth/boxed-password-reset';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
    // Ruta raíz - redirige al login
    {
        path: '',
        redirectTo: 'login/signin',
        pathMatch: 'full'
    },

    // Rutas de autenticación (sin layout de la app)
    {
        path: 'login',
        component: BoxedSigninComponent,
        children: [
            {
                path: 'signin',
                component: BoxedSigninComponent,
            },
            {
                path: 'signup',
                component: BoxedSignupComponent,
            },
            {
                path: 'lockscreen',
                component: BoxedLockscreenComponent,
            },
            {
                path: 'password-reset',
                component: BoxedPasswordResetComponent,
            },
        ],
    },

    // Rutas de la aplicación (con layout completo: header, sidebar, etc.)
    // Protegidas con authGuard
    {
        path: '',
        component: AppLayout,
        canActivate: [authGuard],
        children: [
            // Dashboard de finanzas
            {
                path: 'finance',
                loadComponent: () => import('./screens/finance/finance-dashboard/finance-dashboard.component').then((c) => c.FinanceDashboardComponent),
            },
            {
                path: 'finance/transactions',
                loadComponent: () => import('./screens/finance/transactions-list/transactions-list.component').then((c) => c.TransactionsListComponent),
            },
            {
                path: 'finance/transactions/form',
                loadComponent: () => import('./screens/finance/transactions-form/transactions-form.component').then((c) => c.TransactionsFormComponent),
            },
            {
                path: 'finance/import',
                loadComponent: () => import('./screens/finance/import-transactions/import-transactions.component').then((c) => c.ImportTransactionsComponent),
            },

            // Préstamos
            {
                path: 'loans',
                loadComponent: () => import('./screens/loan/loans-list/loans-list.component').then((c) => c.LoansListComponent),
            },
            {
                path: 'loans/:id',
                loadComponent: () => import('./screens/loan/loan-details/loan-details.component').then((c) => c.LoanDetailsComponent),
            },
            {
                path: 'loan/form',
                loadComponent: () => import('./screens/loan/loans-form/loans-form.component').then((c) => c.LoansFormComponent),
            },

            // Clientes
            {
                path: 'customers',
                loadComponent: () => import('./screens/customer/customers-list/customers-list.component').then((c) => c.CustomersListComponent),
            },

            // Categorías
            {
                path: 'categories',
                loadComponent: () => import('./screens/category/categories-list/categories-list.component').then((c) => c.CategoriesListComponent),
            }
        ],
    },

    // Ruta 404 - redirige al signin si no encuentra la ruta
    {
        path: '**',
        redirectTo: 'login/signin',
    },
];
