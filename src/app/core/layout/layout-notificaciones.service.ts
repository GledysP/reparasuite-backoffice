import { Injectable, inject } from '@angular/core';
import {
  BehaviorSubject,
  EMPTY,
  Subject,
  catchError,
  exhaustMap,
  forkJoin,
  from,
  map,
  merge,
  mergeMap,
  of,
  startWith,
  timer,
  toArray,
} from 'rxjs';

import { AuthService } from '../services/auth.service';
import { OrdenesTrabajoService } from '../../features/ordenes-trabajo/ordenes-trabajo.service';
import { TicketsService } from '../../features/tickets/tickets.service';

import type {
  OtDetalle,
  OtListaItem,
  HistorialItem,
  MensajeOtDto,
  TicketBackofficeListaItem,
  TicketDetalleDto,
  TicketMensajeDto,
} from '../models/tipos';

export type RsNotifType =
  | 'PRESUPUESTO_ACEPTADO'
  | 'COMPROBANTE_SUBIDO'
  | 'TICKET_NUEVO'
  | 'MENSAJE_TICKET'
  | 'MENSAJE_OT';

export interface RsNotification {
  id: string;
  type: RsNotifType;
  title: string;
  subtitle: string;
  createdAt: string;
  timeLabel: string;
  unread: boolean;
  icon: string; // material-symbols-outlined
  route: string;
}

type SeenMap = Record<string, 1>;
type UpdatedMap = Record<string, string>;
type CursorMap = Record<string, string>;

interface State {
  otUpdated: UpdatedMap;
  otCursor: CursorMap;

  ticketUpdated: UpdatedMap;
  ticketCursor: CursorMap;

  seen: SeenMap;
}

@Injectable({ providedIn: 'root' })
export class LayoutNotificacionesService {
  private auth = inject(AuthService);
  private ots = inject(OrdenesTrabajoService);
  private tickets = inject(TicketsService);

  private readonly POLL_MS = 20_000;

  // Para capturar cosas aunque updatedAt no cambie (sin SSE):
  private readonly SOFT_SCAN_OT = 8;      // revisa top N OTs siempre
  private readonly SOFT_SCAN_TICKETS = 8; // revisa top N tickets siempre

  private readonly FORCE_FETCH_OT = 40;
  private readonly FORCE_FETCH_TICKETS = 40;

  private readonly MAX_NOTIFS = 60;
  private readonly MAX_SEEN = 900;

  private baselineReady = false;
  private forceNext = false;

  private manualRefresh$ = new Subject<void>();

  private notificationsSub = new BehaviorSubject<RsNotification[]>(this.loadInitialNotifs());
  notifications$ = this.notificationsSub.asObservable();

  unreadCount$ = this.notifications$.pipe(
    map((list) => list.reduce((acc, n) => acc + (n.unread ? 1 : 0), 0))
  );

  constructor() {
    merge(timer(0, this.POLL_MS), this.manualRefresh$.pipe(startWith(undefined)))
      .pipe(exhaustMap(() => this.tick$()))
      .subscribe();
  }

  /** Llamar al abrir el menú para forzar revisión */
  refreshNow(): void {
    this.forceNext = true;
    this.manualRefresh$.next();
  }

  markAllRead(): void {
    const list = this.notificationsSub.value.map((n) => ({ ...n, unread: false }));
    this.notificationsSub.next(list);
    this.saveNotifs(list);
  }

  markRead(id: string): void {
    const list = this.notificationsSub.value.map((n) => (n.id === id ? { ...n, unread: false } : n));
    this.notificationsSub.next(list);
    this.saveNotifs(list);
  }

