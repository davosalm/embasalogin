import { tursoClient } from "./turso-db";
import { 
  AccessCode, InsertAccessCode, 
  Availability, InsertAvailability,
  Booking, InsertBooking
} from "@shared/schema";
import { IStorage } from "./storage";

export class TursoStorage implements IStorage {
  // Access Code operations
  async getAccessCode(code: string): Promise<AccessCode | undefined> {
    try {
      console.log(`Tentando buscar código de acesso: ${code}`);
      
      const result = await tursoClient.execute({
        sql: `SELECT * FROM access_codes WHERE code = ? AND active = 1`,
        args: [code]
      });

      console.log(`Resultado da busca de código de acesso:`, {
        rowCount: result.rows.length,
        resultData: result.rows.length > 0 ? result.rows[0] : null
      });

      if (result.rows.length === 0) {
        console.log(`Nenhum código de acesso encontrado para: ${code}`);
        return undefined;
      }

      const row = result.rows[0];
      return {
        id: Number(row.id),
        code: String(row.code),
        role: String(row.role),
        location: row.location ? String(row.location) : "",
        createdAt: String(row.created_at),
        active: Boolean(row.active)
      };
    } catch (error) {
      console.error(`ERRO ao buscar código de acesso ${code}:`, error);
      return undefined;
    }
  }

  async createAccessCode(accessCode: InsertAccessCode): Promise<AccessCode> {
    try {
      const result = await tursoClient.execute({
        sql: `INSERT INTO access_codes (code, role, location, active) VALUES (?, ?, ?, ?) RETURNING *`,
        args: [
          accessCode.code, 
          accessCode.role, 
          accessCode.location || "", 
          accessCode.active
        ]
      });

      const row = result.rows[0];
      return {
        id: Number(row.id),
        code: String(row.code),
        role: String(row.role),
        location: row.location ? String(row.location) : "",
        createdAt: String(row.created_at),
        active: Boolean(row.active)
      };
    } catch (error) {
      console.error("Erro ao criar código de acesso:", error);
      throw error;
    }
  }

  async listAccessCodes(): Promise<AccessCode[]> {
    try {
      const result = await tursoClient.execute(`SELECT * FROM access_codes ORDER BY created_at DESC`);

      return result.rows.map(row => ({
        id: Number(row.id),
        code: String(row.code),
        role: String(row.role),
        location: row.location ? String(row.location) : "",
        createdAt: String(row.created_at),
        active: Boolean(row.active)
      }));
    } catch (error) {
      console.error("Erro ao listar códigos de acesso:", error);
      return [];
    }
  }

  async updateAccessCode(id: number, updates: Partial<InsertAccessCode>): Promise<AccessCode | undefined> {
    try {
      const setClauses = [];
      const args = [];

      if (updates.code !== undefined) {
        setClauses.push("code = ?");
        args.push(updates.code);
      }

      if (updates.role !== undefined) {
        setClauses.push("role = ?");
        args.push(updates.role);
      }

      if (updates.location !== undefined) {
        setClauses.push("location = ?");
        args.push(updates.location);
      }

      if (updates.active !== undefined) {
        setClauses.push("active = ?");
        args.push(updates.active);
      }

      if (setClauses.length === 0) {
        return undefined;
      }

      args.push(id);

      const result = await tursoClient.execute({
        sql: `UPDATE access_codes SET ${setClauses.join(", ")} WHERE id = ? RETURNING *`,
        args
      });

      if (result.rows.length === 0) {
        return undefined;
      }

      const row = result.rows[0];
      return {
        id: Number(row.id),
        code: String(row.code),
        role: String(row.role),
        location: row.location ? String(row.location) : "",
        createdAt: String(row.created_at),
        active: Boolean(row.active)
      };
    } catch (error) {
      console.error("Erro ao atualizar código de acesso:", error);
      return undefined;
    }
  }

