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
                path: 'customers',
                loadComponent: () => import('./screens/customer/customers-list/customers-list.component').then((c) => c.CustomersListComponent),
            }

        ],
    },

    {
        path: 'login',
        component: AuthLayout,
        children: [],
    },
];
