import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { LayoutComponent } from './core/layout/layout.component';

import { LoginComponent } from './auth/login/login.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';

import { OrdenesTrabajoListComponent } from './features/ordenes-trabajo/ordenes-trabajo-list/ordenes-trabajo-list.component';
import { OrdenesTrabajoNuevaComponent } from './features/ordenes-trabajo/ordenes-trabajo-nueva/ordenes-trabajo-nueva.component';
import { OrdenesTrabajoDetalleComponent } from './features/ordenes-trabajo/ordenes-trabajo-detalle/ordenes-trabajo-detalle.component';

import { ClientesListComponent } from './features/clientes/clientes-list/clientes-list.component';
import { ClientesDetalleComponent } from './features/clientes/clientes-detalle/clientes-detalle.component';

import { UsuariosListComponent } from './features/usuarios/usuarios-list/usuarios-list.component';
import { AjustesTallerComponent } from './features/ajustes/ajustes-taller/ajustes-taller.component';

import { TicketsListComponent } from './features/tickets/tickets-list/tickets-list.component';
import { TicketsDetalleComponent } from './features/tickets/tickets-detalle/tickets-detalle.component';

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

      { path: 'ordenes-trabajo', component: OrdenesTrabajoListComponent },
      { path: 'ordenes-trabajo/nueva', component: OrdenesTrabajoNuevaComponent },
      { path: 'ordenes-trabajo/:id', component: OrdenesTrabajoDetalleComponent },

      { path: 'tickets', component: TicketsListComponent },
      { path: 'tickets/:id', component: TicketsDetalleComponent },

      { path: 'clientes', component: ClientesListComponent },
      { path: 'clientes/:id', component: ClientesDetalleComponent },

      { path: 'usuarios', component: UsuariosListComponent },

      // ✅ NUEVO: MI PERFIL
      { path: 'mi-perfil', component: MiPerfilComponent },

      { path: 'ajustes/taller', component: AjustesTallerComponent },
    ],
  },

  { path: '**', redirectTo: '' },
];