  async deleteAccessCode(id: number): Promise<boolean> {
    try {
      const result = await tursoClient.execute({
        sql: `DELETE FROM access_codes WHERE id = ?`,
        args: [id]
      });

      return result.rowsAffected > 0;
    } catch (error) {
      console.error("Erro ao deletar código de acesso:", error);
      return false;
    }
  }

  // Availability operations
  async getAvailability(id: number): Promise<Availability | undefined> {
    try {
      const result = await tursoClient.execute({
        sql: `SELECT * FROM availabilities WHERE id = ?`,
        args: [id]
      });

      if (result.rows.length === 0) {
        return undefined;
      }

      const row = result.rows[0];
      return {
        id: Number(row.id),
        date: String(row.date),
        startTime: String(row.start_time),
        endTime: String(row.end_time),
        capacity: Number(row.capacity),
        remainingSlots: Number(row.remaining_slots),
        createdBy: String(row.created_by),
        createdAt: String(row.created_at)
      };
    } catch (error) {
      console.error("Erro ao buscar disponibilidade:", error);
      return undefined;
    }
  }

  async createAvailability(availability: InsertAvailability): Promise<Availability> {
    try {
      // Validar que o horário não excede 2 horas
      const startHour = parseInt(availability.startTime.split(':')[0]);
      const startMinute = parseInt(availability.startTime.split(':')[1]);
      const endHour = parseInt(availability.endTime.split(':')[0]);
      const endMinute = parseInt(availability.endTime.split(':')[1]);
      
      const startTotalMinutes = startHour * 60 + startMinute;
      const endTotalMinutes = endHour * 60 + endMinute;
      
      // Diferença em minutos entre início e fim
      const diffMinutes = endTotalMinutes - startTotalMinutes;
      
      // Se diferença for maior que 120 minutos (2 horas), lançar erro
      if (diffMinutes > 120) {
        throw new Error("Horários não podem exceder 2 horas de intervalo");
      }

      const result = await tursoClient.execute({
        sql: `INSERT INTO availabilities (date, start_time, end_time, capacity, remaining_slots, created_by) 
              VALUES (?, ?, ?, ?, ?, ?) RETURNING *`,
        args: [
          availability.date, 
          availability.startTime, 
          availability.endTime,
          availability.capacity,
          availability.remainingSlots || availability.capacity,
          availability.createdBy
        ]
      });

      const row = result.rows[0];
      return {
        id: Number(row.id),
        date: String(row.date),
        startTime: String(row.start_time),
        endTime: String(row.end_time),
        capacity: Number(row.capacity),
        remainingSlots: Number(row.remaining_slots),
        createdBy: String(row.created_by),
        createdAt: String(row.created_at)
      };
    } catch (error) {
      console.error("Erro ao criar disponibilidade:", error);
      throw error;
    }
  }

  async listAvailabilities(): Promise<Availability[]> {
    try {
      const result = await tursoClient.execute(`SELECT * FROM availabilities ORDER BY date ASC, start_time ASC`);

      return result.rows.map(row => ({
        id: Number(row.id),
        date: String(row.date),
        startTime: String(row.start_time),
        endTime: String(row.end_time),
        capacity: Number(row.capacity),
        remainingSlots: Number(row.remaining_slots),
        createdBy: String(row.created_by),
        createdAt: String(row.created_at)
      }));
    } catch (error) {
      console.error("Erro ao listar disponibilidades:", error);
      return [];
    }
  }

  async getAvailabilitiesByMonth(year: number, month: number): Promise<Availability[]> {
    try {
      // No SQLite, usamos a função strftime para manipular datas
      // Ao invés de filtragem complexa de data, usamos a filtragem pelo início do formato de data YYYY-MM
      const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
      
      const result = await tursoClient.execute({
        sql: `SELECT * FROM availabilities WHERE date LIKE ?||'%' ORDER BY date ASC, start_time ASC`,
        args: [monthPrefix]
      });

      return result.rows.map(row => ({
        id: Number(row.id),
        date: String(row.date),
        startTime: String(row.start_time),
        endTime: String(row.end_time),
        capacity: Number(row.capacity),
        remainingSlots: Number(row.remaining_slots),
        createdBy: String(row.created_by),
        createdAt: String(row.created_at)
      }));
    } catch (error) {
      console.error("Erro ao listar disponibilidades por mês:", error);
      return [];
    }
  }

