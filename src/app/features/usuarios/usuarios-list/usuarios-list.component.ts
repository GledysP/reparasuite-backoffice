import { Component, OnInit } from '@angular/core';
import { NgFor } from '@angular/common';

import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';

import { UsuariosService } from '../usuarios.service';
import { UsuarioResumen } from '../../../core/models/tipos';

@Component({
  selector: 'rs-usuarios-list',
  standalone: true,
  imports: [NgFor, MatCardModule, MatTableModule],
  templateUrl: './usuarios-list.component.html',
  styleUrl: './usuarios-list.component.scss',
})
export class UsuariosListComponent implements OnInit {
  displayedColumns = ['nombre','rol','activo'];
  items: UsuarioResumen[] = [];

  constructor(private usuarios: UsuariosService) {}

  ngOnInit(): void {
    this.usuarios.listar().subscribe(res => this.items = res);
  }
}
