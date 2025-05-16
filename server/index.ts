import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeTursoDb } from "./turso-db";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Middleware de log detalhado para diagnóstico
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Log erros não tratados no processo
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

(async () => {
  console.log("Iniciando servidor...");
  console.log("NODE_ENV:", process.env.NODE_ENV);
  
  // Inicializar o banco de dados Turso
  try {
    await initializeTursoDb();
    log("Banco de dados Turso inicializado com sucesso!", "db");
  } catch (error) {
    console.error("Erro ao inicializar banco de dados Turso:", error);
  }
  
  const server = await registerRoutes(app);

  // Middleware de tratamento de erros - melhorado para mostrar mais detalhes
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    console.error("ERRO NA APLICAÇÃO:", {
      path: req.path,
      method: req.method, 
      error: err,
      stack: err.stack
    });
    
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
