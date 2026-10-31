export const AGENDA_MIN_SLOT = 30;

type Timed = { time: string; duration: string };
type Scheduled = Timed & { date: string; professional: string };

/** Minutos desde 00:00. A meia-noite (00:00) conta como 24h, fim do dia da agenda. */
export function startMinutes(appointment: Timed) {
  const [hours, minutes] = appointment.time.split(":").map(Number);
  return (hours === 0 ? 24 : hours) * 60 + minutes;
}

/** Aceita "1h", "1h 30", "45 min" e "Dia inteiro". */
export function lengthMinutes(appointment: Timed) {
  if (appointment.duration.toLowerCase().includes("dia")) return 8 * 60;
  const duration = appointment.duration.match(/(\d+)h(?:\s*(\d+))?/i);
  const minutesOnly = appointment.duration.match(/(\d+)\s*min/i);
  return Math.max(AGENDA_MIN_SLOT, Number(duration?.[1] ?? 0) * 60 + Number(duration?.[2] ?? minutesOnly?.[1] ?? 0));
}

/** Compromissos do mesmo responsavel, no mesmo dia, com horarios que se sobrepoem. */
export function findConflicts<T extends Scheduled & { id: string }>(target: Scheduled & { id?: string }, all: T[]): T[] {
  const start = startMinutes(target);
  const end = start + lengthMinutes(target);
  return all.filter((other) => {
    if (other.id === target.id || other.date !== target.date || other.professional !== target.professional) return false;
    const otherStart = startMinutes(other);
    return otherStart < end && start < otherStart + lengthMinutes(other);
  });
}

/** Data de hoje no fuso do navegador, no formato AAAA-MM-DD. */
export function todayDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
