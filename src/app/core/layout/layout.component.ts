import { Component, inject, ViewChild } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';

import {
  MatSidenav,
  MatSidenavContainer,
  MatSidenavModule,
} from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { AuthService } from '../services/auth.service';

@Component({
  selector: 'rs-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
})
export class LayoutComponent {
  @ViewChild('sidenav') sidenav!: MatSidenav;
  @ViewChild(MatSidenavContainer) sidenavContainer!: MatSidenavContainer;

  private breakpointObserver = inject(BreakpointObserver);
  private auth = inject(AuthService);
  private router = inject(Router);

  isMobile = false;

  // Desktop: mini/full (NO cerramos el sidenav)
  isCollapsed = false;

  // Mobile: over abierto/cerrado real
  mobileOpened = false;

  // Anchos reales
  readonly FULL_W = 272;
  readonly MINI_W = 72;

  get sidebarWidth(): number {
    if (this.isMobile) return this.FULL_W;
    return this.isCollapsed ? this.MINI_W : this.FULL_W;
  }

  constructor() {
    this.breakpointObserver.observe([Breakpoints.Handset]).subscribe(result => {
      this.isMobile = result.matches;

      if (this.isMobile) {
        this.mobileOpened = false;
        // opcional: en móvil siempre full (mini no tiene sentido)
        this.isCollapsed = false;
      }

      // ✅ fuerza recálculo de márgenes cuando cambia breakpoint
      queueMicrotask(() => this.sidenavContainer?.updateContentMargins());
    });
  }

  toggleMenu() {
    if (this.isMobile) {
      this.mobileOpened = !this.mobileOpened;
      this.sidenav.toggle();
      return;
    }

    // Desktop: mini/full
    this.isCollapsed = !this.isCollapsed;

    // ✅ CLAVE: recalcular márgenes para que header/content NO se corten
    // (sin setTimeout largo -> no “lag raro”)
    queueMicrotask(() => this.sidenavContainer.updateContentMargins());
  }

  onSidenavClosed() {
    if (this.isMobile) this.mobileOpened = false;
  }

  closeMobileSidenav() {
    if (this.isMobile) {
      this.mobileOpened = false;
      this.sidenav.close();
    }
  }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
