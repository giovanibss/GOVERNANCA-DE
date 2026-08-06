/**
 * ═══════════════════════════════════════════════════════════
 * AppConfig — Motor Central de Configurações, PIN e Gmail API
 * Governança DE · Academia da Força Aérea
 * ═══════════════════════════════════════════════════════════
 */
(function(window) {
  'use strict';

  const STORAGE_KEY_PIN = 'secretaria_pin';
  const STORAGE_KEY_GMAIL = 'app_gmail_config';
  const DEFAULT_PIN = '123456';

  let _cachedConfig = null;

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

      // 1. Atualiza no cache e local storage
      localStorage.setItem(STORAGE_KEY_PIN, pinLimpo);
      localStorage.setItem('efetivo_pin', pinLimpo);
      if (_cachedConfig) _cachedConfig.pin = pinLimpo;

      // 2. Atualiza no Supabase na tabela oficial at_config (existente no projeto)
      const sb = getSbClient();
      if (sb) {
        try {
          await sb.from('at_config').upsert({ id: 'default', pin: pinLimpo });
        } catch(e) {}

        try {
          await sb.from('cur_config').upsert({ id: 'default', pin: pinLimpo });
        } catch(e) {}

        // Tenta salvar na app_config APENAS se a tabela já estiver habilitada
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

      // Grava no LocalStorage (garantido e instantâneo)
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

      // Grava no Supabase se a tabela app_config existir
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
     * Envia um e-mail utilizando as credenciais da API do Gmail / Senha de App configurada
     */
    async sendEmail({ to, subject, html, text }) {
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
        subject: String(subject || 'Notificação - Governança DE').trim(),
        html: html || '',
        text: text || ''
      };

      if (!payload.to) {
        throw new Error('Endereço de e-mail do destinatário não informado.');
      }

      // Tenta enviar utilizando SmtpJS (smtp.gmail.com com Senha de App) ou Web Relay configurado
      const relayUrl = localStorage.getItem('gmail_relay_url');
      if (relayUrl && relayUrl.startsWith('http')) {
        try {
          const res = await fetch(relayUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: payload.to,
              subject: payload.subject,
              html: payload.html || payload.text,
              text: payload.text || payload.html,
              user: payload.user,
              appPassword: payload.appPassword,
              senderName: payload.senderName
            })
          });
          if (res.ok) {
            return { success: true, message: 'E-mail enviado com sucesso via Web Relay!' };
          }
        } catch(e) {
          console.warn('[AppConfig] Relay HTTP falhou, tentando transporte SmtpJS...', e.message);
        }
      }

      // Envio via SmtpJS usando smtp.gmail.com e Senha de Aplicativo (16 dígitos)
      try {
        if (!window.Email || typeof window.Email.send !== 'function') {
          await new Promise((resolve) => {
            const s = document.createElement('script');
            s.src = 'assets/js/smtp.js';
            s.onload = resolve;
            s.onerror = () => {
              // Se falhar o script local, tenta fallback CDN
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
    }
  };

  // Inicializa a configuração do LocalStorage e agenda a sincronização remota
  AppConfig.getPin(); // aquece o cache local
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(() => AppConfig.loadConfig(), 100));
  } else {
    setTimeout(() => AppConfig.loadConfig(), 100);
  }

  window.AppConfig = AppConfig;
})(window);
