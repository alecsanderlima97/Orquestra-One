"use client";

import { useEffect, useState } from "react";
import type { AppointmentRecord } from "@/src/components/demo-data";

const LEAD_MINUTES = 30;
const SEEN_KEY = "orquestra-one-reminded";

function minutesUntil(appointment: AppointmentRecord, now: Date) {
  const [y, m, d] = appointment.date.split("-").map(Number);
  const [hh, mm] = appointment.time.split(":").map(Number);
  if (![y, m, d, hh, mm].every(Number.isFinite)) return Number.NaN;
  return (new Date(y, m - 1, d, hh, mm).getTime() - now.getTime()) / 60000;
}

function readSeen(): Set<string> {
  try { return new Set(JSON.parse(window.sessionStorage.getItem(SEEN_KEY) ?? "[]") as string[]); } catch { return new Set(); }
}
function writeSeen(seen: Set<string>) {
  try { window.sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-200))); } catch { /* sem armazenamento */ }
}

/** Agendamentos que começam nos próximos 30 minutos (recalcula a cada minuto). */
export function useUpcomingAppointments(appointments: AppointmentRecord[]) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  if (!now) return [];
  return appointments.filter((item) => {
    const left = minutesUntil(item, now);
    return left >= 0 && left <= LEAD_MINUTES;
  });
}

/**
 * Aviso do aparelho para o agendamento que vai começar, enquanto o One estiver aberto.
 * (Aviso com o app fechado precisa de push no servidor — fica para a integração de notificações.)
 */
export function useAppointmentNotifications(upcoming: AppointmentRecord[]) {
  useEffect(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted" || !upcoming.length) return;
    const seen = readSeen();
    for (const item of upcoming) {
      const key = `${item.id}@${item.date}T${item.time}`;
      if (seen.has(key)) continue;
      seen.add(key);
      try { new Notification(`Em breve: ${item.client} às ${item.time}`, { body: `${item.service} · ${item.professional}`, tag: key }); } catch { /* navegador sem suporte */ }
    }
    writeSeen(seen);
  }, [upcoming]);
}

export function NotificationPermissionButton() {
  const [state, setState] = useState<NotificationPermission | "unsupported" | null>(null);
  useEffect(() => { setState(typeof Notification === "undefined" ? "unsupported" : Notification.permission); }, []);
  if (state === null || state === "unsupported" || state === "granted") return null;
  if (state === "denied") return <p className="notification-empty">Avisos bloqueados neste navegador. Libere nas permissões do site.</p>;
  return <button className="secondary-button notification-permission" type="button" onClick={() => void Notification.requestPermission().then(setState)}>Avisar neste aparelho 30 min antes</button>;
}
