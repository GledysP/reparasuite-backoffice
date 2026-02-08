import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgFor, DatePipe, NgIf } from '@angular/common';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { ClientesService } from '../clientes.service';
import { ClienteResumen } from '../../../core/models/tipos';

@Component({
  selector: 'rs-clientes-list',
  standalone: true,
  imports: [
    NgFor, NgIf, DatePipe, RouterLink, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatTableModule, 
    MatPaginatorModule, MatIconModule, MatButtonModule
  ],
  templateUrl: './clientes-list.component.html',
  styleUrl: './clientes-list.component.scss',
})
export class ClientesListComponent implements OnInit {
  private fb = inject(FormBuilder);
  private clientes = inject(ClientesService);

  displayedColumns = ['nombre', 'telefono', 'email', 'totalWos', 'lastWoDate', 'accion'];

  items: ClienteResumen[] = [];
  total = 0;
  page = 0;
  size = 10;

  form = this.fb.group({ query: [''] });

  ngOnInit(): void {
    this.cargar();
    this.form.valueChanges.subscribe(() => { this.page = 0; this.cargar(); });
  }

  cargar() {
    const q = this.form.getRawValue().query ?? '';
    this.clientes.listar(q, this.page, this.size).subscribe(res => {
      this.items = res.items;
      this.total = res.total;
    });
  }

  paginar(e: PageEvent) {
    this.page = e.pageIndex;
    this.size = e.pageSize;
    this.cargar();
  }

  eliminar(row: any) {
    console.log('Eliminar ID:', row.id);
  }
}