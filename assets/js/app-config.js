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
      const url = window.SUPABASE_URL || window.SB?.url || 'https://sovrgsbdhdpxsaomspsp.supabase.co';
      const anon = window.SUPABASE_ANON || window.SB?.key || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvdnJnc2JkaGRweHNhb21zcHNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMjMyOTksImV4cCI6MjEwMDg5OTI5OX0.Yn8fOSNndY-LnSOQ8FsYEgcAvZCo4djEd28rmHhjNqg';
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
        try {
          await sb.from('cargos_config').upsert({ id: 'default', pin: pinLimpo });
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
    },

    /* ═══════════════════════════════════════════════════════════
       CENTRO DE DADOS: EFETIVO (PESSOAL)
       ═══════════════════════════════════════════════════════════ */
    STORAGE_KEY_EFETIVO_DB: 'afa_efetivo_db_cache_v2',
    EFETIVO_SHEET_ID: '1UOMh4y-wHL8kHcB9TUUcEmkeF7z6KYAs4vipsoOFgfA',

    formatarCPF(raw) {
      if (!raw) return '';
      const num = String(raw).replace(/\D/g, '').padStart(11, '0').slice(-11);
      return num.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    },

    formatarSARAM(raw) {
      if (!raw) return '';
      return String(raw).replace(/\D/g, '').padStart(7, '0').slice(-7);
    },

    parseSheetDate(cell) {
      if (!cell) return null;
      const f = cell.f;
      const v = cell.v;
      if (typeof f === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(f.trim())) {
        const [d, m, y] = f.trim().split('/');
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
      if (typeof v === 'string') {
        const mDate = v.match(/Date\((\d+),(\d+),(\d+)\)/);
        if (mDate) {
          const y = mDate[1];
          const m = String(parseInt(mDate[2], 10) + 1).padStart(2, '0');
          const d = String(parseInt(mDate[3], 10)).padStart(2, '0');
          return `${y}-${m}-${d}`;
        }
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v.trim())) {
          const [d, m, y] = v.trim().split('/');
          return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
      }
      return null;
    },

    parseCurrency(cell) {
      if (!cell) return 0;
      if (typeof cell.v === 'number') return cell.v;
      const raw = (cell.f || cell.v || '').toString().replace(/[^\d.,]/g, '').replace(',', '.');
      return parseFloat(raw) || 0;
    },

    parseBool(cell) {
      if (!cell) return false;
      if (typeof cell.v === 'boolean') return cell.v;
      const s = String(cell.v || cell.f || '').trim().toLowerCase();
      return s === 'true' || s === 'sim' || s === 's' || s === '1';
    },

    parseEfetivoRow(c, rowIndex) {
      const v = idx => (c[idx]?.v !== undefined && c[idx]?.v !== null) ? String(c[idx].v).trim() : '';
      const f = idx => (c[idx]?.f !== undefined && c[idx]?.f !== null) ? String(c[idx].f).trim() : '';
      const vf = idx => f(idx) || v(idx);

      const saram = this.formatarSARAM(v(19));
      const nomeGuerra = v(4);
      const posto = v(2);

      if (!nomeGuerra && !saram) return null;

      return {
        ordem: parseInt(v(1), 10) || (rowIndex - 2),
        posto_grad: posto,
        especialidade: v(3),
        nome_guerra: nomeGuerra,
        cargo_funcao: v(7),
        ramal: v(8),
        funcao_publicada: this.parseBool(c[9]),
        data_inicio: this.parseSheetDate(c[10]),
        boletim: v(11),
        nome_completo: v(13),
        telefone: vf(14),
        email: v(15),
        lista_zimbra: this.parseBool(c[16]),
        endereco: v(17),
        saram: saram,
        cpf: this.formatarCPF(v(20)),
        rg: v(21) || '',
        soldo: this.parseCurrency(c[22]),
        banco_nome: v(23),
        banco_codigo: v(24),
        banco_agencia: v(25),
        banco_conta: v(26),
        auxilio_transporte: this.parseBool(c[27]),
        valor_auxilio_transporte: this.parseCurrency(c[28]),
        data_nascimento: this.parseSheetDate(c[30]),
        data_praca: this.parseSheetDate(c[31]),
        data_formacao: this.parseSheetDate(c[32]),
        ultima_promocao: this.parseSheetDate(c[33]),
        proxima_promocao: vf(34),
        apresentacao_om: this.parseSheetDate(c[35]),
        tempo_localidade: vf(36),
        data_final_reengajamento: this.parseSheetDate(c[37]),
        tempo_inicio_processo: vf(38),
        fim_servico_temp: this.parseSheetDate(c[39]),
        status_reengajamento: vf(40),
        disciplina: vf(41),
        codigo_disciplina: vf(42),
        escala_risaer: vf(43),
        medalha_santos_dumont: vf(44) || 'N APLIC',
        medalha_bartolomeu_gusmao: vf(45) || 'N APLIC',
        aero_5717_ultima_pub: this.parseSheetDate(c[47]),
        aero_5717_prox_pub: vf(48),
        aero_5718_ultima_pub: this.parseSheetDate(c[50]),
        aero_5718_prox_pub: vf(51),
        ativo: true,
        observacoes: ''
      };
    },

    /**
     * Extrai a lista de seções contidas no texto do cargo/função.
     * Ex: "Chefe (DE), Adjunto (SDINT)" -> ["DE", "SDINT"]
     * Se não contiver parênteses, retorna o próprio cargo ou ["Geral"]
     */
    extrairSecoes(cargoFuncao) {
      if (!cargoFuncao || typeof cargoFuncao !== 'string') return ['Geral'];
      const regex = /\(([^)]+)\)/g;
      const secoes = [];
      let m;
      while ((m = regex.exec(cargoFuncao)) !== null) {
        const s = m[1].trim();
        if (s && !secoes.includes(s)) secoes.push(s);
      }
      if (!secoes.length) {
        const limpo = cargoFuncao.trim();
        return limpo ? [limpo] : ['Geral'];
      }
      return secoes;
    },

    /**
     * Normaliza e enriquece militar com seções formatadas e status de ciclo de vida
     */
    enriquecerMilitar(m) {
      if (!m) return m;
      const secoes = this.extrairSecoes(m.cargo_funcao);
      let statusEfetivo = m.status_efetivo;
      if (m.ativo === false && (!statusEfetivo || statusEfetivo === 'ativo')) {
        statusEfetivo = 'ex_integrante';
      } else if (!statusEfetivo) {
        statusEfetivo = 'ativo';
      }

      return {
        ...m,
        ativo: statusEfetivo !== 'ex_integrante',
        status_efetivo: statusEfetivo,
        secoes_lista: secoes,
        secao_formatada: secoes.join(', ')
      };
    },

    /**
     * Busca os militares da base central (Supabase -> Cache Local -> Google Sheets Fallback)
     */
    async fetchEfetivo({ forceRefresh = false, activeOnly = false } = {}) {
      const sb = getSbClient();
      let records = null;

      // 1. Tenta buscar do Supabase se não for forçado ignorar
      if (sb && !forceRefresh) {
        try {
          let query = sb.from('efetivo_pessoal').select('*').order('ordem', { ascending: true });
          if (activeOnly) query = query.eq('ativo', true);
          const { data, error } = await query;
          if (!error && data && data.length > 0) {
            records = data.map(m => this.enriquecerMilitar(m));
            localStorage.setItem(this.STORAGE_KEY_EFETIVO_DB, JSON.stringify(records));
            return activeOnly ? records.filter(m => m.ativo !== false && m.status_efetivo !== 'ex_integrante') : records;
          }
        } catch(e) {}
      }

      // 2. Tenta recuperar do LocalStorage
      if (!forceRefresh) {
        try {
          const cached = localStorage.getItem(this.STORAGE_KEY_EFETIVO_DB);
          if (cached) {
            records = JSON.parse(cached).map(m => this.enriquecerMilitar(m));
            if (activeOnly) records = records.filter(m => m.ativo !== false && m.status_efetivo !== 'ex_integrante');
            if (records && records.length > 0) return records;
          }
        } catch(e) {}
      }

      // 3. Fallback para Google Sheets (A1:AZ250)
      try {
        const url = `https://docs.google.com/spreadsheets/d/${this.EFETIVO_SHEET_ID}/gviz/tq?tqx=out:json&sheet=efetivo&range=A1:AZ250&headers=0`;
        const res = await fetch(url);
        const txt = await res.text();
        const jsonStr = txt.replace(/^\/\*O_o\*\/\s*google\.visualization\.Query\.setResponse\(/, '').replace(/\);?\s*$/, '');
        const data = JSON.parse(jsonStr);
        const rows = data.table.rows || [];

        const lista = [];
        for (let r = 3; r < rows.length; r++) {
          const m = this.parseEfetivoRow(rows[r]?.c || [], r);
          if (m) lista.push(this.enriquecerMilitar(m));
        }

        if (lista.length > 0) {
          records = lista;
          localStorage.setItem(this.STORAGE_KEY_EFETIVO_DB, JSON.stringify(records));
          
          // Tenta salvar em segundo plano no Supabase se disponível
          if (sb) {
            sb.from('efetivo_pessoal').upsert(records, { onConflict: 'saram' }).catch(() => {});
          }
        }
      } catch(e) {
        console.warn('Erro ao consultar planilha oficial de efetivo:', e);
      }

      const finalRecords = (records || []).map(m => this.enriquecerMilitar(m));
      return activeOnly ? finalRecords.filter(m => m.ativo !== false && m.status_efetivo !== 'ex_integrante') : finalRecords;
    },

    /**
     * Salva ou atualiza um militar diretamente no Supabase e no cache local,
     * rastreando campos editados manualmente para não regredirem na sincronização.
     */
    async saveMilitar(militar, { camposAlterados = [] } = {}) {
      if (!militar || !militar.saram) {
        throw new Error('SARAM é obrigatório para cadastrar ou editar um militar.');
      }
      militar.saram = this.formatarSARAM(militar.saram);
      militar.updated_at = new Date().toISOString();

      // Recupera lista do cache local para mesclar
      let lista = [];
      try {
        lista = JSON.parse(localStorage.getItem(this.STORAGE_KEY_EFETIVO_DB) || '[]');
      } catch(e){}
      
      const idx = lista.findIndex(m => m.saram === militar.saram);
      const anterior = idx >= 0 ? lista[idx] : null;

      // Rastreia campos alterados manualmente no site
      const camposDetectados = new Set(Array.isArray(camposAlterados) ? camposAlterados : []);
      if (anterior) {
        for (const [k, v] of Object.entries(militar)) {
          if (['id', 'created_at', 'updated_at', 'raw_data', 'secoes_lista', 'secao_formatada'].includes(k)) continue;
          if (v !== undefined && v !== anterior[k]) {
            camposDetectados.add(k);
          }
        }
      } else {
        // Se é um militar novo cadastrado no site, todos os seus campos preenchidos são manuais
        for (const [k, v] of Object.entries(militar)) {
          if (['id', 'created_at', 'updated_at', 'raw_data', 'secoes_lista', 'secao_formatada'].includes(k)) continue;
          if (v !== undefined && v !== null && v !== '') {
            camposDetectados.add(k);
          }
        }
      }

      // Preserva e atualiza o histórico de campos manuais em raw_data
      const rawDataExistente = anterior?.raw_data && typeof anterior.raw_data === 'object' ? { ...anterior.raw_data } : {};
      const rawDataNovo = militar.raw_data && typeof militar.raw_data === 'object' ? { ...militar.raw_data } : {};
      const historicoManuais = new Set([
        ...(Array.isArray(rawDataExistente.campos_manuais) ? rawDataExistente.campos_manuais : []),
        ...(Array.isArray(rawDataNovo.campos_manuais) ? rawDataNovo.campos_manuais : []),
        ...camposDetectados
      ]);
      historicoManuais.delete('updated_at');
      historicoManuais.delete('created_at');
      historicoManuais.delete('raw_data');

      const rawDataFinal = {
        ...rawDataExistente,
        ...rawDataNovo,
        campos_manuais: Array.from(historicoManuais),
        editado_no_site: true,
        ultima_edicao_site: new Date().toISOString()
      };
      militar.raw_data = rawDataFinal;

      // Objeto consolidado para o cache local
      const militarConsolidado = anterior ? { ...anterior, ...militar } : { ...militar };
      militarConsolidado.raw_data = rawDataFinal;

      if (idx >= 0) {
        lista[idx] = militarConsolidado;
      } else {
        lista.push(militarConsolidado);
      }
      localStorage.setItem(this.STORAGE_KEY_EFETIVO_DB, JSON.stringify(lista));

      // Atualiza no Supabase
      const sb = getSbClient();
      let dbOk = false;
      if (sb) {
        try {
          // Prepara objeto limpo sem propriedades computadas voláteis
          const { secoes_lista, secao_formatada, ...dadosParaBanco } = militarConsolidado;
          const { error } = await sb.from('efetivo_pessoal').upsert(dadosParaBanco, { onConflict: 'saram' });
          if (!error) dbOk = true;
          else console.warn('Aviso ao persistir no Supabase:', error.message);
        } catch(e) {
          console.warn('Falha ao persistir no Supabase (mantido no cache local):', e);
        }
      }

      return { militar: militarConsolidado, dbOk };
    },

    /**
     * Alterna o status ativo/inativo de um militar
     */
    async toggleMilitarAtivo(saram, novoStatus) {
      const s = this.formatarSARAM(saram);
      return this.saveMilitar({ saram: s, ativo: !!novoStatus });
    },

    /**
     * Sincroniza em lote a base completa a partir da planilha oficial do Google Sheets,
     * garantindo proteção total contra regressão de dados editados manualmente no site.
     */
    async syncEfetivoFromSheet(progressCb) {
      if (typeof progressCb === 'function') progressCb('Baixando dados da planilha oficial (A1:AZ250)...');
      
      const url = `https://docs.google.com/spreadsheets/d/${this.EFETIVO_SHEET_ID}/gviz/tq?tqx=out:json&sheet=efetivo&range=A1:AZ250&headers=0`;
      const res = await fetch(url);
      const txt = await res.text();
      const jsonStr = txt.replace(/^\/\*O_o\*\/\s*google\.visualization\.Query\.setResponse\(/, '').replace(/\);?\s*$/, '');
      const data = JSON.parse(jsonStr);
      const rows = data.table.rows || [];

      const listaPlanilha = [];
      for (let r = 3; r < rows.length; r++) {
        const m = this.parseEfetivoRow(rows[r]?.c || [], r);
        if (m) listaPlanilha.push(m);
      }

      if (typeof progressCb === 'function') progressCb(`${listaPlanilha.length} militares processados da planilha. Analisando edições locais e remotas…`);

      // 1. Carrega dados pré-existentes do Supabase e do LocalStorage para proteção
      const sb = getSbClient();
      const existentesMap = new Map();

      // Primeiro lê do cache local
      try {
        const cached = JSON.parse(localStorage.getItem(this.STORAGE_KEY_EFETIVO_DB) || '[]');
        cached.forEach(m => {
          if (m && m.saram) existentesMap.set(this.formatarSARAM(m.saram), m);
        });
      } catch(e) {}

      // Complementa com o Supabase se disponível
      if (sb) {
        try {
          const { data: dbData, error } = await sb.from('efetivo_pessoal').select('*');
          if (!error && dbData && dbData.length > 0) {
            dbData.forEach(m => {
              const s = this.formatarSARAM(m.saram);
              const prev = existentesMap.get(s);
              existentesMap.set(s, { ...(prev || {}), ...m });
            });
          }
        } catch(e) {
          console.warn('Erro ao carregar dados existentes do Supabase para merge:', e);
        }
      }

      // 2. Mescla inteligente preservando dados manuais
      let camposPreservadosCount = 0;
      const listaFinal = [];

      for (const mPlanilha of listaPlanilha) {
        const saram = mPlanilha.saram;
        const existente = existentesMap.get(saram);

        if (!existente) {
          // Militar novo que só existe na planilha
          listaFinal.push(mPlanilha);
          continue;
        }

        // Militar existente: funde protegendo edições manuais
        const militarMesclado = { ...mPlanilha };
        const rawExistente = existente.raw_data && typeof existente.raw_data === 'object' ? existente.raw_data : {};
        const camposManuais = Array.isArray(rawExistente.campos_manuais) ? rawExistente.campos_manuais : [];

        // Protege cada campo manual editado no site
        camposManuais.forEach(campo => {
          if (existente[campo] !== undefined && existente[campo] !== null && existente[campo] !== '') {
            militarMesclado[campo] = existente[campo];
            camposPreservadosCount++;
          }
        });

        // Protege status de ciclo de vida militar se foi alterado no site
        if (existente.status_efetivo && existente.status_efetivo !== 'ativo') {
          militarMesclado.status_efetivo = existente.status_efetivo;
          militarMesclado.ativo = existente.ativo;
        }

        // Mantém ID e metadados de histórico
        if (existente.id) militarMesclado.id = existente.id;
        if (existente.updated_at) militarMesclado.updated_at = existente.updated_at;
        militarMesclado.raw_data = {
          ...(mPlanilha.raw_data || {}),
          ...rawExistente,
          ultima_sincronizacao_planilha: new Date().toISOString()
        };

        listaFinal.push(militarMesclado);
        existentesMap.delete(saram); // Marca como processado
      }

      // 3. Preserva militares cadastrados diretamente no site (ex: homologados via admissão) que não estejam na planilha
      for (const [saram, mSite] of existentesMap.entries()) {
        if (mSite && mSite.saram) {
          listaFinal.push(mSite);
        }
      }

      if (typeof progressCb === 'function') {
        progressCb(`Mesclagem concluída (${camposPreservadosCount} campos manuais preservados). Gravando no banco…`);
      }

      // Atualiza cache local
      localStorage.setItem(this.STORAGE_KEY_EFETIVO_DB, JSON.stringify(listaFinal));

      // Gravação remota no Supabase
      let dbSuccess = false;
      let dbError = null;

      if (sb) {
        try {
          // Limpa propriedades transientes antes de enviar ao Supabase
          const dadosLimpos = listaFinal.map(m => {
            const { secoes_lista, secao_formatada, ...limpo } = m;
            return limpo;
          });
          const { error } = await sb.from('efetivo_pessoal').upsert(dadosLimpos, { onConflict: 'saram' });
          if (error) {
            dbError = error.message;
          } else {
            dbSuccess = true;
          }
        } catch(e) {
          dbError = e.message || String(e);
        }
      }

      return {
        total: listaFinal.length,
        militares: listaFinal,
        camposPreservadosCount,
        dbSuccess,
        dbError
      };
    },

    /* ══════════════════════════════════════════════════════════════
       FASE 4: ADMISSÃO DE NOVOS MILITARES & FILA DE APROVAÇÃO
       ══════════════════════════════════════════════════════════════ */
    STORAGE_KEY_SOLICITACOES: 'afa_efetivo_solicitacoes_cache_v1',

    getSolicitacoesCache() {
      try {
        const raw = localStorage.getItem(this.STORAGE_KEY_SOLICITACOES);
        return raw ? JSON.parse(raw) : [];
      } catch(e) { return []; }
    },

    saveSolicitacoesCache(lista) {
      localStorage.setItem(this.STORAGE_KEY_SOLICITACOES, JSON.stringify(lista));
    },

    /**
     * Salva rascunho de preenchimento parcial vinculado ao SARAM
     */
    async salvarRascunhoSolicitacao(saram, dados) {
      const saramNorm = this.formatarSARAM(saram);
      if (!saramNorm) throw new Error('SARAM é obrigatório para salvar o rascunho.');

      const item = {
        saram: saramNorm,
        status: 'rascunho',
        posto_grad: (dados.posto_grad || '').toUpperCase().trim(),
        especialidade: (dados.especialidade || '').toUpperCase().trim(),
        nome_guerra: (dados.nome_guerra || '').toUpperCase().trim(),
        nome_completo: (dados.nome_completo || '').toUpperCase().trim(),
        data_praca: dados.data_praca || null,
        dados: dados,
        updated_at: new Date().toISOString()
      };

      // 1. Atualiza cache local
      let lista = this.getSolicitacoesCache();
      const idx = lista.findIndex(s => s.saram === saramNorm);
      if (idx >= 0) lista[idx] = { ...lista[idx], ...item };
      else lista.push(item);
      this.saveSolicitacoesCache(lista);

      // 2. Grava no Supabase se disponível
      const sb = getSbClient();
      if (sb) {
        try {
          await sb.from('efetivo_solicitacoes').upsert([item], { onConflict: 'saram' });
        } catch(e) {
          console.warn('Rascunho salvo apenas localmente:', e.message);
        }
      }

      return item;
    },

    /**
     * Busca rascunho salvo pelo SARAM para retomada de preenchimento
     */
    async buscarRascunhoSolicitacao(saram) {
      const saramNorm = this.formatarSARAM(saram);
      if (!saramNorm) return null;

      // 1. Tenta Supabase
      const sb = getSbClient();
      if (sb) {
        try {
          const { data, error } = await sb.from('efetivo_solicitacoes')
            .select('*')
            .eq('saram', saramNorm)
            .maybeSingle();
          if (!error && data) return data;
        } catch(e) {}
      }

      // 2. Fallback LocalStorage
      const lista = this.getSolicitacoesCache();
      return lista.find(s => s.saram === saramNorm) || null;
    },

    /**
     * Envia cadastro concluído para a Fila de Aprovação da Secretaria
     */
    async enviarSolicitacaoCadastro(dados) {
      const saramNorm = this.formatarSARAM(dados.saram);
      if (!saramNorm) throw new Error('SARAM obrigatório (7 dígitos).');
      if (!dados.posto_grad || !dados.nome_guerra || !dados.nome_completo) {
        throw new Error('Campos obrigatórios pendentes: Posto/Graduação, Nome de Guerra e Nome Completo.');
      }
      if (!dados.data_praca) {
        throw new Error('A Data de Praça é obrigatória para determinar a posição de antiguidade.');
      }

      const item = {
        saram: saramNorm,
        status: 'pendente',
        posto_grad: dados.posto_grad.toUpperCase().trim(),
        especialidade: (dados.especialidade || '').toUpperCase().trim(),
        nome_guerra: dados.nome_guerra.toUpperCase().trim(),
        nome_completo: dados.nome_completo.toUpperCase().trim(),
        data_praca: dados.data_praca,
        dados: dados,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // 1. Cache Local
      let lista = this.getSolicitacoesCache();
      const idx = lista.findIndex(s => s.saram === saramNorm);
      if (idx >= 0) lista[idx] = { ...lista[idx], ...item };
      else lista.push(item);
      this.saveSolicitacoesCache(lista);

      // 2. Supabase
      const sb = getSbClient();
      if (sb) {
        try {
          await sb.from('efetivo_solicitacoes').upsert([item], { onConflict: 'saram' });
        } catch(e) {
          console.warn('Solicitação gravada apenas localmente:', e.message);
        }
      }

      window.dispatchEvent(new CustomEvent('afa_solicitacao_criada', { detail: item }));
      return item;
    },

    /**
     * Busca todas as solicitações com status 'pendente'
     */
    async fetchSolicitacoesPendentes() {
      const sb = getSbClient();
      if (sb) {
        try {
          const { data, error } = await sb.from('efetivo_solicitacoes')
            .select('*')
            .eq('status', 'pendente')
            .order('created_at', { ascending: false });
          if (!error && data) {
            return data;
          }
        } catch(e) {}
      }

      // Fallback
      const lista = this.getSolicitacoesCache();
      return lista.filter(s => s.status === 'pendente');
    },

    /**
     * Algoritmo de sugestão de posição de antiguidade baseado em Posto/Graduação + Data de Praça.
     * Retorna a ordem numérica sugerida e o "sanduíche" com os militares acima e abaixo.
     */
    async calcularPosicaoAntiguidadeSugerida(postoGrad, dataPraca, saramIgnorar = '') {
      const efetivo = await this.fetchEfetivo({ activeOnly: true });
      efetivo.sort((a, b) => (Number(a.ordem) || 999) - (Number(b.ordem) || 999));

      const postoAlvo = (postoGrad || '').toUpperCase().trim();
      const pracaAlvo = dataPraca ? new Date(dataPraca) : new Date();

      // Normaliza patentes para agrupamento
      const normPosto = p => {
        const s = (p || '').toUpperCase().trim();
        if (s === 'MJ' || s === 'MAJ') return 'MAJ';
        if (s === 'CP' || s === 'CAP') return 'CAP';
        if (s === 'CEL' || s === 'CL') return 'CL';
        if (s === 'TEN-CEL' || s === 'TC') return 'TC';
        return s;
      };

      const grupoMesmoPosto = efetivo.filter(m => 
        normPosto(m.posto_grad) === normPosto(postoAlvo) && m.saram !== saramIgnorar
      );

      let ordemSugerida = 1;

      if (grupoMesmoPosto.length > 0) {
        // Encontra o ponto de inserção por data_praca (menor data = mais antigo)
        let inserido = false;
        for (let i = 0; i < grupoMesmoPosto.length; i++) {
          const m = grupoMesmoPosto[i];
          const pracaColega = m.data_praca ? new Date(m.data_praca) : null;

          if (pracaColega && pracaAlvo < pracaColega) {
            // O novo militar tem data de praça mais antiga que este colega -> entra na posição dele!
            ordemSugerida = Number(m.ordem) || 1;
            inserido = true;
            break;
          }
        }

        if (!inserido) {
          // Entra logo após o último colega do mesmo posto
          const ultimoColega = grupoMesmoPosto[grupoMesmoPosto.length - 1];
          ordemSugerida = (Number(ultimoColega.ordem) || 1) + 1;
        }
      } else {
        // Não há ninguém com a mesma patente: insere ao final do efetivo
        ordemSugerida = efetivo.length ? (Math.max(...efetivo.map(m => Number(m.ordem) || 0)) + 1) : 1;
      }

      const vizinhos = this.obterVizinhosPorOrdem(ordemSugerida, efetivo, saramIgnorar);

      return {
        ordemSugerida,
        militarAcima: vizinhos.militarAcima,
        militarAbaixo: vizinhos.militarAbaixo,
        totalMilitares: efetivo.length,
        efetivoCompleto: efetivo
      };
    },

    /**
     * Retorna os militares vizinhos imediatos (acima e abaixo) dada uma ordem de antiguidade
     */
    obterVizinhosPorOrdem(ordemAlvo, efetivoCompleto, saramIgnorar = '') {
      const lista = efetivoCompleto
        .filter(m => m.saram !== saramIgnorar)
        .sort((a, b) => (Number(a.ordem) || 999) - (Number(b.ordem) || 999));

      // Militar Acima: o de maior ordem que seja estritamente MENOR que ordemAlvo
      const acimaCandidatos = lista.filter(m => Number(m.ordem) < ordemAlvo);
      const militarAcima = acimaCandidatos.length ? acimaCandidatos[acimaCandidatos.length - 1] : null;

      // Militar Abaixo: o de menor ordem que seja MAIOR OU IGUAL a ordemAlvo
      const abaixoCandidatos = lista.filter(m => Number(m.ordem) >= ordemAlvo);
      const militarAbaixo = abaixoCandidatos.length ? abaixoCandidatos[0] : null;

      return { militarAcima, militarAbaixo };
    },

    /**
     * Aprova a solicitação na Secretaria, reordena o efetivo e insere no banco oficial
     */
    async aprovarSolicitacaoCadastro(solicitacaoId, saram, ordemFinal, dadosCompletos, operador = 'Secretaria DE') {
      const saramNorm = this.formatarSARAM(saram);
      const ordemNum = parseInt(ordemFinal, 10) || 1;

      // 1. Busca lista atual para reordenação
      const efetivo = await this.fetchEfetivo({ activeOnly: false });
      
      // Abre espaço para a nova ordem: todos com ordem >= ordemNum sobem +1
      const militaresAtualizados = efetivo.map(m => {
        const o = Number(m.ordem) || 999;
        if (o >= ordemNum && m.saram !== saramNorm) {
          return { ...m, ordem: o + 1 };
        }
        return m;
      });

      // 2. Prepara registro oficial do novo militar
      const novoMilitar = {
        ...dadosCompletos,
        saram: saramNorm,
        ordem: ordemNum,
        posto_grad: (dadosCompletos.posto_grad || '').toUpperCase().trim(),
        especialidade: (dadosCompletos.especialidade || '').toUpperCase().trim(),
        nome_guerra: (dadosCompletos.nome_guerra || '').toUpperCase().trim(),
        nome_completo: (dadosCompletos.nome_completo || '').toUpperCase().trim(),
        ativo: true,
        updated_at: new Date().toISOString()
      };

      militaresAtualizados.push(novoMilitar);
      militaresAtualizados.sort((a, b) => (Number(a.ordem) || 999) - (Number(b.ordem) || 999));

      // 3. Salva novo efetivo
      localStorage.setItem(this.STORAGE_KEY_EFETIVO_DB, JSON.stringify(militaresAtualizados));

      const sb = getSbClient();
      if (sb) {
        try {
          // Reordena e insere no Supabase
          await sb.from('efetivo_pessoal').upsert(militaresAtualizados, { onConflict: 'saram' });

          // Marca a solicitação como aprovada
          await sb.from('efetivo_solicitacoes')
            .update({
              status: 'aprovada',
              ordem_final: ordemNum,
              aprovado_por: operador,
              aprovado_em: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('saram', saramNorm);
        } catch(e) {
          console.warn('Erro ao persistir aprovação no Supabase:', e);
        }
      }

      // Atualiza cache de solicitações
      let listaSolicitacoes = this.getSolicitacoesCache();
      const idxSolic = listaSolicitacoes.findIndex(s => s.saram === saramNorm);
      if (idxSolic >= 0) {
        listaSolicitacoes[idxSolic].status = 'aprovada';
        listaSolicitacoes[idxSolic].ordem_final = ordemNum;
        listaSolicitacoes[idxSolic].aprovado_por = operador;
        listaSolicitacoes[idxSolic].aprovado_em = new Date().toISOString();
        this.saveSolicitacoesCache(listaSolicitacoes);
      }

      window.dispatchEvent(new CustomEvent('afa_solicitacao_aprovada', { detail: novoMilitar }));
      return novoMilitar;
    },

    /* ══════════════════════════════════════════════════════════════
       FASE 3: GESTÃO DE CARGOS, DESLIGAMENTO E EX-INTEGRANTES
       ══════════════════════════════════════════════════════════════ */
    SEED_ORGANOGRAMA_CARGOS: [
      { chave_sigla: 'DE', secao_nome: 'Divisão de Ensino', titulo_exibicao: 'CHEFE', titular_saram: '3147550' },
      { chave_sigla: 'VC-DE', secao_nome: 'Vice-Chefia da Divisão de Ensino', titulo_exibicao: 'VC-DE', titular_saram: '1047612' },
      { chave_sigla: 'SEC-DE', secao_nome: 'Secretaria da Divisão de Ensino', titulo_exibicao: 'SEC-DE', titular_saram: '4311779' },
      { chave_sigla: 'CLMP', secao_nome: 'Célula de Logística de Material e Patrimônio', titulo_exibicao: 'CLMP', titular_saram: '3324346' },
      { chave_sigla: 'CADA', secao_nome: 'Subdivisão de Apoio Docente e Discente', titulo_exibicao: 'CADA', titular_saram: '3410773' },
      { chave_sigla: 'CADE', secao_nome: 'Célula de Análise de Desempenho de Ensino', titulo_exibicao: 'CADE', titular_saram: '7335326' },
      { chave_sigla: 'CAAP', secao_nome: 'Célula de Avaliação e Abordagem Psicopedagógica', titulo_exibicao: 'CAAP', titular_saram: '7272448' },
      { chave_sigla: 'CDEns', secao_nome: 'Célula de Documentação do Ensino', titulo_exibicao: 'CDEns', titular_saram: '7430540' },
      { chave_sigla: 'SED', secao_nome: 'Seção de Educação a Distância', titulo_exibicao: 'SED', titular_saram: '3962180' },
      { chave_sigla: 'SDPL', secao_nome: 'Subdivisão de Planejamento', titulo_exibicao: 'SDPL', titular_saram: '3324346' },
      { chave_sigla: 'SPE', secao_nome: 'Seção de Planejamento de Ensino', titulo_exibicao: 'SPE', titular_saram: '6482805' },
      { chave_sigla: 'SAPRE', secao_nome: 'Seção de Análise de Programação de Ensino', titulo_exibicao: 'SAPRE', titular_saram: '7488718' },
      { chave_sigla: 'SDEX', secao_nome: 'Subdivisão de Execução', titulo_exibicao: 'SDEX', titular_saram: '3256537' },
      { chave_sigla: 'SAE', secao_nome: 'Seção de Admissão e Exclusão', titulo_exibicao: 'SAE', titular_saram: '7430442' },
      { chave_sigla: 'SPI', secao_nome: 'Seção de Programas Internacionais', titulo_exibicao: 'SPI', titular_saram: '7488734' },
      { chave_sigla: 'SSE', secao_nome: 'Seção de Serviços Escolares', titulo_exibicao: 'SSE', titular_saram: '7488645' },
      { chave_sigla: 'SVA', secao_nome: 'Seção de Verificação de Aprendizagem', titulo_exibicao: 'SVA', titular_saram: '3822427' },
      { chave_sigla: 'SPPC', secao_nome: 'Subdivisão de Pesquisa e Produção Científica', titulo_exibicao: 'SPPC', titular_saram: '4200101' },
      { chave_sigla: 'CTCC', secao_nome: 'Coordenadoria de Trabalho de Conclusão de Curso', titulo_exibicao: 'CTCC', titular_saram: '7488793' },
      { chave_sigla: 'CPC', secao_nome: 'Coordenadoria de Produção Científica', titulo_exibicao: 'CPC', titular_saram: '7708408' },
      { chave_sigla: 'CPubl', secao_nome: 'Coordenadoria de Publicação', titulo_exibicao: 'CPubl', titular_saram: '7535082' },
      { chave_sigla: 'BIBLI', secao_nome: 'Biblioteca da Divisão de Ensino', titulo_exibicao: 'BIBLI', titular_saram: '7430450' },
      { chave_sigla: 'SDIA', secao_nome: 'Subdivisão de Instrução de Aviação', titulo_exibicao: 'SDIA', titular_saram: '3822141' },
      { chave_sigla: 'SDINT', secao_nome: 'Subdivisão de Instrução de Intendência', titulo_exibicao: 'SDINT', titular_saram: '1047612' },
      { chave_sigla: 'SDINF', secao_nome: 'Subdivisão de Instrução de Infantaria', titulo_exibicao: 'SDINF', titular_saram: '3834743' }
    ],

    /**
     * Busca os nós de cargos do organograma
     */
    async fetchOrganogramaCargos() {
      const sb = getSbClient();
      if (sb) {
        try {
          const { data, error } = await sb.from('cargos_organograma_estrutura').select('*');
          if (!error && data && data.length) return data;
        } catch(e) {}
      }
      try {
        const cached = localStorage.getItem('cargos_organograma_v3') || localStorage.getItem('cargos_organograma_cache');
        if (cached) return JSON.parse(cached);
      } catch(e) {}
      return this.SEED_ORGANOGRAMA_CARGOS;
    },

    /**
     * Localiza um militar por SARAM em qualquer status (ativa ou ex-integrante)
     */
    async buscarMilitar(saram) {
      const saramNorm = this.formatarSARAM(saram);
      if (!saramNorm) return null;
      const todos = await this.fetchEfetivo({ activeOnly: false });
      return todos.find(m => this.formatarSARAM(m.saram) === saramNorm) || null;
    },

    /**
     * Verifica se o militar é titular de um CARGO oficial (bloqueante para remoção)
     * Funções comuns (não-chefia) NÃO bloqueiam o desligamento.
     */
    async verificarTitularidadeCargo(saram) {
      const saramNorm = this.formatarSARAM(saram);
      if (!saramNorm) return { ehTitular: false };

      // 1. Verifica nos nós do organograma oficial
      const organo = await this.fetchOrganogramaCargos();
      const noCargo = organo.find(n => this.formatarSARAM(n.titular_saram) === saramNorm);
      if (noCargo) {
        return {
          ehTitular: true,
          origem: 'organograma',
          cargoNome: noCargo.titulo_exibicao || noCargo.secao_nome || 'Cargo Oficial no Organograma',
          secao: noCargo.chave_sigla || ''
        };
      }

      // 2. Verifica se a coluna cargo_funcao explícita cargo de comando/chefia
      const militar = await this.buscarMilitar(saramNorm);
      if (militar && militar.cargo_funcao) {
        const isCargoChefia = /\b(chefe|vice-chefe|comandante|diretor|encarregado)\b/i.test(militar.cargo_funcao);
        if (isCargoChefia) {
          return {
            ehTitular: true,
            origem: 'cargo_funcao',
            cargoNome: militar.cargo_funcao,
            secao: militar.secao_formatada || ''
          };
        }
      }

      return { ehTitular: false };
    },

    /**
     * Solicita / define status de "Em Desligamento" ou "Em Transferência" (Gera Pendência Oficial)
     */
    async solicitarDesligamentoMilitar(saram, tipoStatus, motivo = '') {
      const saramNorm = this.formatarSARAM(saram);
      const militar = await this.buscarMilitar(saramNorm);
      if (!militar) throw new Error('Militar não encontrado no cadastro.');

      if (tipoStatus !== 'em_desligamento' && tipoStatus !== 'em_transferencia') {
        throw new Error('Status de saída inválido. Use "em_desligamento" ou "em_transferencia".');
      }

      militar.status_efetivo = tipoStatus;
      militar.motivo_desligamento = motivo;
      militar.data_solicitacao_desligamento = new Date().toISOString();

      await this.saveMilitar(militar);
      window.dispatchEvent(new CustomEvent('afa_pendencia_desligamento_criada', { detail: militar }));
      return militar;
    },

    /**
     * Conclui o desligamento definitivo e transfere para a sessão de Ex-Integrantes
     * EXIGE que a passagem de cargo tenha sido realizada previamente (não pode ser titular de cargo).
     */
    async concluirDesligamentoMilitar(saram, operador = 'Secretaria DE') {
      const saramNorm = this.formatarSARAM(saram);
      const titularCheck = await this.verificarTitularidadeCargo(saramNorm);

      if (titularCheck.ehTitular) {
        throw new Error(`🚫 Remoção bloqueada: O militar ainda é titular do cargo "${titularCheck.cargoNome}" (${titularCheck.secao}). É obrigatório realizar previamente a Passagem de Cargo no módulo Cargos e Funções antes do desligamento definitivo.`);
      }

      const militar = await this.buscarMilitar(saramNorm);
      if (!militar) throw new Error('Militar não encontrado no cadastro.');

      militar.ativo = false;
      militar.status_efetivo = 'ex_integrante';
      militar.data_desligamento = new Date().toISOString().split('T')[0];
      militar.desligado_por = operador;

      await this.saveMilitar(militar);
      window.dispatchEvent(new CustomEvent('afa_militar_desligado', { detail: militar }));
      return militar;
    },

    /**
     * Reativa um militar que estava na sessão de Ex-Integrantes
     */
    async reativarMilitar(saram) {
      const saramNorm = this.formatarSARAM(saram);
      const militar = await this.buscarMilitar(saramNorm);
      if (!militar) throw new Error('Militar não encontrado no cadastro.');

      militar.ativo = true;
      militar.status_efetivo = 'ativo';
      militar.data_desligamento = null;
      militar.motivo_desligamento = null;

      await this.saveMilitar(militar);
      window.dispatchEvent(new CustomEvent('afa_militar_reativado', { detail: militar }));
      return militar;
    },

    /**
     * Retorna a lista de Ex-Integrantes (histórico preservado)
     */
    async fetchExIntegrantes() {
      const todos = await this.fetchEfetivo({ activeOnly: false });
      return todos.filter(m => m.ativo === false || m.status_efetivo === 'ex_integrante');
    },

    /**
     * Retorna militares em processo de saída ("Em Desligamento" ou "Em Transferência")
     */
    async fetchPendenciasDesligamento() {
      const todos = await this.fetchEfetivo({ activeOnly: false });
      return todos.filter(m => m.status_efetivo === 'em_desligamento' || m.status_efetivo === 'em_transferencia');
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
