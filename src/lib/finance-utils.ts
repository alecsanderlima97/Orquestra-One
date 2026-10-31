import type { FinanceRecord } from "@/src/components/demo-data";

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function formatDueDate(value: string) {
  return ISO_DATE.test(value) ? value.split("-").reverse().join("/") : value;
}

export function financeStatus(item: FinanceRecord, today: string): FinanceRecord["status"] {
  return item.status === "open" && ISO_DATE.test(item.dueDate) && item.dueDate < today ? "overdue" : item.status;
}
