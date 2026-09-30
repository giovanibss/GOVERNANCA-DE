/**
 * ══════════════════════════════════════════════════════════════════
 * AppAuth — Motor Central de Autenticação, Perfis Militares e RBAC
 * Governança DE · Academia da Força Aérea (AFA)
 * ══════════════════════════════════════════════════════════════════
 */
(function(window) {
  'use strict';

  const DEFAULT_SB_URL = 'https://sovrgsbdhdpxsaomspsp.supabase.co';
  const DEFAULT_SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvdnJnc2JkaGRweHNhb21zcHNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMjMyOTksImV4cCI6MjEwMDg5OTI5OX0.Yn8fOSNndY-LnSOQ8FsYEgcAvZCo4djEd28rmHhjNqg';

  const STORAGE_KEY_USER_PROFILE = 'afa_auth_user_profile';

  let _sb = null;
  let _currentSession = null;
  let _currentUser = null;
  let _currentProfile = null;
  let _initPromise = null;

  function getClient() {
    if (_sb) return _sb;
    const url = window.SUPABASE_URL || DEFAULT_SB_URL;
    const anon = window.SUPABASE_ANON || DEFAULT_SB_ANON;

    if (window.supabase && typeof window.supabase.createClient === 'function') {
      _sb = window.supabase.createClient(url, anon, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
      window.sbCli = _sb;
      return _sb;
    }
    return null;
  }

  const AppAuth = {
    /**
     * Inicializa a sessão, carrega o usuário logado e busca seu perfil RBAC
     */
    async init() {
      if (_initPromise) return _initPromise;

      _initPromise = (async () => {
        const sb = getClient();
        if (!sb) {
          console.warn('[AppAuth] Supabase SDK não disponível no DOM.');
          return null;
        }

        try {
          const { data: { session } } = await sb.auth.getSession();
          _currentSession = session;
          _currentUser = session ? session.user : null;

          if (_currentUser) {
            await this.refreshProfile();
          } else {
            _currentProfile = null;
            sessionStorage.removeItem(STORAGE_KEY_USER_PROFILE);
          }

          // Listener de mudanças de estado (LOGIN, LOGOUT, TOKEN_REFRESH)
          sb.auth.onAuthStateChange(async (event, session) => {
            _currentSession = session;
            _currentUser = session ? session.user : null;
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
              await this.refreshProfile();
              window.dispatchEvent(new CustomEvent('afa_auth_changed', { detail: { event, profile: _currentProfile } }));
            } else if (event === 'SIGNED_OUT') {
              _currentProfile = null;
              sessionStorage.removeItem(STORAGE_KEY_USER_PROFILE);
              sessionStorage.removeItem('secretaria_pin_ok');
              sessionStorage.removeItem('efetivo_pin_ok');
              window.dispatchEvent(new CustomEvent('afa_auth_changed', { detail: { event, profile: null } }));
            }
          });

          return { user: _currentUser, profile: _currentProfile };
        } catch (err) {
          console.error('[AppAuth] Erro ao inicializar sessão:', err);
          return null;
        }
      })();

      return _initPromise;
    },

    getClient() {
      return getClient();
    },

    getSession() {
      return _currentSession;
    },

    getUser() {
      return _currentUser;
    },

    getProfile() {
      if (_currentProfile) return _currentProfile;
      try {
        const cached = sessionStorage.getItem(STORAGE_KEY_USER_PROFILE);
        if (cached) _currentProfile = JSON.parse(cached);
      } catch (e) {}
      return _currentProfile;
    },

    async refreshProfile() {
      const sb = getClient();
      if (!sb || !_currentUser) return null;

      try {
        const { data, error } = await sb
          .from('usuarios_sistema')
          .select('*')
          .eq('id', _currentUser.id)
          .maybeSingle();

        if (data && !error) {
          _currentProfile = data;
          sessionStorage.setItem(STORAGE_KEY_USER_PROFILE, JSON.stringify(data));
          // Mantém compatibilidade com módulos antigos enquanto houver transição
          if (data.perfil === 'admin' || data.perfil === 'operador') {
            sessionStorage.setItem('secretaria_pin_ok', '1');
            sessionStorage.setItem('efetivo_pin_ok', '1');
          }
          return _currentProfile;
        }
      } catch (err) {
        console.error('[AppAuth] Erro ao carregar perfil:', err);
      }
      return null;
    },

    isAuthenticated() {
      return !!_currentUser;
    },

    isAtivo() {
      const p = this.getProfile();
      return p && p.status_aprovacao === 'ativo';
    },

    isAdmin() {
      const p = this.getProfile();
      return p && p.perfil === 'admin' && p.status_aprovacao === 'ativo';
    },

    isOperador() {
      const p = this.getProfile();
      return p && (p.perfil === 'admin' || p.perfil === 'operador') && p.status_aprovacao === 'ativo';
    },

    isCoordenador() {
      const p = this.getProfile();
      return p && (p.perfil === 'admin' || p.perfil === 'operador' || p.perfil === 'coordenador') && p.status_aprovacao === 'ativo';
    },

    hasRole(roles) {
      if (!roles || !roles.length) return true;
      const p = this.getProfile();
      if (!p || p.status_aprovacao !== 'ativo') return false;
      if (p.perfil === 'admin') return true; // Admin sempre possui acesso
      return roles.includes(p.perfil);
    },

    /**
     * Realiza login por E-mail (ou SARAM) e Senha
     */
    async login(identificador, password) {
      const sb = getClient();
      if (!sb) throw new Error('Supabase client não configurado.');

      let email = String(identificador || '').trim().toLowerCase();

      // Se o usuário digitou SARAM (somente números ou código sem @)
      if (!email.includes('@')) {
        const saramLimpo = email.replace(/\D/g, '');
        let { data: usuario } = await sb
          .from('usuarios_sistema')
          .select('email')
          .eq('saram', saramLimpo || email)
          .maybeSingle();

        // Se não encontrou em usuarios_sistema, busca em efetivo_pessoal
        if (!usuario || !usuario.email) {
          const { data: ef } = await sb
            .from('efetivo_pessoal')
            .select('email')
            .eq('saram', saramLimpo || email)
            .maybeSingle();
          if (ef && ef.email) usuario = ef;
        }

        if (usuario && usuario.email) {
          email = usuario.email.trim().toLowerCase();
        } else {
          throw new Error('SARAM não localizado no efetivo da Governança DE. Utilize seu e-mail Zimbra cadastrado.');
        }
      }

      const { data, error } = await sb.auth.signInWithPassword({
        email,
        password: String(password).trim()
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Credenciais inválidas. Verifique seu e-mail/SARAM e a senha (lembre-se: no primeiro acesso a senha é o seu SARAM).');
        }
        throw error;
      }

      _currentSession = data.session;
      _currentUser = data.user;
      await this.refreshProfile();

      // Detecta se o militar entrou com a senha inicial padrão (seu próprio SARAM)
      const saramMilitar = String(_currentProfile?.saram || '').replace(/\D/g, '');
      const saramDigitado = String(identificador || '').replace(/\D/g, '');
      if (
        (saramMilitar && String(password).trim() === saramMilitar) ||
        (saramDigitado && String(password).trim() === saramDigitado) ||
        _currentProfile?.senha_padrao_saram === true
      ) {
        sessionStorage.setItem('afa_trocar_senha_aviso', '1');
      }

      // Registra timestamp do último login
      try {
        await sb.from('usuarios_sistema')
          .update({ ultimo_login: new Date().toISOString() })
          .eq('id', data.user.id);
      } catch (e) {}

      return { user: _currentUser, profile: _currentProfile };
    },

    /**
     * Cadastro autônomo de novo militar no sistema ("Cadastrável")
     */
    async register({ email, password, saram, cpf, nomeCompleto, nomeGuerra, postoGrad, secaoSigla }) {
      const sb = getClient();
      if (!sb) throw new Error('Supabase client não configurado.');

      const cleanEmail = String(email || '').trim().toLowerCase();
      const cleanSaram = String(saram || '').trim().replace(/\D/g, '');
      const cleanCpf = String(cpf || '').trim();
      const cleanGuerra = String(nomeGuerra || '').trim().toUpperCase();
      const cleanCompleto = String(nomeCompleto || '').trim().toUpperCase();

      if (!cleanEmail || !password || !cleanSaram || !cleanGuerra || !postoGrad) {
        throw new Error('Preencha todos os campos obrigatórios (E-mail, Senha, SARAM, Posto e Nome de Guerra).');
      }

      if (password.length < 8) {
        throw new Error('A senha deve conter no mínimo 8 caracteres.');
      }

      // Cria a conta no Supabase Auth com metadados militares completos
      const { data, error } = await sb.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            saram: cleanSaram,
            cpf: cleanCpf,
            nome_completo: cleanCompleto,
            nome_guerra: cleanGuerra,
            posto_grad: postoGrad,
            secao_sigla: secaoSigla || 'DE'
          }
        }
      });

      if (error) throw error;

      _currentUser = data.user;
      _currentSession = data.session;
      if (_currentUser) {
        await this.refreshProfile();
      }

      return { user: data.user, session: data.session };
    },

    /**
     * Envia e-mail de recuperação de senha oficial
     */
    async resetPassword(email) {
      const sb = getClient();
      if (!sb) throw new Error('Supabase client não configurado.');
      const redirectUrl = `${window.location.origin}${window.location.pathname.replace(/\/[^/]*$/, '/login.html?redefinir=1')}`;
      const { data, error } = await sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: redirectUrl
      });
      if (error) throw error;
      return data;
    },

    /**
     * Atualiza a senha do usuário autenticado
     */
    async updatePassword(newPassword) {
      const sb = getClient();
      if (!sb) throw new Error('Supabase client não configurado.');
      if (newPassword.length < 8) {
        throw new Error('A nova senha deve ter no mínimo 8 caracteres.');
      }
      const { data, error } = await sb.auth.updateUser({ password: newPassword });
      if (error) throw error;
      return data;
    },

    /**
     * Encerra a sessão e limpa os dados locais
     */
    async logout(redirectUrl = 'login.html') {
      const sb = getClient();
      try {
        if (sb) await sb.auth.signOut();
      } catch (e) {}

      _currentSession = null;
      _currentUser = null;
      _currentProfile = null;
      sessionStorage.clear();
      localStorage.removeItem('afa_auth_user_profile');

      if (redirectUrl) {
        window.location.href = redirectUrl;
      }
    },

    /**
     * Busca militar no catálogo oficial de efetivo para autocompletar cadastro
     */
    async findMilitarNoEfetivo(saram) {
      const sb = getClient();
      if (!sb) return null;
      const saramClean = String(saram || '').trim().replace(/\D/g, '');
      if (!saramClean || saramClean.length < 5) return null;

      try {
        const { data, error } = await sb
          .from('efetivo_pessoal')
          .select('posto_grad, especialidade, nome_guerra, nome_completo, email, cargo_funcao, ramal, saram, cpf')
          .eq('saram', saramClean)
          .maybeSingle();

        if (data && !error) return data;
      } catch (e) {}
      return null;
    },

    /**
     * Guarda de Rotas: intercepta páginas restritas e redireciona se necessário
     */
    async requireAuth({ allowedRoles = [], redirect = true } = {}) {
      await this.init();

      const paginaAtual = window.location.pathname.split('/').pop() || 'index.html';

      // 1. Usuário não autenticado
      if (!this.isAuthenticated()) {
        if (redirect) {
          const destino = encodeURIComponent(paginaAtual + window.location.search + window.location.hash);
          window.location.href = `login.html?redirect=${destino}`;
        }
        return false;
      }

      const p = this.getProfile();

      // 2. Usuário cadastrado, mas pendente de homologação pela Secretaria
      if (!p || p.status_aprovacao === 'pendente') {
        this.renderBloqueioPendente();
        return false;
      }

      // 3. Usuário bloqueado
      if (p.status_aprovacao === 'bloqueado') {
        this.renderBloqueioGeral('Acesso Revogado', 'Sua conta de acesso foi bloqueada pela administração da Secretaria da Divisão de Ensino.');
        return false;
      }

      // 4. Checagem de papel / permissão necessária
      if (allowedRoles.length > 0 && !this.hasRole(allowedRoles)) {
        this.renderBloqueioGeral('Acesso Não Autorizado', `Este módulo exige permissão restrita [${allowedRoles.join(', ')}]. Seu perfil atual é: [${p.perfil}].`);
        return false;
      }

      return true;
    },

    /**
     * Tela de bloqueio quando o cadastro está pendente de homologação
     */
    renderBloqueioPendente() {
      const p = this.getProfile() || {};
      const html = `
        <div style="position:fixed;inset:0;background:#061021;z-index:999999;display:flex;align-items:center;justify-content:center;padding:1.5rem;font-family:'Inter',system-ui,sans-serif;color:#cfe4ff;">
          <div style="max-width:540px;width:100%;background:rgba(10,23,45,.88);border:1px solid rgba(212,168,75,.4);border-radius:16px;padding:2.5rem;text-align:center;box-shadow:0 25px 60px rgba(0,0,0,.7);backdrop-filter:blur(12px);">
            <div style="font-size:3.5rem;margin-bottom:1rem;">⏳</div>
            <h2 style="font-family:'Oswald',sans-serif;font-size:1.8rem;color:#d4a84b;text-transform:uppercase;letter-spacing:1px;margin-bottom:.5rem;">Cadastro em Homologação</h2>
            <p style="font-size:1rem;line-height:1.5;color:rgba(207,228,255,.8);margin-bottom:1.5rem;">
              Olá, <b>${p.posto_grad || ''} ${p.nome_guerra || 'Militar'}</b> (SARAM: ${p.saram || '---'}).<br/>
              Sua conta foi criada com sucesso, mas o acesso aos módulos administrativos requer liberação da <b>Secretaria da Divisão de Ensino</b>.
            </p>
            <div style="background:rgba(212,168,75,.08);border:1px dashed rgba(212,168,75,.3);border-radius:10px;padding:1rem;font-size:.85rem;color:#e9c877;margin-bottom:2rem;text-align:left;">
              💡 <b>Próximo Passo:</b> Entre em contato com a Secretaria DE (Ramal 7992 / 7815) informando seu SARAM para ter seu perfil homologado (Operador, Coordenador ou Militar).
            </div>
            <div style="display:flex;gap:1rem;justify-content:center;">
              <button onclick="window.AppAuth.logout('index.html')" style="padding:.75rem 1.5rem;background:transparent;border:1px solid rgba(207,228,255,.3);color:#cfe4ff;border-radius:8px;cursor:pointer;font-weight:600;">Página Inicial</button>
              <button onclick="window.AppAuth.logout('login.html')" style="padding:.75rem 1.5rem;background:#d4a84b;border:none;color:#061021;border-radius:8px;cursor:pointer;font-weight:700;">Trocar Usuário</button>
            </div>
          </div>
        </div>
      `;
      document.body.innerHTML = html;
    },

    renderBloqueioGeral(titulo, mensagem) {
      const html = `
        <div style="position:fixed;inset:0;background:#061021;z-index:999999;display:flex;align-items:center;justify-content:center;padding:1.5rem;font-family:'Inter',system-ui,sans-serif;color:#cfe4ff;">
          <div style="max-width:500px;width:100%;background:rgba(10,23,45,.9);border:1px solid rgba(239,68,68,.4);border-radius:16px;padding:2.5rem;text-align:center;box-shadow:0 25px 60px rgba(0,0,0,.7);">
            <div style="font-size:3.2rem;margin-bottom:1rem;">🚫</div>
            <h2 style="font-family:'Oswald',sans-serif;font-size:1.8rem;color:#f87171;text-transform:uppercase;margin-bottom:.5rem;">${titulo}</h2>
            <p style="font-size:.95rem;line-height:1.5;color:rgba(207,228,255,.8);margin-bottom:2rem;">${mensagem}</p>
            <button onclick="window.location.href='index.html'" style="padding:.75rem 1.5rem;background:#d4a84b;border:none;color:#061021;border-radius:8px;cursor:pointer;font-weight:700;">Voltar ao Painel Central</button>
          </div>
        </div>
      `;
      document.body.innerHTML = html;
    },

    /**
     * Injeta uma barra superior unificada de identificação do militar logado
     */
    renderUserBar(targetContainer) {
      const p = this.getProfile();
      let container = null;

      if (typeof targetContainer === 'string') {
        container = document.querySelector(targetContainer);
      } else if (targetContainer instanceof HTMLElement) {
        container = targetContainer;
      }

      if (!container) {
        container = document.createElement('div');
        container.id = 'afa-user-topbar';
        document.body.insertBefore(container, document.body.firstChild);
      }

      if (!this.isAuthenticated()) {
        container.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:.4rem 1.2rem;background:rgba(6,16,33,.85);border-bottom:1px solid rgba(207,228,255,.12);font-family:'Inter',sans-serif;font-size:.82rem;color:rgba(207,228,255,.7);">
            <div style="display:flex;align-items:center;gap:.6rem;">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#f59e0b;"></span>
              <span>Modo Consulta Pública (Não Autenticado)</span>
            </div>
            <a href="login.html?redirect=${encodeURIComponent(window.location.pathname.split('/').pop() || 'index.html')}" style="color:#d4a84b;text-decoration:none;font-weight:600;display:inline-flex;align-items:center;gap:.35rem;padding:.25rem .75rem;border:1px solid rgba(212,168,75,.4);border-radius:6px;background:rgba(212,168,75,.08);transition:all .2s;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
              Acessar / Entrar
            </a>
          </div>
        `;
        return;
      }

      const roleBadgeColors = {
        admin: { bg: 'rgba(212,168,75,.18)', border: '#d4a84b', text: '#ffd37a', label: 'ADMINISTRADOR' },
        operador: { bg: 'rgba(52,211,153,.15)', border: '#34d399', text: '#6ee7b7', label: 'SECRETARIA DE' },
        coordenador: { bg: 'rgba(96,165,250,.15)', border: '#60a5fa', text: '#93c5fd', label: 'COORDENAÇÃO' },
        militar: { bg: 'rgba(207,228,255,.12)', border: 'rgba(207,228,255,.3)', text: '#cfe4ff', label: 'MILITAR' }
      };

      const roleInfo = roleBadgeColors[p.perfil] || roleBadgeColors.militar;

      container.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:.38rem 1.2rem;background:rgba(6,16,33,.92);border-bottom:1px solid rgba(212,168,75,.25);font-family:'Inter',sans-serif;font-size:.82rem;color:#cfe4ff;backdrop-filter:blur(8px);position:relative;z-index:9999;">
          <div style="display:flex;align-items:center;gap:.75rem;">
            <img src="assets/cocar-fab.png" style="width:16px;height:16px;object-fit:contain;" alt="FAB" />
            <span><b>${p.posto_grad || ''} ${p.nome_guerra || 'Militar'}</b> <span style="opacity:.6;font-size:.78rem;">(SARAM: ${p.saram || '---'})</span></span>
            <span style="background:${roleInfo.bg};border:1px solid ${roleInfo.border};color:${roleInfo.text};padding:1px 7px;border-radius:10px;font-size:.7rem;font-weight:700;letter-spacing:.5px;">${roleInfo.label}</span>
          </div>
          <div style="display:flex;align-items:center;gap:1rem;">
            <a href="index.html" style="color:rgba(207,228,255,.75);text-decoration:none;font-size:.78rem;" title="Painel Inicial">Início</a>
            <button onclick="window.AppAuth.logout()" style="background:transparent;border:none;color:#f87171;cursor:pointer;font-size:.78rem;font-weight:600;display:inline-flex;align-items:center;gap:.35rem;padding:2px 6px;border-radius:4px;" title="Encerrar sessão com segurança">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Sair
            </button>
          </div>
        </div>
      `;
    }
  };

  window.AppAuth = AppAuth;

  // Auto-inicialização quando o DOM carregar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AppAuth.init());
  } else {
    AppAuth.init();
  }

})(window);
