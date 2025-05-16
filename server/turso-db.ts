import { createClient } from '@libsql/client';
import * as schema from "@shared/schema";

// Usar as credenciais diretas do Turso
const TURSO_DB_URL = "libsql://agendamentoembasa-davosalm.aws-us-east-1.turso.io";
const TURSO_AUTH_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NDc0MTU2ODIsImlkIjoiY2E4YzRhMmQtZDhlZC00ZjY3LWEwZmMtNjZmNGYyZDZiZTM3IiwicmlkIjoiZjY5OGY1ZmYtMmQzNi00MTcyLTk0ZWMtMmU5NDg2YWZjYmM2In0.YZjtGbzuaYS0sBSgP62-SrnJsBEhd3byKPazzFVcRZcFqN-__y6MAPZcN3WvLCNDpBT14J3bmPwO8KT64-tQAA";

// Criar cliente Turso com as credenciais fixas
export const tursoClient = createClient({
  url: process.env.TURSO_DB_URL || TURSO_DB_URL,
  authToken: process.env.TURSO_AUTH_TOKEN || TURSO_AUTH_TOKEN,
});

// Função para inicializar as tabelas no Turso (SQLite)
export async function initializeTursoDb() {
  try {
    console.log("Inicializando banco de dados Turso...");

    // Criar tabela de códigos de acesso
    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS access_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL,
        location TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        active BOOLEAN DEFAULT 1 NOT NULL
      )
    `);

    // Criar tabela de disponibilidades
    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS availabilities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        capacity INTEGER NOT NULL,
        remaining_slots INTEGER NOT NULL,
        created_by TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);

    // Criar tabela de agendamentos
    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        availability_id INTEGER NOT NULL,
        client_name TEXT NOT NULL,
        client_document TEXT,
        client_phone TEXT,
        service_number TEXT NOT NULL,
        time_slot TEXT NOT NULL,
        comments TEXT,
        created_by TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        status TEXT DEFAULT 'confirmed' NOT NULL
      )
    `);

    // Verificar se já existe um admin padrão
    const checkAdmin = await tursoClient.execute({
      sql: `SELECT * FROM access_codes WHERE code = ? AND role = 'admin'`,
      args: ['ADM123456']
    });

    // Inserir admin padrão se não existir
    if (checkAdmin.rows.length === 0) {
      await tursoClient.execute({
        sql: `INSERT INTO access_codes (code, role, location, active) VALUES (?, ?, ?, ?)`,
        args: ['ADM123456', 'admin', 'Sede', true]
      });
      console.log("Admin padrão criado: ADM123456");
    }

    console.log("Banco de dados Turso inicializado com sucesso!");
  } catch (error) {
    console.error("Erro ao inicializar banco de dados Turso:", error);
    throw error;
  }
}