  private tick$() {
    const token = this.auth.getToken();
    if (!token) return EMPTY;

    return forkJoin({
      otList: this.ots.listar({ page: 0, size: 60, sort: 'updatedAt,desc' }).pipe(
        catchError(() => of({ items: [], total: 0 } as any))
      ),
      ticketList: this.tickets.listar(0, 60).pipe(
        catchError(() => of({ items: [], total: 0 } as any))
      ),
    }).pipe(
      mergeMap(({ otList, ticketList }: any) => {
        const otItems: OtListaItem[] = otList?.items ?? [];
        const tkItems: TicketBackofficeListaItem[] = ticketList?.items ?? [];

        const state = this.loadState();

        // baseline: no spamear notifs viejas
        if (!this.baselineReady) {
          this.seedBaseline(state, otItems, tkItems);
          this.baselineReady = true;
          this.saveState(state);
          return EMPTY;
        }

        const force = this.forceNext;
        this.forceNext = false;

        // --- Tickets nuevos (solo 1 notificación, sin redundancias)
        const newTickets = tkItems.filter((t) => !state.ticketUpdated[t.id]);
        for (const t of newTickets) {
          state.ticketUpdated[t.id] = t.updatedAt;
          state.ticketCursor[t.id] = t.updatedAt;

          const notifId = `TICKET_NEW:${t.id}:${t.updatedAt}`;
          if (!state.seen[notifId]) {
            state.seen[notifId] = 1;
            const asunto = (t.asunto ?? '').trim();
            const extra = asunto ? ` • ${asunto}` : '';
            const cliente = t.clienteNombre ? `Cliente: ${t.clienteNombre}` : 'Nueva solicitud';

            this.pushNotif({
              id: notifId,
              type: 'TICKET_NUEVO',
              title: 'Nueva solicitud (Ticket)',
              subtitle: `${cliente}${extra}`,
              createdAt: t.updatedAt,
              timeLabel: this.relativeTime(t.updatedAt),
              unread: true,
              icon: 'inbox',
              route: `/tickets/${encodeURIComponent(t.id)}`,
            });
          }
        }

        // --- Targets (cambiados + soft scan + force)
        const otChanged = otItems.filter((it) => this.isUpdated(it.id, it.updatedAt, state.otUpdated));
        const tkChanged = tkItems.filter((it) => this.isUpdated(it.id, it.updatedAt, state.ticketUpdated));

        const otSoft = otItems.slice(0, this.SOFT_SCAN_OT);
        const tkSoft = tkItems.slice(0, this.SOFT_SCAN_TICKETS);

        const otTargets = force
          ? otItems.slice(0, this.FORCE_FETCH_OT)
          : this.uniqById([...otChanged, ...otSoft]);

        const ticketTargets = force
          ? tkItems.slice(0, this.FORCE_FETCH_TICKETS)
          : this.uniqById([...tkChanged, ...tkSoft]);

        return forkJoin({
          otDetails: otTargets.length
            ? from(otTargets).pipe(
                mergeMap((it) => this.ots.obtener(it.id).pipe(catchError(() => EMPTY)), 4),
                toArray()
              )
            : of([] as OtDetalle[]),

          ticketDetails: ticketTargets.length
            ? from(ticketTargets).pipe(
                mergeMap((it) => this.tickets.obtener(it.id).pipe(catchError(() => EMPTY)), 4),
                toArray()
              )
            : of([] as TicketDetalleDto[]),

          state: of(state),
        });
      }),
      map(({ otDetails, ticketDetails, state }: { otDetails: OtDetalle[]; ticketDetails: TicketDetalleDto[]; state: State }) => {
        this.processOtDetails(otDetails, state);
        this.processTicketDetails(ticketDetails, state);

        this.trimSeen(state.seen);
        this.saveState(state);

        return null;
      }),
      catchError(() => EMPTY)
    );
  }

