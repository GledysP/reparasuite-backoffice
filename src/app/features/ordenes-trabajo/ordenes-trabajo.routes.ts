import { Routes } from '@angular/router';

import { OrdenesTrabajoListComponent } from './ordenes-trabajo-list/ordenes-trabajo-list.component';
import { OrdenesTrabajoNuevaComponent } from './ordenes-trabajo-nueva/ordenes-trabajo-nueva.component';
import { OrdenesTrabajoDetalleComponent } from './ordenes-trabajo-detalle/ordenes-trabajo-detalle.component';

export const ORDENES_TRABAJO_ROUTES: Routes = [
  { path: '', component: OrdenesTrabajoListComponent },
  { path: 'nueva', component: OrdenesTrabajoNuevaComponent },
  { path: ':id', component: OrdenesTrabajoDetalleComponent },
];

