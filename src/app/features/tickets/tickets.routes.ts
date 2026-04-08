import { Routes } from '@angular/router';

import { TicketsListComponent } from './tickets-list/tickets-list.component';
import { TicketsDetalleComponent } from './tickets-detalle/tickets-detalle.component';

export const TICKETS_ROUTES: Routes = [
  { path: '', component: TicketsListComponent },
  { path: ':id', component: TicketsDetalleComponent },
];