  // =========================
  // OT (solo “recibo”: presupuesto, comprobante, y mensaje entrante)
  // =========================
  private processOtDetails(details: OtDetalle[], state: State): void {
    for (const ot of details) {
      if (!ot?.id) continue;

      state.otUpdated[ot.id] = ot.updatedAt;

      const codigo = ot.codigo || ot.id;

      const historial = Array.isArray(ot.historial) ? [...ot.historial] : [];
      historial.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

      const cursorIso = state.otCursor[ot.id];
      const cursorMs = cursorIso ? new Date(cursorIso).getTime() : 0;

      // eventos que realmente quieres (recibidos)
      const evPres = this.findEventAfter(historial, 'PRESUPUESTO_ACEPTADO', cursorMs);
      const evComp = this.findEventAfter(historial, 'PAGO_COMPROBANTE_SUBIDO', cursorMs);

      if (evPres) {
        const notifId = `OT:PRESUPUESTO_ACEPTADO:${ot.id}:${evPres.fecha}`;
        if (!state.seen[notifId]) {
          state.seen[notifId] = 1;
          this.pushNotif({
            id: notifId,
            type: 'PRESUPUESTO_ACEPTADO',
            title: 'Presupuesto aceptado',
            subtitle: `${codigo} • ${this.preview(evPres.descripcion ?? 'Aceptado por el cliente')}`,
            createdAt: evPres.fecha,
            timeLabel: this.relativeTime(evPres.fecha),
            unread: true,
            icon: 'task_alt',
            route: `/ordenes-trabajo/${encodeURIComponent(codigo)}?focus=presupuesto`,
          });
        }
      }

      if (evComp) {
        const notifId = `OT:PAGO_COMPROBANTE_SUBIDO:${ot.id}:${evComp.fecha}`;
        if (!state.seen[notifId]) {
          state.seen[notifId] = 1;
          this.pushNotif({
            id: notifId,
            type: 'COMPROBANTE_SUBIDO',
            title: 'Comprobante subido',
            subtitle: `${codigo} • ${this.preview(evComp.descripcion ?? 'El cliente subió comprobante')}`,
            createdAt: evComp.fecha,
            timeLabel: this.relativeTime(evComp.fecha),
            unread: true,
            icon: 'receipt_long',
            route: `/ordenes-trabajo/${encodeURIComponent(codigo)}?focus=pago`,
          });
        }
      }

      // Mensajes OT: SOLO entrantes (CLIENTE/PORTAL) y NO redundantes
      const msgs = (ot.mensajes ?? []).slice().sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      const newIncoming = msgs.filter((m) => new Date(m.createdAt).getTime() > cursorMs && this.isIncoming(m));

      for (const m of newIncoming) {
        // Evitar redundancia: si justo hay “Presupuesto aceptado” cerca, no notificar mensaje “ya acepté…”
        if (this.shouldSuppressOtMessage(m, evPres?.fecha ?? null, evComp?.fecha ?? null)) continue;

        const notifId = `OTMSG:${ot.id}:${m.id || m.createdAt}`;
        if (state.seen[notifId]) continue;
        state.seen[notifId] = 1;

        this.pushNotif({
          id: notifId,
          type: 'MENSAJE_OT',
          title: 'Nuevo mensaje',
          subtitle: `${codigo} • ${this.preview(m.contenido)}`,
          createdAt: m.createdAt,
          timeLabel: this.relativeTime(m.createdAt),
          unread: true,
          icon: 'chat',
          route: `/ordenes-trabajo/${encodeURIComponent(codigo)}?focus=mensajes`,
        });
      }

      // avanzar cursor
      const lastHist = historial.length ? historial[historial.length - 1].fecha : null;
      const lastMsg = msgs.length ? msgs[msgs.length - 1].createdAt : null;
      state.otCursor[ot.id] = this.maxIso(cursorIso, ot.updatedAt, lastHist, lastMsg) ?? (cursorIso || ot.updatedAt);
    }
  }

  private findEventAfter(historial: HistorialItem[], ev: string, afterMs: number): HistorialItem | null {
    const found = historial
      .filter((h) => String(h.evento ?? '').toUpperCase() === ev)
      .filter((h) => new Date(h.fecha).getTime() > afterMs)
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    return found.length ? found[0] : null;
  }

