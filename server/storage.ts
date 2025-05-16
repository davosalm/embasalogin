import { 
  AccessCode, InsertAccessCode, 
  Availability, InsertAvailability, 
  Booking, InsertBooking
} from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // Access Code operations
  getAccessCode(code: string): Promise<AccessCode | undefined>;
  createAccessCode(accessCode: InsertAccessCode): Promise<AccessCode>;
  listAccessCodes(): Promise<AccessCode[]>;
  updateAccessCode(id: number, updates: Partial<InsertAccessCode>): Promise<AccessCode | undefined>;
  deleteAccessCode(id: number): Promise<boolean>;
  
  // Availability operations
  getAvailability(id: number): Promise<Availability | undefined>;
  createAvailability(availability: InsertAvailability): Promise<Availability>;
  listAvailabilities(): Promise<Availability[]>;
  getAvailabilitiesByMonth(year: number, month: number): Promise<Availability[]>;
  updateAvailability(id: number, updates: Partial<InsertAvailability>): Promise<Availability | undefined>;
  deleteAvailability(id: number): Promise<boolean>;
  
  // Booking operations
  getBooking(id: number): Promise<Booking | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  listBookingsByUser(createdBy: string): Promise<Booking[]>;
  listBookingsByAvailability(availabilityId: number): Promise<Booking[]>;
  updateBookingStatus(id: number, status: string): Promise<Booking | undefined>;
}

// Importar a implementação TursoStorage
import { TursoStorage } from './turso-storage';

// ALTERAR ESTA LINHA: Em vez de usar o MemStorage, usamos o TursoStorage para persistência em banco de dados
export const storage = new TursoStorage();
