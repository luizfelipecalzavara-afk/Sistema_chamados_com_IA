const https = require('https');

class EmailService {
  isConfigured() { return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM); }

  async enviar({ para, assunto, html }) {
    if (!this.isConfigured()) {
      const err = new Error('Serviço de e-mail não configurado. Defina RESEND_API_KEY e EMAIL_FROM no .env.');
      err.code = 'EMAIL_NOT_CONFIGURED';
      throw err;
    }
    const payload = JSON.stringify({ from: process.env.EMAIL_FROM, to: [para], subject: assunto, html });
    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.resend.com', path: '/emails', method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
      }, res => {
        let body=''; res.on('data', d => body += d); res.on('end', () => {
          let data={}; try { data=JSON.parse(body||'{}'); } catch (_) {}
          if (res.statusCode >= 200 && res.statusCode < 300) return resolve(data);
          reject(new Error(`Falha no provedor de e-mail (HTTP ${res.statusCode}): ${data.message || 'erro desconhecido'}`));
        });
      });
      req.on('error', reject); req.setTimeout(10000, () => req.destroy(new Error('Timeout ao enviar e-mail.')));
      req.write(payload); req.end();
    });
  }

  async enviarRedefinicao(para, nome, token) {
    const base = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    const link = `${base}/?reset_token=${encodeURIComponent(token)}`;
    return this.enviar({
      para, assunto: 'ChamadoIA — Redefinição de senha',
      html: `<h2>Redefinição de senha</h2><p>Olá, ${this.escape(nome)}.</p><p>Use o link abaixo para criar uma nova senha. Ele expira em 30 minutos e só pode ser usado uma vez.</p><p><a href="${link}">Redefinir minha senha</a></p><p>Se você não solicitou isso, ignore esta mensagem.</p>`
    });
  }

  escape(v='') { return String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
}
module.exports = new EmailService();
