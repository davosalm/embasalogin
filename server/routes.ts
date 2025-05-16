import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import MemoryStore from "memorystore";
import { 
  insertAccessCodeSchema, 
  insertAvailabilitySchema, 
  insertBookingSchema,
  loginSchema
} from "@shared/schema";
import { z } from "zod";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  const MemoryStoreSession = MemoryStore(session);
  
  // Configuração de sessão aprimorada para ambiente serverless
  const sessionConfig: session.SessionOptions = {
    cookie: { 
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      // Em produção, permitimos cookies inseguros pois o Vercel gerencia HTTPS
      secure: false
    },
    name: "embasa_login_session",
    secret: process.env.SESSION_SECRET || "calendar_scheduling_secret",
    resave: true,
    saveUninitialized: false,
    store: new MemoryStoreSession({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
  };

  // Adicionar middleware de sessão com configuração melhorada
  app.use(session(sessionConfig));
  
  // Adicionar middleware de diagnóstico para sessão
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/auth')) {
      console.log('Session ID:', req.sessionID);
      console.log('Session Data:', req.session);
    }
    next();
  });

  // Middleware to handle validation errors
  const validateRequest = (schema: z.ZodType<any, any>) => {
    return (req: Request, res: Response, next: Function) => {
      try {
        req.body = schema.parse(req.body);
        next();
      } catch (error) {
        if (error instanceof ZodError) {
          const validationError = fromZodError(error);
          res.status(400).json({ message: validationError.message });
        } else {
          res.status(400).json({ message: "Invalid request data" });
        }
      }
    };
  };

  // Authentication middleware
  const requireAuth = (req: Request, res: Response, next: Function) => {
    if (!req.session.user) {
      return res.status(401).json({ message: "Unauthorized. Please log in." });
    }
    next();
  };

  // Role-based authorization middleware
  const requireRole = (roles: string[]) => {
    return (req: Request, res: Response, next: Function) => {
      if (!req.session.user || !roles.includes(req.session.user.role)) {
        return res.status(403).json({ message: "Forbidden. Insufficient permissions." });
      }
      next();
    };
  };

  // Authentication routes - melhorada com mais logs e tratamento de erros
  app.post("/api/auth/login", validateRequest(loginSchema), async (req, res) => {
    try {
      console.log("Processando login com dados:", req.body);
      const { accessCode } = req.body;
      
      if (!accessCode) {
        return res.status(400).json({ message: "Código de acesso não fornecido" });
      }
      
      console.log("Buscando código de acesso:", accessCode);
      const user = await storage.getAccessCode(accessCode);
      
      console.log("Resultado da busca de usuário:", user);
      
      if (!user || !user.active) {
        return res.status(401).json({ message: "Invalid access code" });
      }
      
      // Store user in session
      req.session.user = {
        id: user.id,
        code: user.code,
        role: user.role
      };
      
      // Forçar salvamento da sessão
      req.session.save((err) => {
        if (err) {
          console.error("Erro ao salvar sessão:", err);
          return res.status(500).json({ message: "Erro ao salvar sessão" });
        }
        
        console.log("Sessão salva com sucesso. Sessão atual:", req.session);
        res.json({ user: req.session.user });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Server error during login" });
    }
  });

  // Rota de teste para verificar se a sessão está funcionando
  app.get("/api/auth/test-session", (req, res) => {
    console.log("Sessão atual no teste:", req.session);
    res.json({
      sessionID: req.sessionID,
      hasSession: !!req.session,
      user: req.session.user || null
    });
  });

  app.post("/api/auth/logout", (req, res) => {
    if (!req.session.user) {
      return res.json({ message: "Nenhuma sessão ativa para encerrar" });
    }
    
    req.session.destroy((err) => {
      if (err) {
        console.error("Erro ao fazer logout:", err);
        return res.status(500).json({ message: "Error logging out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    console.log("Verificando usuário atual. Sessão:", req.session);
    
    if (!req.session.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json({ user: req.session.user });
  });

  // Access Code routes (Admin only)
  app.get("/api/access-codes", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const accessCodes = await storage.listAccessCodes();
      res.json(accessCodes);
    } catch (error) {
      console.error("Error fetching access codes:", error);
      res.status(500).json({ message: "Server error fetching access codes" });
    }
  });

  app.post(
    "/api/access-codes", 
    requireAuth, 
    requireRole(["admin"]), 
    validateRequest(insertAccessCodeSchema), 
    async (req, res) => {
      try {
        // Check if code already exists
        const existingCode = await storage.getAccessCode(req.body.code);
        if (existingCode) {
          return res.status(400).json({ message: "Access code already exists" });
        }
        
        const accessCode = await storage.createAccessCode(req.body);
        res.status(201).json(accessCode);
      } catch (error) {
        console.error("Error creating access code:", error);
        res.status(500).json({ message: "Server error creating access code" });
      }
    }
  );

  app.patch(
    "/api/access-codes/:id", 
    requireAuth, 
    requireRole(["admin"]), 
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const updates = req.body;
        
        const accessCode = await storage.updateAccessCode(id, updates);
        if (!accessCode) {
          return res.status(404).json({ message: "Access code not found" });
        }
        
        res.json(accessCode);
      } catch (error) {
        console.error("Error updating access code:", error);
        res.status(500).json({ message: "Server error updating access code" });
      }
    }
  );

  app.delete(
    "/api/access-codes/:id", 
    requireAuth, 
    requireRole(["admin"]), 
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const success = await storage.deleteAccessCode(id);
        
        if (!success) {
          return res.status(404).json({ message: "Access code not found" });
        }
        
        res.json({ message: "Access code deleted successfully" });
      } catch (error) {
        console.error("Error deleting access code:", error);
        res.status(500).json({ message: "Server error deleting access code" });
      }
    }
  );

  // Availability routes (EMBASA user can create, all authenticated users can view)
  app.get("/api/availabilities", requireAuth, async (req, res) => {
    try {
      const { year, month } = req.query;
      
      let availabilities;
      if (year && month) {
        availabilities = await storage.getAvailabilitiesByMonth(
          parseInt(year as string), 
          parseInt(month as string)
        );
      } else {
        availabilities = await storage.listAvailabilities();
      }
      
      res.json(availabilities);
    } catch (error) {
      console.error("Error fetching availabilities:", error);
      res.status(500).json({ message: "Server error fetching availabilities" });
    }
  });

  app.post(
    "/api/availabilities", 
    requireAuth, 
    requireRole(["embasa"]), 
    async (req, res) => {
      try {
        // Log the full request body first for debugging
        console.log("Corpo completo da requisição:", req.body);
        
        // Check for date parsing
        const dateStr = req.body.date;
        
        // Validar manualmente os dados
        if (!dateStr || typeof dateStr !== 'string') {
          return res.status(400).json({ message: "Data inválida ou ausente" });
        }
        
        if (!req.body.startTime || typeof req.body.startTime !== 'string') {
          return res.status(400).json({ message: "Horário inicial inválido ou ausente" });
        }
        
        if (!req.body.endTime || typeof req.body.endTime !== 'string') {
          return res.status(400).json({ message: "Horário final inválido ou ausente" });
        }
        
        if (!req.body.capacity || isNaN(Number(req.body.capacity))) {
          return res.status(400).json({ message: "Capacidade inválida ou ausente" });
        }
        
        // Try to parse the date
        const date = new Date(dateStr);
        console.log("Data recebida:", dateStr);
        console.log("Data convertida:", date);
        
        if (isNaN(date.getTime())) {
          return res.status(400).json({ message: "Formato de data inválido: " + dateStr });
        }
        
        // Processar outros campos
        const capacity = Number(req.body.capacity);
        
        // Create the availability
        const availability = await storage.createAvailability({
          date: date,
          startTime: req.body.startTime,
          endTime: req.body.endTime,
          capacity: capacity,
          remainingSlots: capacity,
          createdBy: req.session.user!.code,
        });
        
        res.status(201).json(availability);
      } catch (error) {
        console.error("Error creating availability:", error);
        res.status(500).json({ message: "Server error creating availability" });
      }
    }
  );

  app.delete(
    "/api/availabilities/:id", 
    requireAuth, 
    requireRole(["embasa"]), 
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const availability = await storage.getAvailability(id);
        
        if (!availability) {
          return res.status(404).json({ message: "Availability not found" });
        }
        
        // Check if the user created this availability
        if (availability.createdBy !== req.session.user!.code) {
          return res.status(403).json({ message: "You can only delete availabilities you created" });
        }
        
        const success = await storage.deleteAvailability(id);
        if (!success) {
          return res.status(404).json({ message: "Availability not found" });
        }
        
        res.json({ message: "Availability deleted successfully" });
      } catch (error) {
        console.error("Error deleting availability:", error);
        res.status(500).json({ message: "Server error deleting availability" });
      }
    }
  );

  // Booking routes (SAC users)
  app.get("/api/bookings", requireAuth, async (req, res) => {
    try {
      const bookings = await storage.listBookingsByUser(req.session.user!.code);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ message: "Server error fetching bookings" });
    }
  });

  app.post(
    "/api/bookings", 
    requireAuth, 
    requireRole(["sac"]), 
    validateRequest(insertBookingSchema), 
    async (req, res) => {
      try {
        // Check if availability exists and has remaining slots
        const availability = await storage.getAvailability(req.body.availabilityId);
        
        if (!availability) {
          return res.status(404).json({ message: "Availability not found" });
        }
        
        if (availability.remainingSlots <= 0) {
          return res.status(400).json({ message: "No slots available for this time" });
        }
        
        // Create the booking
        const booking = await storage.createBooking({
          ...req.body,
          createdBy: req.session.user!.code,
        });
        
        res.status(201).json(booking);
      } catch (error) {
        console.error("Error creating booking:", error);
        res.status(500).json({ message: "Server error creating booking" });
      }
    }
  );

  // Admin dashboard statistics
  app.get("/api/admin/stats", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const accessCodes = await storage.listAccessCodes();
      const availabilities = await storage.listAvailabilities();
      
      // Calculate stats
      const adminCount = accessCodes.filter(code => code.role === "admin" && code.active).length;
      const embasaCount = accessCodes.filter(code => code.role === "embasa" && code.active).length;
      const sacCount = accessCodes.filter(code => code.role === "sac" && code.active).length;
      
      // Count bookings by getting all availabilities and their bookings
      let activeBookings = 0;
      for (const availability of availabilities) {
        const bookings = await storage.listBookingsByAvailability(availability.id);
        activeBookings += bookings.filter(b => b.status === "confirmed").length;
      }
      
      res.json({
        adminCount,
        embasaCount,
        sacCount,
        activeSchedules: activeBookings
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Server error fetching admin statistics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
