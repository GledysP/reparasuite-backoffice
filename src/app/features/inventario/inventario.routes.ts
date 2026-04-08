import { Routes } from '@angular/router';

import { InventarioListComponent } from './inventario-list/inventario-list.component';
import { InventarioFormComponent } from './inventario-form/inventario-form.component';
import { InventarioDetalleComponent } from './inventario-detalle/inventario-detalle.component';

export const INVENTARIO_ROUTES: Routes = [
  { path: '', component: InventarioListComponent },
  { path: 'nuevo', component: InventarioFormComponent },
  { path: ':id', component: InventarioDetalleComponent },
  { path: ':id/editar', component: InventarioFormComponent },
];