  async updateAvailability(id: number, updates: Partial<InsertAvailability>): Promise<Availability | undefined> {
    try {
      const setClauses = [];
      const args = [];

      if (updates.date !== undefined) {
        setClauses.push("date = ?");
        args.push(updates.date);
      }

      if (updates.startTime !== undefined) {
        setClauses.push("start_time = ?");
        args.push(updates.startTime);
      }

      if (updates.endTime !== undefined) {
        setClauses.push("end_time = ?");
        args.push(updates.endTime);
      }

      if (updates.capacity !== undefined) {
        setClauses.push("capacity = ?");
        args.push(updates.capacity);
      }

      if (updates.remainingSlots !== undefined) {
        setClauses.push("remaining_slots = ?");
        args.push(updates.remainingSlots);
      }

      if (setClauses.length === 0) {
        return undefined;
      }

      args.push(id);

      const result = await tursoClient.execute({
        sql: `UPDATE availabilities SET ${setClauses.join(", ")} WHERE id = ? RETURNING *`,
        args
      });

      if (result.rows.length === 0) {
        return undefined;
      }

      const row = result.rows[0];
      return {
        id: Number(row.id),
        date: String(row.date),
        startTime: String(row.start_time),
        endTime: String(row.end_time),
        capacity: Number(row.capacity),
        remainingSlots: Number(row.remaining_slots),
        createdBy: String(row.created_by),
        createdAt: String(row.created_at)
      };
    } catch (error) {
      console.error("Erro ao atualizar disponibilidade:", error);
      return undefined;
    }
  }

  async deleteAvailability(id: number): Promise<boolean> {
    try {
      const result = await tursoClient.execute({
        sql: `DELETE FROM availabilities WHERE id = ?`,
        args: [id]
      });

      return result.rowsAffected > 0;
    } catch (error) {
      console.error("Erro ao deletar disponibilidade:", error);
      return false;
    }
  }

