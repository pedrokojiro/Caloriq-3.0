// Utilitários compartilhados pelos testes de rota. Não é carregado pela API.
const { hashToken } = require('./auth');

// Pool falso: `handler(sql, params)` decide a resposta de cada consulta.
// A consulta de sessão é respondida automaticamente para os tokens de `users`.
function fakePool(handler, users = {}) {
  const query = async (sqlOrConfig, maybeParams) => {
    const sql = typeof sqlOrConfig === 'string' ? sqlOrConfig : sqlOrConfig.text;
    const params = typeof sqlOrConfig === 'string' ? (maybeParams || []) : (sqlOrConfig.values || []);
    if (/FROM auth_sessions s\s+JOIN users u/.test(sql)) {
      const entry = Object.entries(users).find(([token]) => hashToken(token) === params[0]);
      if (!entry) return { rows: [], rowCount: 0 };
      const [, user] = entry;
      return { rows: [{ user_id: user.id, name: user.name || 'Teste', email: user.email || `${user.id}@teste.local`, onboarding_completed: true }], rowCount: 1 };
    }
    if (/^(BEGIN|COMMIT|ROLLBACK)/.test(sql.trim())) return { rows: [], rowCount: 0 };
    return (await handler(sql, params)) || { rows: [], rowCount: 0 };
  };
  return { query, connect: async () => ({ query, release() {} }) };
}

async function startServer(app) {
  const server = await new Promise(resolve => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const call = async (method, path, { token, body, headers = {} } = {}) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    return { status: response.status, headers: response.headers, body: text ? JSON.parse(text) : undefined };
  };
  return { call, close: () => new Promise(resolve => server.close(resolve)) };
}

module.exports = { fakePool, startServer };
