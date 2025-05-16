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

// In-memory storage implementation
export class MemStorage implements IStorage {
  private accessCodes: Map<number, AccessCode>;
  private availabilities: Map<number, Availability>;
  private bookings: Map<number, Booking>;
  
  private accessCodeCurrentId: number;
  private availabilityCurrentId: number;
  private bookingCurrentId: number;
  
  constructor() {
    this.accessCodes = new Map();
    this.availabilities = new Map();
    this.bookings = new Map();
    
    this.accessCodeCurrentId = 1;
    this.availabilityCurrentId = 1;
    this.bookingCurrentId = 1;
    
    // Initialize with default admin code
    this.createAccessCode({
      code: "ADM123456",
      role: "admin",
      active: true
    });
  }
  
  // Access Code operations
  async getAccessCode(code: string): Promise<AccessCode | undefined> {
    return Array.from(this.accessCodes.values()).find(
      (accessCode) => accessCode.code === code && accessCode.active
    );
  }
  
  async createAccessCode(accessCode: InsertAccessCode): Promise<AccessCode> {
    const id = this.accessCodeCurrentId++;
    const timestamp = new Date();
    const newAccessCode: AccessCode = { ...accessCode, id, createdAt: timestamp };
    this.accessCodes.set(id, newAccessCode);
    return newAccessCode;
  }
  
  async listAccessCodes(): Promise<AccessCode[]> {
    return Array.from(this.accessCodes.values());
  }
  
  async updateAccessCode(id: number, updates: Partial<InsertAccessCode>): Promise<AccessCode | undefined> {
    const accessCode = this.accessCodes.get(id);
    if (!accessCode) return undefined;
    
    const updatedAccessCode = { ...accessCode, ...updates };
    this.accessCodes.set(id, updatedAccessCode);
    return updatedAccessCode;
  }
  
  async deleteAccessCode(id: number): Promise<boolean> {
    const accessCode = this.accessCodes.get(id);
    if (!accessCode) return false;
    
    // Instead of deleting, mark as inactive
    accessCode.active = false;
    this.accessCodes.set(id, accessCode);
    return true;
  }
  
  // Availability operations
  async getAvailability(id: number): Promise<Availability | undefined> {
    return this.availabilities.get(id);
  }
  
  async createAvailability(availability: InsertAvailability): Promise<Availability> {
    const id = this.availabilityCurrentId++;
    const timestamp = new Date();
    const newAvailability: Availability = { ...availability, id, createdAt: timestamp };
    this.availabilities.set(id, newAvailability);
    return newAvailability;
  }
  
  async listAvailabilities(): Promise<Availability[]> {
    return Array.from(this.availabilities.values());
  }
  
  async getAvailabilitiesByMonth(year: number, month: number): Promise<Availability[]> {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    
    return Array.from(this.availabilities.values()).filter(availability => {
      const availDate = new Date(availability.date);
      return availDate >= firstDay && availDate <= lastDay;
    });
  }
  
  async updateAvailability(id: number, updates: Partial<InsertAvailability>): Promise<Availability | undefined> {
    const availability = this.availabilities.get(id);
    if (!availability) return undefined;
    
    const updatedAvailability = { ...availability, ...updates };
    this.availabilities.set(id, updatedAvailability);
    return updatedAvailability;
  }
  
  async deleteAvailability(id: number): Promise<boolean> {
    return this.availabilities.delete(id);
  }
  
  // Booking operations
  async getBooking(id: number): Promise<Booking | undefined> {
    return this.bookings.get(id);
  }
  
  async createBooking(booking: InsertBooking): Promise<Booking> {
    const id = this.bookingCurrentId++;
    const timestamp = new Date();
    
    // Decrement available slots in the availability
    const availability = this.availabilities.get(booking.availabilityId);
    if (availability && availability.remainingSlots > 0) {
      const updatedAvailability = { 
        ...availability, 
        remainingSlots: availability.remainingSlots - 1 
      };
      this.availabilities.set(availability.id, updatedAvailability);
    }
    
    const newBooking: Booking = { ...booking, id, createdAt: timestamp };
    this.bookings.set(id, newBooking);
    return newBooking;
  }
  
  async listBookingsByUser(createdBy: string): Promise<Booking[]> {
    return Array.from(this.bookings.values())
      .filter(booking => booking.createdBy === createdBy);
  }
  
  async listBookingsByAvailability(availabilityId: number): Promise<Booking[]> {
    return Array.from(this.bookings.values())
      .filter(booking => booking.availabilityId === availabilityId);
  }
  
  async updateBookingStatus(id: number, status: string): Promise<Booking | undefined> {
    const booking = this.bookings.get(id);
    if (!booking) return undefined;
    
    const updatedBooking = { ...booking, status };
    this.bookings.set(id, updatedBooking);
    return updatedBooking;
  }
}

// Export an instance of MemStorage for use in the routes
export const storage = new MemStorage();
