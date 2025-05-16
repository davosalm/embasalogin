// Versão simplificada para o Vercel
import { createClient } from '@libsql/client';

// Configuração direta do cliente Turso
const TURSO_DB_URL = "libsql://agendamentoembasa-davosalm.aws-us-east-1.turso.io";
const TURSO_AUTH_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NDc0MTU2ODIsImlkIjoiY2E4YzRhMmQtZDhlZC00ZjY3LWEwZmMtNjZmNGYyZDZiZTM3IiwicmlkIjoiZjY5OGY1ZmYtMmQzNi00MTcyLTk0ZWMtMmU5NDg2YWZjYmM2In0.YZjtGbzuaYS0sBSgP62-SrnJsBEhd3byKPazzFVcRZcFqN-__y6MAPZcN3WvLCNDpBT14J3bmPwO8KT64-tQAA";

const tursoClient = createClient({
  url: TURSO_DB_URL,
  authToken: TURSO_AUTH_TOKEN,
});

// Handler para requisições ao Vercel
export default async function handler(req, res) {
  // Habilitar CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Responder a requisições OPTIONS para CORS pre-flight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Definir o tipo de conteúdo para JSON
  res.setHeader('Content-Type', 'application/json');

  try {
    // Rota de API de saúde
    if (req.url === '/api/health') {
      return res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
    }
    
    // Rota de login - única rota implementada inicialmente
    if (req.url === '/api/auth/login' && req.method === 'POST') {
      console.log("Recebendo requisição de login", req.body);
      
      const { accessCode } = req.body;
      
      if (!accessCode) {
        return res.status(400).json({ message: "Código de acesso não fornecido" });
      }
      
      // Verificar o código de acesso diretamente no banco de dados
      try {
        const result = await tursoClient.execute({
          sql: `SELECT * FROM access_codes WHERE code = ? AND active = 1`,
          args: [accessCode]
        });
        
        console.log("Resultado da busca:", result);
        
        if (result.rows.length === 0) {
          return res.status(401).json({ message: "Código de acesso inválido" });
        }
        
        const user = result.rows[0];
        
        // Formar o objeto de resposta
        const userData = {
          id: Number(user.id),
          code: String(user.code),
          role: String(user.role)
        };
        
        // Configurar o cookie
        const cookieOptions = {
          httpOnly: true,
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          path: '/',
          sameSite: 'none',
          secure: true
        };
        
        // Adicionar o cookie na resposta
        res.setHeader('Set-Cookie', `user=${JSON.stringify(userData)}; Max-Age=${cookieOptions.maxAge}; Path=${cookieOptions.path}; HttpOnly; SameSite=None; Secure`);
        
        return res.status(200).json({ user: userData });
      } catch (error) {
        console.error("Erro ao consultar banco de dados:", error);
        return res.status(500).json({ message: "Erro ao processar login", error: error.message });
      }
    }
    
    // Rota para teste
    if (req.url === '/api/test') {
      return res.status(200).json({ message: "API funcionando corretamente" });
    }
    
    // Rota não encontrada
    return res.status(404).json({ message: "Rota não encontrada" });
  } catch (error) {
    console.error("Erro na API:", error);
    return res.status(500).json({ message: "Erro interno do servidor", error: error.message });
  }
}