import { Routes } from '@angular/router';

import { EquiposListComponent } from './equipos-list/equipos-list.component';
import { EquipoFormComponent } from './equipo-form/equipo-form.component';
import { EquipoDetalleComponent } from './equipo-detalle/equipo-detalle.component';

export const EQUIPOS_ROUTES: Routes = [
  { path: '', component: EquiposListComponent },
  { path: 'nuevo', component: EquipoFormComponent },
  { path: ':id', component: EquipoDetalleComponent },
  { path: ':id/editar', component: EquipoFormComponent },
];

