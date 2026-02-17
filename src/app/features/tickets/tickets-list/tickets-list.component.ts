import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { TicketsService, TicketBackofficeListaItem } from '../tickets.service';

@Component({
  selector: 'rs-tickets-list',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatProgressBarModule
  ],
  templateUrl: './tickets-list.component.html',
  styleUrl: './tickets-list.component.scss'
})
export class TicketsListComponent implements OnInit {
  private ticketsService = inject(TicketsService);

  loading = false;

  items: TicketBackofficeListaItem[] = [];
  total = 0;
  page = 0;
  size = 20;

  displayedColumns = ['cliente', 'asunto', 'estado', 'updatedAt', 'accion'];

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.ticketsService.listar(this.page, this.size).subscribe({
      next: (res) => {
        this.items = res.items ?? [];
        this.total = res.total ?? 0;
      },
      error: (e) => console.error('Error tickets:', e),
      complete: () => (this.loading = false)
    });
  }

  paginar(e: PageEvent): void {
    this.page = e.pageIndex;
    this.size = e.pageSize;
    this.cargar();
  }
}
