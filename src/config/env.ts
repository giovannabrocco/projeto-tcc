// Leitura centralizada das variáveis de ambiente (lidas na hora do uso, depois do dotenv carregar).
const num = (v: string | undefined, padrao: number) => {
  const n = Number(v);
  return v !== undefined && v !== '' && Number.isFinite(n) ? n : padrao;
};
const bool = (v: string | undefined, padrao = false) =>
  v === undefined ? padrao : ['1', 'true', 'sim', 'yes'].includes(v.toLowerCase());

export const env = {
  get port() { return num(process.env.PORT, 3333); },
  get jwtSecret() {
    const s = process.env.JWT_SECRET;
    if (!s || s.length < 16) {
      if (process.env.NODE_ENV === 'production') throw new Error('Defina JWT_SECRET (mín. 16 caracteres).');
      return 'dev-secret-conectus-troque-em-producao';
    }
    return s;
  },
  get jwtExpiraHoras() { return num(process.env.JWT_EXPIRA_HORAS, 8); },
  get corsOrigins() {
    return (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(',').map((s) => s.trim()).filter(Boolean);
  },
  get trustProxy() { return bool(process.env.TRUST_PROXY, false); },
  get frontendUrl() { return (process.env.FRONTEND_URL ?? 'http://localhost:5173').replace(/\/$/, ''); },

  // assinatura
  get trialDias() { return num(process.env.TRIAL_DIAS, 7); },
  get carenciaDias() { return num(process.env.CARENCIA_DIAS, 5); },

  // Mercado Pago
  get mpAccessToken() { return process.env.MP_ACCESS_TOKEN ?? ''; },
  get mpWebhookSecret() { return process.env.MP_WEBHOOK_SECRET ?? ''; },
  get mpApiUrl() { return process.env.MP_API_URL ?? 'https://api.mercadopago.com'; },
  get mpNotificationUrl() { return process.env.MP_NOTIFICATION_URL ?? ''; },
  get mpBackUrl() { return process.env.MP_BACK_URL ?? `${this.frontendUrl}/assinatura/retorno`; },

  // e-mail
  get smtpHost() { return process.env.SMTP_HOST ?? ''; },
  get smtpPort() { return num(process.env.SMTP_PORT, 587); },
  get smtpUser() { return process.env.SMTP_USER ?? ''; },
  get smtpPass() { return process.env.SMTP_PASS ?? ''; },
  get smtpFrom() { return process.env.SMTP_FROM ?? 'Conectus <nao-responda@conectus.app>'; },

  // painel interno da plataforma (cupons)
  get plataformaKey() { return process.env.PLATAFORMA_ADMIN_KEY ?? ''; },
};
