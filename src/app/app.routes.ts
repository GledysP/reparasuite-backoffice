import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { LayoutComponent } from './core/layout/layout.component';

import { LoginComponent } from './auth/login/login.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';

import { UsuariosListComponent } from './features/usuarios/usuarios-list/usuarios-list.component';
import { AjustesTallerComponent } from './features/ajustes/ajustes-taller/ajustes-taller.component';

import { MiPerfilComponent } from './features/mi-perfil/mi-perfil.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },

  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: DashboardComponent },

      {
        path: 'ordenes-trabajo',
        loadChildren: () =>
          import('./features/ordenes-trabajo/ordenes-trabajo.routes').then(
            (m) => m.ORDENES_TRABAJO_ROUTES
          ),
      },

      {
        path: 'tickets',
        loadChildren: () =>
          import('./features/tickets/tickets.routes').then((m) => m.TICKETS_ROUTES),
      },

      {
        path: 'clientes',
        loadChildren: () =>
          import('./features/clientes/clientes.routes').then((m) => m.CLIENTES_ROUTES),
      },

      { path: 'usuarios', component: UsuariosListComponent },

      {
        path: 'equipos',
        loadChildren: () =>
          import('./features/equipos/equipos.routes').then((m) => m.EQUIPOS_ROUTES),
      },

      {
        path: 'inventario',
        loadChildren: () =>
          import('./features/inventario/inventario.routes').then((m) => m.INVENTARIO_ROUTES),
      },

      // ✅ NUEVO: MI PERFIL
      { path: 'mi-perfil', component: MiPerfilComponent },

      { path: 'ajustes/taller', component: AjustesTallerComponent },
    ],
  },

  { path: '**', redirectTo: '' },
];