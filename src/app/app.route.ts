import { Routes } from '@angular/router';

// dashboard
import { IndexComponent } from './index';
import { AppLayout } from './layouts/app-layout';
import { AuthLayout } from './layouts/auth-layout';

export const routes: Routes = [
    {
        path: '',
        component: AppLayout,
        children: [
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
                path: 'customers',
                loadComponent: () => import('./screens/customer/customers-list/customers-list.component').then((c) => c.CustomersListComponent),
            },
            {
                path: 'categories',
                loadComponent: () => import('./screens/category/categories-list/categories-list.component').then((c) => c.CategoriesListComponent),
            }

        ],
    },

    {
        path: 'login',
        component: AuthLayout,
        children: [],
    },
];
