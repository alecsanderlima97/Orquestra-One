export type SectionId = "overview" | "agenda" | "orders" | "finance" | "stock" | "clients" | "suppliers" | "reports" | "team" | "settings";

export type AppointmentStatus = "confirmed" | "pending" | "in_progress";

export type Appointment = {
  id: string;
  time: string;
  duration: string;
  client: string;
  service: string;
  address: string;
  status: AppointmentStatus;
  professional: string;
};

export type WorkOrderStatus = "in_progress" | "waiting" | "completed";

export type WorkOrder = {
  id: string;
  client: string;
  service: string;
  professional: string;
  amountCents: number;
  status: WorkOrderStatus;
  updatedAt: string;
};

export type FinanceItem = {
  id: string;
  title: string;
  party: string;
  dueDate: string;
  amountCents: number;
  type: "receivable" | "payable";
  status: "open" | "overdue" | "paid";
};

export type StockItem = {
  id: string;
  name: string;
  category: "consumable" | "resale" | "tool";
  quantity: number;
  unit: string;
  minimum: number;
  location: string;
};
