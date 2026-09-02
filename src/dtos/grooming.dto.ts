export type GroomingProfessionalDTO = {
  id: string;
  name: string;
  commissionPercent: number;
};

export type GroomingServiceDTO = {
  id: string;
  name: string;
  durationMinutes: number;
  defaultPrice: number;
};

export type GroomingCustomerDTO = {
  id: string;
  name: string;
  phone?: string | null;
  whatsapp?: string | null;
  pets: Array<{ id: string; name: string; species: string; breed?: string | null }>;
};

export type GroomingAppointmentDTO = {
  id: string;
  startAt: string;
  endAt: string;
  status: "SCHEDULED" | "CONFIRMED" | "IN_SERVICE" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  price: number;
  commissionAmount: number;
  isPackage: boolean;
  purchasedProducts: boolean;
  photoTaken: boolean;
  reminderSentAt?: string | null;
  notes?: string | null;
  customer: { id: string; name: string; phone?: string | null; whatsapp?: string | null };
  pet: { id: string; name: string; species: string; breed?: string | null };
  service: GroomingServiceDTO;
  professional: GroomingProfessionalDTO;
};

export type GroomingScheduleBlockDTO = {
  id: string;
  professionalId?: string | null;
  professionalName?: string | null;
  startAt: string;
  endAt: string;
  reason: string;
};

export type GroomingAgendaDTO = {
  date: string;
  professionals: GroomingProfessionalDTO[];
  services: GroomingServiceDTO[];
  customers: GroomingCustomerDTO[];
  appointments: GroomingAppointmentDTO[];
  blocks: GroomingScheduleBlockDTO[];
  reminders: GroomingAppointmentDTO[];
};

export type GroomingCalendarDTO = {
  month: string;
  appointments: Array<{ id: string; startAt: string; endAt: string; status: GroomingAppointmentDTO["status"] }>;
  blocks: GroomingScheduleBlockDTO[];
};
