import { Routes } from '@angular/router';

import { ClientesListComponent } from './clientes-list/clientes-list.component';
import { ClientesDetalleComponent } from './clientes-detalle/clientes-detalle.component';

export const CLIENTES_ROUTES: Routes = [
  { path: '', component: ClientesListComponent },
  { path: ':id', component: ClientesDetalleComponent },
];

