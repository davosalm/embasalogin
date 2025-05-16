// Este arquivo serve como ponto de entrada para a API do Vercel
import express from 'express';
import { registerRoutes } from '../server/routes';
import { initializeTursoDb } from '../server/turso-db';
import { log } from '../server/vite';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Log erros não tratados
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Middleware de log
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
  });

  next();
});

// Inicializar o banco de dados Turso
initializeTursoDb()
  .then(() => {
    console.log("Banco de dados Turso inicializado com sucesso!");
  })
  .catch(error => {
    console.error("Erro ao inicializar banco de dados Turso:", error);
  });

// Configurar as rotas
registerRoutes(app)
  .then(() => {
    console.log("Rotas registradas com sucesso!");
  })
  .catch(error => {
    console.error("Erro ao registrar rotas:", error);
  });

// Exportar a função handler para Vercel
export default app;