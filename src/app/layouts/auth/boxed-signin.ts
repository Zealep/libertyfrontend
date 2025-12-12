import { Component } from '@angular/core';
import { toggleAnimation } from 'src/app/shared/animations';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { AppService } from 'src/app/service/app.service';
import { AuthService } from 'src/app/service/auth.service';
import { ToastService } from 'src/app/service/toast.service';
import { SharedModule } from "src/shared.module";
import { CommonModule } from '@angular/common';

@Component({
    templateUrl: './boxed-signin.html',
    animations: [toggleAnimation],
    standalone: true,
    imports: [SharedModule,CommonModule],
})
export class BoxedSigninComponent {
    store: any;
    username: string = '';
    password: string = '';
    isLoading: boolean = false;

    constructor(
        public translate: TranslateService,
        public storeData: Store<any>,
        public router: Router,
        private appSetting: AppService,
        private authService: AuthService,
        private toast: ToastService
    ) {
        this.initStore();
    }
    async initStore() {
        this.storeData
            .select((d) => d.index)
            .subscribe((d) => {
                this.store = d;
            });
    }

    onSubmit(event: Event) {
        event.preventDefault();

        if (!this.username || !this.password) {
            this.toast.showMessage('Por favor ingrese usuario y contraseña', 'error');
            return;
        }

        this.isLoading = true;

        this.authService.login({
            username: this.username,
            password: this.password
        }).subscribe({
            next: (response) => {
                this.toast.showMessage(`Bienvenido ${response.username}!`, 'success');
                // Redirigir al dashboard principal
                this.router.navigate(['/finance']);
            },
            error: (error) => {
                console.error('Error en login:', error);
                this.toast.showMessage('Usuario o contraseña incorrectos', 'error');
                this.isLoading = false;
            },
            complete: () => {
                this.isLoading = false;
            }
        });
    }
}