  private shouldSuppressOtMessage(m: MensajeOtDto, presIso: string | null, compIso: string | null): boolean {
    const txt = String(m.contenido ?? '').toLowerCase();
    const ms = new Date(m.createdAt).getTime();

    if (presIso) {
      const d = Math.abs(ms - new Date(presIso).getTime());
      if (d <= 3 * 60_000 && /presupuesto|acept/.test(txt)) return true;
    }

    if (compIso) {
      const d = Math.abs(ms - new Date(compIso).getTime());
      if (d <= 3 * 60_000 && /comprobante|pago|transfer/.test(txt)) return true;
    }

    return false;
  }

  // =========================
  // Tickets (solo “recibo”: mensaje entrante + ticket nuevo)
  // =========================
  private processTicketDetails(details: TicketDetalleDto[], state: State): void {
    for (const t of details) {
      if (!t?.id) continue;

      state.ticketUpdated[t.id] = t.updatedAt;

      const cursorIso = state.ticketCursor[t.id];
      const cursorMs = cursorIso ? new Date(cursorIso).getTime() : 0;

      // mensajes entrantes (CLIENTE/PORTAL) y NO redundantes
      const msgs: TicketMensajeDto[] = (t.mensajes ?? []).slice().sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      const newIncoming = msgs.filter((m) => new Date(m.createdAt).getTime() > cursorMs && this.isIncomingTicket(m));

      for (const m of newIncoming) {
        // Evitar redundancia: el mensaje inicial “Solicitud creada” NO lo notificamos (ya tienes TICKET_NUEVO)
        if (this.isInitialTicketSystemMessage(m)) continue;

        const notifId = `TKMSG:${t.id}:${m.id || m.createdAt}`;
        if (state.seen[notifId]) continue;
        state.seen[notifId] = 1;

        this.pushNotif({
          id: notifId,
          type: 'MENSAJE_TICKET',
          title: 'Mensaje en ticket',
          subtitle: `${t.clienteNombre ?? 'Cliente'} • ${this.preview(m.contenido)}`,
          createdAt: m.createdAt,
          timeLabel: this.relativeTime(m.createdAt),
          unread: true,
          icon: 'chat_bubble',
          route: `/tickets/${encodeURIComponent(t.id)}?focus=mensajes`,
        });
      }

      const lastMsg = msgs.length ? msgs[msgs.length - 1].createdAt : null;
      state.ticketCursor[t.id] = this.maxIso(cursorIso, t.updatedAt, lastMsg) ?? (cursorIso || t.updatedAt);
    }
  }

  private isInitialTicketSystemMessage(m: TicketMensajeDto): boolean {
    const txt = String(m.contenido ?? '').trim().toLowerCase();
    return txt === 'solicitud creada' || txt.startsWith('solicitud creada');
  }

  // =========================
  // “Solo recibo” filtros
  // =========================
  private isIncoming(m: MensajeOtDto): boolean {
    const tipo = String(m.remitenteTipo ?? '').toUpperCase();
    return tipo.includes('CLIENTE') || tipo.includes('PORTAL');
  }

  private isIncomingTicket(m: TicketMensajeDto): boolean {
    const tipo = String(m.remitenteTipo ?? '').toUpperCase();
    return tipo.includes('CLIENTE') || tipo.includes('PORTAL');
  }

  // =========================
  // Notifs list
  // =========================
  private pushNotif(n: RsNotification): void {
    const merged = [n, ...this.notificationsSub.value]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, this.MAX_NOTIFS);

