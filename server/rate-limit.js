// Limitadores em memória. Os contadores vivem só neste processo: zeram quando a
// API reinicia e não são compartilhados entre instâncias. Para escalar em mais
// de uma instância, mova o estado para o PostgreSQL ou Redis.

class FixedWindowLimiter {
  constructor({ limit, windowMs, maxEntries = 10_000, now = Date.now }) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.maxEntries = maxEntries;
    this.now = now;
    this.entries = new Map();
    this.lastSweep = now();
  }

  hit(key) {
    const now = this.now();
    if (now - this.lastSweep >= this.windowMs) this.sweep(now);

    let entry = this.entries.get(key);
    if (!entry || entry.resetAt <= now) {
      // Reinsere para manter o Map em ordem de criação da janela (mais antigas primeiro).
      this.entries.delete(key);
      entry = { count: 0, resetAt: now + this.windowMs };
      this.entries.set(key, entry);
      this.evictOverflow(now);
    }
    entry.count += 1;
    const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return { allowed: entry.count <= this.limit, remaining: Math.max(0, this.limit - entry.count), retryAfterSeconds };
  }

  sweep(now = this.now()) {
    this.lastSweep = now;
    for (const [key, entry] of this.entries) {
      if (entry.resetAt <= now) this.entries.delete(key);
    }
  }

  evictOverflow(now) {
    if (this.entries.size <= this.maxEntries) return;
    this.sweep(now);
    for (const key of this.entries.keys()) {
      if (this.entries.size <= this.maxEntries) break;
      this.entries.delete(key);
    }
  }

  get size() {
    return this.entries.size;
  }
}

class ConcurrencyLimiter {
  constructor({ limit }) {
    this.limit = limit;
    this.active = new Map();
  }

  // Retorna uma função de liberação, ou null quando o limite já foi atingido.
  acquire(key) {
    const current = this.active.get(key) || 0;
    if (current >= this.limit) return null;
    this.active.set(key, current + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const next = (this.active.get(key) || 1) - 1;
      if (next <= 0) this.active.delete(key);
      else this.active.set(key, next);
    };
  }

  get size() {
    return this.active.size;
  }
}

function rateLimit(limiter, keyOf, message) {
  return (request, response, next) => {
    const key = keyOf(request);
    if (!key) return next();
    const result = limiter.hit(key);
    if (result.allowed) return next();
    response.set('Retry-After', String(result.retryAfterSeconds));
    response.status(429).json({ error: message, code: 'RATE_LIMIT' });
  };
}

module.exports = { FixedWindowLimiter, ConcurrencyLimiter, rateLimit };
