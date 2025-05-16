import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enum for user roles
export const userRoleEnum = pgEnum('user_role', ['admin', 'embasa', 'sac']);

// Access codes table
export const accessCodes = pgTable("access_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  role: userRoleEnum("role").notNull(),
  location: text("location"),  // Novo campo para localização (ex: SAC Cabula, EMBASA Federação)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  active: boolean("active").default(true).notNull(),
});

// Availability table - stores the dates and times EMBASA makes available
export const availabilities = pgTable("availabilities", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  startTime: text("start_time").notNull(), // Format: HH:MM
  endTime: text("end_time").notNull(), // Format: HH:MM
  capacity: integer("capacity").notNull(),
  createdBy: text("created_by").notNull(), // Access code of the EMBASA user who created it
  createdAt: timestamp("created_at").defaultNow().notNull(),
  remainingSlots: integer("remaining_slots").notNull(), // Decrements as bookings are made
});

// Bookings table - stores the appointments made by SAC users
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  availabilityId: integer("availability_id").notNull(),
  clientName: text("client_name").notNull(),
  clientDocument: text("client_document"), // CPF - agora opcional
  clientPhone: text("client_phone"), // Telefone - agora opcional
  serviceNumber: text("service_number").notNull(), // Número da SS - adicionado conforme solicitado
  timeSlot: text("time_slot").notNull(), // Format: HH:MM
  comments: text("comments"), // Comentários sobre a visita técnica
  createdBy: text("created_by").notNull(), // Access code of the SAC user who created it
  createdAt: timestamp("created_at").defaultNow().notNull(),
  status: text("status").default("confirmed").notNull(), // confirmed, cancelled, etc.
});

// Insert schemas
export const insertAccessCodeSchema = createInsertSchema(accessCodes).omit({ 
  id: true,
  createdAt: true,
});

export const insertAvailabilitySchema = createInsertSchema(availabilities).omit({ 
  id: true, 
  createdAt: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({ 
  id: true, 
  createdAt: true,
});

// Types
export type AccessCode = typeof accessCodes.$inferSelect;
export type InsertAccessCode = z.infer<typeof insertAccessCodeSchema>;

export type Availability = typeof availabilities.$inferSelect;
export type InsertAvailability = z.infer<typeof insertAvailabilitySchema>;

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;

// Extended schemas for form validation
export const loginSchema = z.object({
  accessCode: z.string().min(1, "Código de acesso é obrigatório"),
});

export const generateCodeSchema = insertAccessCodeSchema.extend({
  code: z.string().min(6, "Código deve ter pelo menos 6 caracteres"),
  location: z.string().min(1, "Localização é obrigatória"),
});

export const availabilityFormSchema = insertAvailabilitySchema.extend({
  date: z.string().min(1, "Data é obrigatória"),
  startTime: z.string().min(1, "Horário inicial é obrigatório"),
  endTime: z.string().min(1, "Horário final é obrigatório"),
  capacity: z.coerce.number().min(1, "Capacidade deve ser pelo menos 1"),
  remainingSlots: z.coerce.number().optional(),
});

export const bookingFormSchema = insertBookingSchema.extend({
  clientName: z.string().min(1, "Nome é obrigatório"),
  serviceNumber: z.string().min(1, "Número da SS é obrigatório"),
  timeSlot: z.string().min(1, "Horário é obrigatório"),
  comments: z.string().optional(),
  clientDocument: z.string().optional(),
  clientPhone: z.string().optional(),
});
