import { Component, HostListener, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';

import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';

import { AuthService } from '../services/auth.service';
import { CommandPaletteDialogComponent } from './command-palette.dialog';
import { LayoutNotificacionesService, RsNotification } from './layout-notificaciones.service';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  exact?: boolean;
}

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
    MatTooltipModule,
    MatBadgeModule,
    MatDialogModule,
    MatDividerModule,
  ],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss'],
})
export class LayoutComponent {
  @ViewChild('sidenav') sidenav!: MatSidenav;

  private breakpointObserver = inject(BreakpointObserver);
  private auth = inject(AuthService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private notifs = inject(LayoutNotificacionesService);

  isMobile = false;
  isCollapsed = false;
  mobileOpened = false;
  mobileSearchOpen = false;

  sessionState: 'active' | 'idle' = 'active';

  notifications$ = this.notifs.notifications$;
  unreadCount$ = this.notifs.unreadCount$;

  readonly navItems: NavItem[] = [
    { label: 'Panel', route: '/dashboard', icon: 'dashboard', exact: true },
    { label: 'Órdenes de trabajo', route: '/ordenes-trabajo', icon: 'assignment' },
    { label: 'Tickets', route: '/tickets', icon: 'confirmation_number' },
    { label: 'Clientes', route: '/clientes', icon: 'group' },
    { label: 'Equipos', route: '/equipos', icon: 'memory' },
    { label: 'Inventario', route: '/inventario', icon: 'inventory_2' },
    { label: 'Usuarios', route: '/usuarios', icon: 'engineering' },
    { label: 'Ajustes', route: '/ajustes/taller', icon: 'settings' },
  ];

  constructor() {
    this.breakpointObserver.observe([Breakpoints.Handset]).subscribe((result) => {
      this.isMobile = result.matches;

      if (this.isMobile) {
        this.mobileOpened = false;
        this.isCollapsed = false;
        this.mobileSearchOpen = false;
      } else {
        this.mobileSearchOpen = false;
      }
    });
  }

  get sessionLabel(): string {
    return this.sessionState === 'active' ? 'Sesión activa' : 'Sesión inactiva';
  }

  getSessionAvatarClass(): string {
    return this.sessionState === 'active' ? 'is-session-active' : 'is-session-idle';
  }

  toggleMenu(): void {
    if (this.isMobile) {
      this.mobileOpened = !this.mobileOpened;
      this.sidenav.toggle();
      return;
    }
    this.isCollapsed = !this.isCollapsed;
  }

  closeMobileSidenav(): void {
    if (!this.isMobile) return;
    this.mobileOpened = false;
    this.sidenav.close();
  }

  openMobileSearch(): void {
    if (!this.isMobile) return;
    this.mobileSearchOpen = true;
  }

  closeMobileSearch(): void {
    this.mobileSearchOpen = false;
  }

  openCommandPalette(): void {
    if (this.dialog.openDialogs.length) return;

    this.dialog.open(CommandPaletteDialogComponent, {
      panelClass: 'rs-cmdk-dialog',
      autoFocus: false,
      width: '560px',
      maxWidth: '92vw',
      data: { navItems: this.navItems },
    });
  }

  refreshNotifications(): void {
    this.notifs.refreshNow();
  }

  markAllRead(): void {
    this.notifs.markAllRead();
  }

  openNotification(n: RsNotification): void {
    this.notifs.markRead(n.id);
    this.router.navigateByUrl(n.route);
  }

  goToMyProfile(): void {
    this.router.navigateByUrl('/mi-perfil');
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  @HostListener('window:focus')
  onWindowFocus(): void {
    this.sessionState = 'active';
  }

  @HostListener('window:blur')
  onWindowBlur(): void {
    this.sessionState = 'idle';
  }

  @HostListener('window:keydown', ['$event'])
  onGlobalKeydown(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    const isCmdK = (e.ctrlKey || e.metaKey) && key === 'k';
    if (isCmdK) {
      e.preventDefault();
      this.openCommandPalette();
    }
  }
}