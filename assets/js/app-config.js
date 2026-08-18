/**
 * ═══════════════════════════════════════════════════════════
 * AppConfig — Motor Central de Configurações, PIN, Assinantes OS e Gmail API
 * Governança DE · Academia da Força Aérea
 * ═══════════════════════════════════════════════════════════
 */
(function(window) {
  'use strict';

  const STORAGE_KEY_PIN = 'secretaria_pin';
  const STORAGE_KEY_GMAIL = 'app_gmail_config';
  const STORAGE_KEY_OS = 'app_os_config_v2';
  const DEFAULT_PIN = '123456';

  const DEFAULT_OS_CONFIG = {
    omis_autoridade_nome: 'Odilor da Silva Lopes Cel Int R1',
    omis_autoridade_cargo: 'Adjunto da Divisão de Ensino da AFA',
    omis_autoridade_email: '',
    omis_autoridade_efetivo_idx: '',
    grat_os_autoridade_nome: 'Cel QOINT WELLINGTON MARCELO FERNANDES',
    grat_os_autoridade_cargo: 'Chefe da Divisão Administrativa',
    grat_aut_autoridade_nome: 'GABRIEL HENRIQUES DE OLIVEIRA FARIAS Cel Av',
    grat_aut_autoridade_cargo: 'Chefe da 2SC',
    grat_aut_cidade: 'Brasilia-DF',
    notificar_solicitante: true,
    notificar_secretaria: true,
    notificar_omis_chefe: true
  };

  let _cachedConfig = null;
  let _cachedOsConfig = null;
  let _sbInstance = null;

  // Tenta obter o cliente Supabase disponível globalmente
  function getSbClient() {
    if (window.sbCli) return window.sbCli;
    if (window.sb) return window.sb;
    if (window.supabaseClient) return window.supabaseClient;
    if (_sbInstance) return _sbInstance;

    if (window.supabase && typeof window.supabase.createClient === 'function') {
      const url = window.SUPABASE_URL || window.SB?.url || 'https://rsaaryrgdrolcsvigckz.supabase.co';
      const anon = window.SUPABASE_ANON || window.SB?.key || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzYWFyeXJnZHJvbGNzdmlnY2t6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMzcyNjEsImV4cCI6MjA4MjcxMzI2MX0.UKACT_OKIMRaLB3FJPtFPGqhVbR83pUiiPfLkcf_Ec0';
      if (url && anon && !url.startsWith('COLE_')) {
        try {
          _sbInstance = window.supabase.createClient(url, anon, { auth: { persistSession: false } });
          return _sbInstance;
        } catch(e) {}
      }
    }
    return null;
  }

  const AppConfig = {
    isRemoteDbReady: localStorage.getItem('app_config_ready') === '1',

    /**
     * Carrega a configuração centralizada do Supabase e/ou LocalStorage
     */
    async loadConfig() {
      const sb = getSbClient();
      let pin = localStorage.getItem(STORAGE_KEY_PIN) || DEFAULT_PIN;
      let gmailUser = '';
      let gmailAppPassword = '';
      let gmailSenderName = 'Secretaria DE · AFA';
      let gmailEnabled = true;

      // Restaura do LocalStorage primeiramente
      try {
        const localGmail = JSON.parse(localStorage.getItem(STORAGE_KEY_GMAIL) || '{}');
        if (localGmail.gmail_user) gmailUser = localGmail.gmail_user;
        if (localGmail.gmail_app_password) gmailAppPassword = localGmail.gmail_app_password;
        if (localGmail.gmail_sender_name) gmailSenderName = localGmail.gmail_sender_name;
        if (typeof localGmail.gmail_enabled === 'boolean') gmailEnabled = localGmail.gmail_enabled;
      } catch(e) {}

      // Tenta buscar o PIN na tabela oficial at_config (existente no Supabase)
      if (sb) {
        try {
          const { data: atData } = await sb.from('at_config').select('pin').eq('id', 'default').maybeSingle();
          if (atData && atData.pin) {
            pin = String(atData.pin).trim();
            localStorage.setItem(STORAGE_KEY_PIN, pin);
          }
        } catch(e) {}

        // Tenta buscar as configurações expandidas de e-mail APENAS se app_config foi confirmada/criada
        if (this.isRemoteDbReady) {
          try {
            const { data, error } = await sb.from('app_config').select('*').eq('id', 'default').maybeSingle();
            if (data && !error) {
              if (data.pin) pin = String(data.pin).trim();
              if (data.gmail_user) gmailUser = data.gmail_user;
              if (data.gmail_app_password) gmailAppPassword = data.gmail_app_password;
              if (data.gmail_sender_name) gmailSenderName = data.gmail_sender_name;
              if (typeof data.gmail_enabled === 'boolean') gmailEnabled = data.gmail_enabled;

              localStorage.setItem(STORAGE_KEY_PIN, pin);
              localStorage.setItem(STORAGE_KEY_GMAIL, JSON.stringify({
                gmail_user: gmailUser,
                gmail_app_password: gmailAppPassword,
                gmail_sender_name: gmailSenderName,
                gmail_enabled: gmailEnabled
              }));
            } else if (error) {
              this.isRemoteDbReady = false;
              localStorage.removeItem('app_config_ready');
            }
          } catch(e) {
            this.isRemoteDbReady = false;
            localStorage.removeItem('app_config_ready');
          }
        }
      }

      _cachedConfig = { pin, gmailUser, gmailAppPassword, gmailSenderName, gmailEnabled };
      await this.loadOsConfig();
      return _cachedConfig;
    },

    /**
     * Retorna o PIN atual (do cache ou localStorage)
     */
    getPin() {
      if (_cachedConfig && _cachedConfig.pin) return _cachedConfig.pin;
      return localStorage.getItem(STORAGE_KEY_PIN) || DEFAULT_PIN;
    },

    /**
     * Verifica se o PIN digitado confere com o PIN master
     */
    async verifyPin(inputPin) {
      const cfg = await this.loadConfig();
      const cleanInput = String(inputPin || '').trim();
      return cleanInput === cfg.pin;
    },

    /**
     * Atualiza o PIN centralmente no Supabase e em todos os storages
     */
    async setPin(novoPin) {
      const pinLimpo = String(novoPin || '').trim();
      if (!pinLimpo || pinLimpo.length < 4) {
        throw new Error('O PIN deve conter pelo menos 4 caracteres.');
      }

      localStorage.setItem(STORAGE_KEY_PIN, pinLimpo);
      localStorage.setItem('efetivo_pin', pinLimpo);
      if (_cachedConfig) _cachedConfig.pin = pinLimpo;

      const sb = getSbClient();
      if (sb) {
        try {
          await sb.from('at_config').upsert({ id: 'default', pin: pinLimpo });
        } catch(e) {}
        try {
          await sb.from('cur_config').upsert({ id: 'default', pin: pinLimpo });
        } catch(e) {}

        if (this.isRemoteDbReady) {
          try {
            const { error } = await sb.from('app_config').upsert({ id: 'default', pin: pinLimpo, updated_at: new Date().toISOString() });
            if (error) {
              this.isRemoteDbReady = false;
              localStorage.removeItem('app_config_ready');
            } else {
              localStorage.setItem('app_config_ready', '1');
            }
          } catch(e) {
            this.isRemoteDbReady = false;
            localStorage.removeItem('app_config_ready');
          }
        }
      }

      return pinLimpo;
    },

    /**
     * Retorna as configurações da integração Gmail
     */
    getGmailConfig() {
      if (_cachedConfig) {
        return {
          user: _cachedConfig.gmailUser || '',
          appPassword: _cachedConfig.gmailAppPassword || '',
          senderName: _cachedConfig.gmailSenderName || 'Secretaria DE · AFA',
          enabled: _cachedConfig.gmailEnabled !== false
        };
      }

      let local = {};
      try { local = JSON.parse(localStorage.getItem(STORAGE_KEY_GMAIL) || '{}'); } catch(e){}
      return {
        user: local.gmail_user || '',
        appPassword: local.gmail_app_password || '',
        senderName: local.gmail_sender_name || 'Secretaria DE · AFA',
        enabled: local.gmail_enabled !== false
      };
    },

    /**
     * Salva as configurações de e-mail do Gmail no Supabase e LocalStorage
     */
    async setGmailConfig({ user, appPassword, senderName, enabled }) {
      const u = String(user || '').trim();
      const p = String(appPassword || '').trim().replace(/\s+/g, '');
      const s = String(senderName || 'Secretaria DE · AFA').trim();
      const e = enabled !== false;

      const localData = {
        gmail_user: u,
        gmail_app_password: p,
        gmail_sender_name: s,
        gmail_enabled: e
      };
      localStorage.setItem(STORAGE_KEY_GMAIL, JSON.stringify(localData));

      if (_cachedConfig) {
        _cachedConfig.gmailUser = u;
        _cachedConfig.gmailAppPassword = p;
        _cachedConfig.gmailSenderName = s;
        _cachedConfig.gmailEnabled = e;
      }

      const sb = getSbClient();
      if (sb && this.isRemoteDbReady) {
        try {
          const { error } = await sb.from('app_config').upsert({
            id: 'default',
            gmail_user: u,
            gmail_app_password: p,
            gmail_sender_name: s,
            gmail_enabled: e,
            updated_at: new Date().toISOString()
          });
          if (error) {
            this.isRemoteDbReady = false;
            localStorage.removeItem('app_config_ready');
          } else {
            localStorage.setItem('app_config_ready', '1');
          }
        } catch(err) {
          this.isRemoteDbReady = false;
          localStorage.removeItem('app_config_ready');
        }
      }

      return localData;
    },

    /**
     * Carrega as configurações de assinantes de OS e OMIS
     */
    async loadOsConfig() {
      let cfg = { ...DEFAULT_OS_CONFIG };
      try {
        const local = localStorage.getItem(STORAGE_KEY_OS);
        if (local) {
          cfg = { ...cfg, ...JSON.parse(local) };
        }
      } catch(e) {}

      const sb = getSbClient();
      if (sb) {
        try {
          const { data, error } = await sb.from('os_config').select('*').eq('id', 'default').maybeSingle();
          if (data && !error) {
            cfg = { ...cfg, ...data };
            localStorage.setItem(STORAGE_KEY_OS, JSON.stringify(cfg));
          }
        } catch(e) {}
      }

      _cachedOsConfig = cfg;
      return _cachedOsConfig;
    },

    /**
     * Retorna a configuração de OS em memória ou local storage
     */
    getOsConfig() {
      if (_cachedOsConfig) return _cachedOsConfig;
      try {
        const local = localStorage.getItem(STORAGE_KEY_OS);
        if (local) return { ...DEFAULT_OS_CONFIG, ...JSON.parse(local) };
      } catch(e) {}
      return { ...DEFAULT_OS_CONFIG };
    },

    /**
     * Salva as configurações de assinantes e autoridades de OS/OMIS
     */
    async setOsConfig(newCfg) {
      const merged = { ...this.getOsConfig(), ...newCfg };
      localStorage.setItem(STORAGE_KEY_OS, JSON.stringify(merged));
      _cachedOsConfig = merged;

      const sb = getSbClient();
      if (sb) {
        try {
          await sb.from('os_config').upsert({
            id: 'default',
            ...merged,
            updated_at: new Date().toISOString()
          });
        } catch(e) {
          console.warn('[AppConfig] Aviso ao gravar os_config no Supabase:', e);
        }
      }
      return merged;
    },

    /**
     * Envia um e-mail utilizando as credenciais da API do Gmail / Senha de App configurada
     */
    async sendEmail({ to, cc, subject, html, text }) {
      const cfg = this.getGmailConfig();
      if (!cfg.enabled) {
        throw new Error('A integração com envio automático do Gmail está desativada nas configurações.');
      }
      if (!cfg.user || !cfg.appPassword) {
        throw new Error('Credenciais do Gmail (E-mail e Senha de Aplicativo) não configuradas.');
      }

      const payload = {
        user: cfg.user,
        appPassword: cfg.appPassword,
        senderName: cfg.senderName,
        to: String(to || '').trim(),
        cc: cc ? String(cc).trim() : '',
        subject: String(subject || 'Notificação - Governança DE').trim(),
        html: html || '',
        text: text || ''
      };

      if (!payload.to) {
        throw new Error('Endereço de e-mail do destinatário não informado.');
      }

      // Tenta enviar utilizando Web Relay (Google Apps Script Web App) se configurado
      const relayUrl = localStorage.getItem('gmail_relay_url');
      if (relayUrl && relayUrl.startsWith('http')) {
        const relayBody = JSON.stringify(payload);
        try {
          const res = await fetch(relayUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: relayBody
          });
          if (res.ok || res.type === 'opaque') {
            return { success: true, message: 'E-mail enviado com sucesso via Web Relay!' };
          }
        } catch(e) {
          try {
            await fetch(relayUrl, {
              method: 'POST',
              mode: 'no-cors',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: relayBody
            });
            return { success: true, message: 'E-mail enviado com sucesso via Google Web App Relay!' };
          } catch(e2) {
            console.warn('[AppConfig] Relay HTTP falhou, tentando transporte SmtpJS...', e2.message);
          }
        }
      }

      // Envio via SmtpJS usando smtp.gmail.com e Senha de Aplicativo
      try {
        if (!window.Email || typeof window.Email.send !== 'function') {
          await new Promise((resolve) => {
            const s = document.createElement('script');
            s.src = 'assets/js/smtp.js';
            s.onload = resolve;
            s.onerror = () => {
              const sCdn = document.createElement('script');
              sCdn.src = 'https://smtpjs.com/v3/smtp.js';
              sCdn.onload = resolve;
              sCdn.onerror = resolve;
              document.head.appendChild(sCdn);
            };
            document.head.appendChild(s);
          });
        }

        if (!window.Email || typeof window.Email.send !== 'function') {
          throw new Error('Falha no carregamento dos módulos de transporte de e-mail.');
        }

        const resText = await window.Email.send({
          Host: 'smtp.gmail.com',
          Username: payload.user,
          Password: payload.appPassword,
          To: payload.to,
          From: payload.senderName ? `${payload.senderName} <${payload.user}>` : payload.user,
          Subject: payload.subject,
          Body: payload.html || payload.text
        });

        if (resText === 'OK' || String(resText).toLowerCase().includes('ok')) {
          return { success: true, message: 'E-mail enviado com sucesso via Gmail SMTP!' };
        } else if (String(resText).includes('ERR_CONNECTION_RESET')) {
          throw new Error('Conexão bloqueada pelo proxy/firewall de rede. Utilize a URL do Web App do Google Apps Script para liberar envios diretos pelo Gmail.');
        } else {
          throw new Error(resText || 'Não foi possível autenticar ou disparar a mensagem via Gmail.');
        }
      } catch(err) {
        throw new Error(err.message);
      }
    },

    /**
     * Envia confirmação de cadastro de solicitação de missão ao solicitante e coordenador
     */
    async sendSolicitacaoConfirmationEmail(solic) {
      const to = solic.solicitante_email || solic.coordenador_email;
      if (!to) return;

      const cc = (solic.solicitante_email && solic.coordenador_email && solic.solicitante_email !== solic.coordenador_email)
        ? solic.coordenador_email
        : '';

      const mils = Array.isArray(solic.militares) ? solic.militares : [];
      const listaMilsHtml = mils.map((m, idx) => `
        <li><b>${idx === 0 ? 'Coordenador: ' : ''}${m.posto_grad || ''} ${m.nome || ''}</b> (SARAM: ${m.saram || '—'}, CPF: ${m.cpf || '—'})</li>
      `).join('');

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;border:1px solid #c5d4e8;border-radius:8px;overflow:hidden;color:#0a192f">
          <div style="background:#0a192f;color:#fff;padding:18px 24px;border-bottom:3px solid #d4a84b">
            <h2 style="margin:0;font-size:18px;text-transform:uppercase;letter-spacing:1px">Academia da Força Aérea · DE</h2>
            <p style="margin:4px 0 0;font-size:12px;color:#e5b95c">Confirmação de Solicitação de Missão</p>
          </div>
          <div style="padding:24px;background:#fff;line-height:1.6;font-size:14px">
            <p>Olá, sua solicitação de missão foi registrada com sucesso no sistema da Divisão de Ensino da AFA.</p>
            
            <div style="background:#f1f5f9;border-left:4px solid #d4a84b;padding:12px 16px;margin:16px 0;border-radius:4px">
              <div><b>Protocolo:</b> <span style="font-family:monospace;font-size:16px;font-weight:bold;color:#0a192f">${solic.protocolo}</span></div>
              <div><b>Modalidade:</b> ${solic.modalidade === 'gratificacao' ? 'Gratificação de Representação' : (solic.modalidade === 'diaria' ? 'Diária de Viagem' : 'OMIS / Sem Custo')}</div>
              <div><b>OMIS Solicitada:</b> ${solic.solicita_omis ? 'Sim (Emergencial)' : 'Não'}</div>
              <div><b>Período:</b> ${solic.data_inicio} (${solic.hora_inicio || '04:00'}) a ${solic.data_fim} (${solic.hora_fim || '16:00'})</div>
              <div><b>Missão / Destino:</b> ${solic.servico_local}</div>
            </div>

            <h4 style="margin:16px 0 8px;font-size:14px;color:#0a192f">Militares Designados:</h4>
            <ul style="margin:0 0 16px 20px;padding:0">
              ${listaMilsHtml}
            </ul>

            <p style="font-size:13px;color:#64748b">O operador da Divisão de Ensino fará a homologação do processo e a emissão dos documentos regulamentares. Guarde o número de protocolo para acompanhar a tramitação.</p>
          </div>
          <div style="background:#f8fafc;padding:12px 24px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center">
            Divisão de Ensino da AFA · Mensagem automática gerada pelo Portal de Governança
          </div>
        </div>
      `;

      return this.sendEmail({
        to,
        cc,
        subject: `[AFA/DE] Confirmação de Solicitação de Missão — ${solic.protocolo}`,
        html
      });
    },

    /**
     * Envia e-mail de OMIS para a autoridade assinante (Chefe/Adjunto DE) com o número SILOMS e cópia ao coordenador
     */
    async sendOmisSignatureEmail(omisData, recipientEmail, ccEmail) {
      const cfg = this.getOsConfig();
      const targetEmail = recipientEmail || cfg.omis_autoridade_email;
      if (!targetEmail) {
        throw new Error('E-mail do responsável pela autorização da OMIS não está configurado.');
      }

      const mils = Array.isArray(omisData.militares) ? omisData.militares : [];
      const prim = mils[0] || {};
      const numOmis = omisData.num_omis || omisData.num_os || 'OMIS';
      const silomsNum = omisData.siloms_numero || 'Pendente de inserção';
      const servico = omisData.servico_local || 'Missão oficial';
      const coordenadorStr = `${prim.posto_grad || ''} ${prim.nome_guerra || prim.nome || ''}`.trim();

      const textoPadrao = `Venho por meio deste solicitar a assinatura da OMIS ${numOmis} — (${servico}), ${coordenadorStr}, número SILOMS: ${silomsNum}.`;

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;border:1px solid #c5d4e8;border-radius:8px;overflow:hidden;color:#0a192f">
          <div style="background:#0a192f;color:#fff;padding:18px 24px;border-bottom:3px solid #d4a84b">
            <h2 style="margin:0;font-size:18px;text-transform:uppercase;letter-spacing:1px">Academia da Força Aérea · DE</h2>
            <p style="margin:4px 0 0;font-size:12px;color:#e5b95c">Solicitação de Assinatura Eletrônica no SILOMS</p>
          </div>
          <div style="padding:24px;background:#fff;line-height:1.6;font-size:14px">
            <p style="font-size:15px;color:#0a192f;font-weight:bold;margin-bottom:16px">
              ${textoPadrao}
            </p>

            <div style="background:#f1f5f9;border-left:4px solid #d4a84b;padding:14px 18px;margin:16px 0;border-radius:4px">
              <div><b>Ordem de Missão Nº:</b> <span style="font-family:monospace;font-size:15px;font-weight:bold;color:#0a192f">${numOmis}</span></div>
              <div><b>Número no SILOMS:</b> <span style="font-family:monospace;font-size:15px;font-weight:bold;color:#1e40af">${silomsNum}</span></div>
              <div><b>Coordenador(a):</b> ${coordenadorStr}</div>
              <div><b>Efetivo Total:</b> ${mils.length} militar(es)</div>
              <div><b>Período:</b> ${prim.data_inicio || omisData.data_inicio} (${prim.hora_inicio || omisData.hora_inicio || '04:00'}) a ${prim.data_fim || omisData.data_fim} (${prim.hora_fim || omisData.hora_fim || '16:00'})</div>
              <div><b>Objeto e Destino:</b> ${servico}</div>
              <div><b>Modalidade de Pagamento:</b> ${omisData.modalidade_label || 'Gratificação de Representação'}</div>
            </div>

            <p style="font-size:13px;color:#475569">O documento encontra-se disponível no <b>SILOMS</b> para a devida aposição de assinatura eletrônica. Após assinado, o coordenador da missão poderá baixá-lo diretamente para a condução do serviço.</p>
          </div>
          <div style="background:#f8fafc;padding:12px 24px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center">
            Divisão de Ensino da AFA · Despacho automático de Ordens de Missão via SILOMS
          </div>
        </div>
      `;

      return this.sendEmail({
        to: targetEmail,
        cc: ccEmail || '',
        subject: `[SILOMS] Solicitação de Assinatura OMIS ${numOmis} — ${coordenadorStr}`,
        html,
        text: textoPadrao
      });
    }
  };

  // Inicializa a configuração do LocalStorage e agenda a sincronização remota
  AppConfig.getPin();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(() => AppConfig.loadConfig(), 100));
  } else {
    setTimeout(() => AppConfig.loadConfig(), 100);
  }

  window.AppConfig = AppConfig;
})(window);