    this.notificationsSub.next(merged);
    this.saveNotifs(merged);
  }

  private uniqById<T extends { id: string }>(arr: T[]): T[] {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const x of arr) {
      if (seen.has(x.id)) continue;
      seen.add(x.id);
      out.push(x);
    }
    return out;
  }

  private preview(text: string): string {
    const raw = (text ?? '').trim();
    if (!raw) return '—';
    return raw.length > 80 ? raw.slice(0, 80) + '…' : raw;
  }

  private relativeTime(iso: string): string {
    const ms = new Date(iso).getTime();
    const diff = Date.now() - ms;

    const min = Math.floor(diff / 60_000);
    if (min < 1) return 'Ahora';
    if (min < 60) return `Hace ${min} min`;

    const hr = Math.floor(min / 60);
    if (hr < 24) return `Hace ${hr} h`;

    const d = Math.floor(hr / 24);
    return `Hace ${d} día${d === 1 ? '' : 's'}`;
  }

  private maxIso(...isos: Array<string | null | undefined>): string | null {
    const times = isos
      .filter((x): x is string => !!x)
      .map((x) => new Date(x).getTime())
      .filter((t) => Number.isFinite(t));

    if (!times.length) return null;

    const max = Math.max(...times);
    return new Date(max).toISOString();
  }

  // =========================
  // Storage por usuario
  // =========================
  private getUserIdFromJwt(): string {
    const token = this.auth.getToken() ?? '';
    try {
      const payload = token.split('.')[1];
      const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      return String(json?.sub ?? 'anon');
    } catch {
      return 'anon';
    }
  }

  private key(base: string): string {
    return `${base}_${this.getUserIdFromJwt()}`;
  }

  private loadInitialNotifs(): RsNotification[] {
    return this.safeJsonParse<RsNotification[]>(localStorage.getItem(this.key('rs_notifs'))) ?? [];
  }

  private saveNotifs(list: RsNotification[]): void {
    this.safeSet(this.key('rs_notifs'), list);
  }

  private loadState(): State {
    return {
      otUpdated: this.safeJsonParse<UpdatedMap>(localStorage.getItem(this.key('rs_ot_updated'))) ?? {},
      otCursor: this.safeJsonParse<CursorMap>(localStorage.getItem(this.key('rs_ot_cursor'))) ?? {},

      ticketUpdated: this.safeJsonParse<UpdatedMap>(localStorage.getItem(this.key('rs_ticket_updated'))) ?? {},
      ticketCursor: this.safeJsonParse<CursorMap>(localStorage.getItem(this.key('rs_ticket_cursor'))) ?? {},

      seen: this.safeJsonParse<SeenMap>(localStorage.getItem(this.key('rs_notif_seen'))) ?? {},
    };
  }

  private saveState(s: State): void {
    this.safeSet(this.key('rs_ot_updated'), s.otUpdated);
    this.safeSet(this.key('rs_ot_cursor'), s.otCursor);
    this.safeSet(this.key('rs_ticket_updated'), s.ticketUpdated);
    this.safeSet(this.key('rs_ticket_cursor'), s.ticketCursor);
    this.safeSet(this.key('rs_notif_seen'), s.seen);
  }

  private seedBaseline(state: State, otItems: OtListaItem[], tkItems: TicketBackofficeListaItem[]) {
    otItems.forEach((it) => {
      state.otUpdated[it.id] = it.updatedAt;
      state.otCursor[it.id] = it.updatedAt;
    });

    tkItems.forEach((it) => {
      state.ticketUpdated[it.id] = it.updatedAt;
      state.ticketCursor[it.id] = it.updatedAt;
    });
  }

  private isUpdated(id: string, updatedAt: string, map: UpdatedMap): boolean {
    const prev = map[id];
    if (!prev) return true;
    return new Date(updatedAt).getTime() > new Date(prev).getTime();
  }

  private trimSeen(seen: SeenMap): void {
    const keys = Object.keys(seen);
    if (keys.length <= this.MAX_SEEN) return;
    const toRemove = keys.slice(0, keys.length - this.MAX_SEEN);
    toRemove.forEach((k) => delete seen[k]);
  }

  private safeJsonParse<T>(raw: string | null): T | null {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  private safeSet(key: string, value: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }
}