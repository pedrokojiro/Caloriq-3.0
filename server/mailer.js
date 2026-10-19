// Envio de e-mails transacionais pelo Resend (https://resend.com).
// Sem RESEND_API_KEY nada é enviado; com MAIL_DEV_LOG=true o conteúdo é
// registrado no console para testes locais. Nunca ative isso em produção.

const RESEND_URL = 'https://api.resend.com/emails';

function createMailer({ apiKey = process.env.RESEND_API_KEY, from = process.env.RESEND_FROM, devLog = process.env.MAIL_DEV_LOG === 'true', fetchImpl = fetch } = {}) {
  const sender = from || 'CaloriQ <onboarding@resend.dev>';
  return async function sendEmail({ to, subject, text, html }) {
    if (!apiKey) {
      if (devLog) console.info(`[mail:dev] para ${to} | ${subject}\n${text}`);
      else console.warn('RESEND_API_KEY ausente: e-mail não enviado.');
      return { delivered: false };
    }
    const response = await fetchImpl(RESEND_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: sender, to: [to], subject, text, html }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Resend respondeu ${response.status}: ${detail.slice(0, 200)}`);
    }
    return { delivered: true };
  };
}

module.exports = { createMailer };