  // Booking operations
  async getBooking(id: number): Promise<Booking | undefined> {
    try {
      const result = await tursoClient.execute({
        sql: `SELECT * FROM bookings WHERE id = ?`,
        args: [id]
      });

      if (result.rows.length === 0) {
        return undefined;
      }

      const row = result.rows[0];
      return {
        id: Number(row.id),
        availabilityId: Number(row.availability_id),
        clientName: String(row.client_name),
        clientDocument: row.client_document ? String(row.client_document) : "",
        clientPhone: row.client_phone ? String(row.client_phone) : "",
        serviceNumber: row.service_number ? String(row.service_number) : "",
        timeSlot: String(row.time_slot),
        comments: row.comments ? String(row.comments) : "",
        createdBy: String(row.created_by),
        createdAt: String(row.created_at),
        status: String(row.status)
      };
    } catch (error) {
      console.error("Erro ao buscar agendamento:", error);
      return undefined;
    }
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    try {
      // Verificar se ainda existem vagas disponíveis
      const availability = await this.getAvailability(booking.availabilityId);
      if (!availability) {
        throw new Error("Disponibilidade não encontrada");
      }

      if (availability.remainingSlots <= 0) {
        throw new Error("Não há mais vagas disponíveis neste horário");
      }

      // Criar o agendamento
      const result = await tursoClient.execute({
        sql: `INSERT INTO bookings (
                availability_id, client_name, client_document, client_phone, 
                service_number, time_slot, comments, created_by, status
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
        args: [
          booking.availabilityId,
          booking.clientName,
          booking.clientDocument || "",
          booking.clientPhone || "",
          booking.serviceNumber || "",
          booking.timeSlot,
          booking.comments || "",
          booking.createdBy,
          booking.status || "confirmed"
        ]
      });

      // Atualizar as vagas disponíveis
      await this.updateAvailability(booking.availabilityId, {
        remainingSlots: availability.remainingSlots - 1
      });

      const row = result.rows[0];
      return {
        id: Number(row.id),
        availabilityId: Number(row.availability_id),
        clientName: String(row.client_name),
        clientDocument: row.client_document ? String(row.client_document) : "",
        clientPhone: row.client_phone ? String(row.client_phone) : "",
        serviceNumber: row.service_number ? String(row.service_number) : "",
        timeSlot: String(row.time_slot),
        comments: row.comments ? String(row.comments) : "",
        createdBy: String(row.created_by),
        createdAt: String(row.created_at),
        status: String(row.status)
      };
    } catch (error) {
      console.error("Erro ao criar agendamento:", error);
      throw error;
    }
  }

  async listBookingsByUser(createdBy: string): Promise<Booking[]> {
    try {
      const result = await tursoClient.execute({
        sql: `SELECT * FROM bookings WHERE created_by = ? ORDER BY created_at DESC`,
        args: [createdBy]
      });

      return result.rows.map(row => ({
        id: Number(row.id),
        availabilityId: Number(row.availability_id),
        clientName: String(row.client_name),
        clientDocument: row.client_document ? String(row.client_document) : "",
        clientPhone: row.client_phone ? String(row.client_phone) : "",
        serviceNumber: row.service_number ? String(row.service_number) : "",
        timeSlot: String(row.time_slot),
        comments: row.comments ? String(row.comments) : "",
        createdBy: String(row.created_by),
        createdAt: String(row.created_at),
        status: String(row.status)
      }));
    } catch (error) {
      console.error("Erro ao listar agendamentos por usuário:", error);
      return [];
    }
  }

  async listBookingsByAvailability(availabilityId: number): Promise<Booking[]> {
    try {
      const result = await tursoClient.execute({
        sql: `SELECT * FROM bookings WHERE availability_id = ? ORDER BY created_at DESC`,
        args: [availabilityId]
      });

      return result.rows.map(row => ({
        id: Number(row.id),
        availabilityId: Number(row.availability_id),
        clientName: String(row.client_name),
        clientDocument: row.client_document ? String(row.client_document) : "",
        clientPhone: row.client_phone ? String(row.client_phone) : "",
        serviceNumber: row.service_number ? String(row.service_number) : "",
        timeSlot: String(row.time_slot),
        comments: row.comments ? String(row.comments) : "",
        createdBy: String(row.created_by),
        createdAt: String(row.created_at),
        status: String(row.status)
      }));
    } catch (error) {
      console.error("Erro ao listar agendamentos por disponibilidade:", error);
      return [];
    }
  }

  async updateBookingStatus(id: number, status: string): Promise<Booking | undefined> {
    try {
      const result = await tursoClient.execute({
        sql: `UPDATE bookings SET status = ? WHERE id = ? RETURNING *`,
        args: [status, id]
      });

      if (result.rows.length === 0) {
        return undefined;
      }

      const row = result.rows[0];
      return {
        id: Number(row.id),
        availabilityId: Number(row.availability_id),
        clientName: String(row.client_name),
        clientDocument: row.client_document ? String(row.client_document) : "",
        clientPhone: row.client_phone ? String(row.client_phone) : "",
        serviceNumber: row.service_number ? String(row.service_number) : "",
        timeSlot: String(row.time_slot),
        comments: row.comments ? String(row.comments) : "",
        createdBy: String(row.created_by),
        createdAt: String(row.created_at),
        status: String(row.status)
      };
    } catch (error) {
      console.error("Erro ao atualizar status do agendamento:", error);
      return undefined;
    }
  }
}