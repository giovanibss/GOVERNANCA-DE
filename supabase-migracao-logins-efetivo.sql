-- ==============================================================================
-- GOVERNANÇA DE / ACADEMIA DA FORÇA AÉREA (AFA)
-- MIGRAÇÃO DE LOGINS AUTOMÁTICOS DO EFETIVO + PROMOÇÃO DE ADMIN + CORREÇÃO RLS
-- Arquivo: supabase-migracao-logins-efetivo.sql
-- ==============================================================================

-- 1. HABILITAR EXTENSÃO CRIPTOGRÁFICA
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. RESTABELECER PERMISSÕES E DESBLOQUEIO DE MISSÕES E EFETIVO (RLS)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- 2.1 Visibilidade pública de Missões (gratificacao_representacao)
ALTER TABLE public.gratificacao_representacao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permissao Total Anon Gratificacao" ON public.gratificacao_representacao;
DROP POLICY IF EXISTS "Permissao Total Anon gratificacao_representacao" ON public.gratificacao_representacao;
DROP POLICY IF EXISTS "Staff gerencia gratificacao" ON public.gratificacao_representacao;
DROP POLICY IF EXISTS "Leitura publica gratificacao" ON public.gratificacao_representacao;
DROP POLICY IF EXISTS "Gravacao gratificacao" ON public.gratificacao_representacao;

CREATE POLICY "Leitura publica gratificacao" ON public.gratificacao_representacao FOR SELECT USING (true);
CREATE POLICY "Gravacao gratificacao" ON public.gratificacao_representacao FOR ALL USING (true) WITH CHECK (true);

-- 2.2 Visibilidade pública da Esteira de Processos de OS (controle_os_processos)
ALTER TABLE public.controle_os_processos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permissao Total Anon Controle" ON public.controle_os_processos;
DROP POLICY IF EXISTS "Permissao Total Anon controle_os_processos" ON public.controle_os_processos;
DROP POLICY IF EXISTS "Staff gerencia controle_os" ON public.controle_os_processos;
DROP POLICY IF EXISTS "Leitura publica controle_os" ON public.controle_os_processos;
DROP POLICY IF EXISTS "Gravacao controle_os" ON public.controle_os_processos;

CREATE POLICY "Leitura publica controle_os" ON public.controle_os_processos FOR SELECT USING (true);
CREATE POLICY "Gravacao controle_os" ON public.controle_os_processos FOR ALL USING (true) WITH CHECK (true);

-- 2.3 Visibilidade de Diárias e Totais (diarias_os e diarias_config)
ALTER TABLE public.diarias_os ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diarias_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permissao Total Anon diarias_os" ON public.diarias_os;
DROP POLICY IF EXISTS "Staff gerencia diarias_os" ON public.diarias_os;
DROP POLICY IF EXISTS "Leitura publica diarias_os" ON public.diarias_os;
DROP POLICY IF EXISTS "Gravacao diarias_os" ON public.diarias_os;

CREATE POLICY "Leitura publica diarias_os" ON public.diarias_os FOR SELECT USING (true);
CREATE POLICY "Gravacao diarias_os" ON public.diarias_os FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permissao Total Anon diarias_config" ON public.diarias_config;
DROP POLICY IF EXISTS "Staff gerencia diarias_config" ON public.diarias_config;
DROP POLICY IF EXISTS "Leitura publica diarias_config" ON public.diarias_config;
DROP POLICY IF EXISTS "Gravacao diarias_config" ON public.diarias_config;

CREATE POLICY "Leitura publica diarias_config" ON public.diarias_config FOR SELECT USING (true);
CREATE POLICY "Gravacao diarias_config" ON public.diarias_config FOR ALL USING (true) WITH CHECK (true);

-- 2.4 Visibilidade de Solicitações e Militares Externos
ALTER TABLE public.solicitacoes_missao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total solicitacoes_missao" ON public.solicitacoes_missao;
CREATE POLICY "Acesso total solicitacoes_missao" ON public.solicitacoes_missao FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.militares_externos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total militares_externos" ON public.militares_externos;
CREATE POLICY "Acesso total militares_externos" ON public.militares_externos FOR ALL USING (true) WITH CHECK (true);

-- 2.5 Visibilidade do Efetivo Pessoal
ALTER TABLE public.efetivo_pessoal ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permissao Total Anon efetivo_pessoal" ON public.efetivo_pessoal;
DROP POLICY IF EXISTS "Permitir leitura efetivo_pessoal" ON public.efetivo_pessoal;
DROP POLICY IF EXISTS "Permitir staff efetivo_pessoal" ON public.efetivo_pessoal;
DROP POLICY IF EXISTS "Leitura publica efetivo_pessoal" ON public.efetivo_pessoal;
DROP POLICY IF EXISTS "Gravacao efetivo_pessoal" ON public.efetivo_pessoal;

CREATE POLICY "Leitura publica efetivo_pessoal" ON public.efetivo_pessoal FOR SELECT USING (true);
CREATE POLICY "Gravacao efetivo_pessoal" ON public.efetivo_pessoal FOR ALL USING (true) WITH CHECK (true);

-- 2.6 Visibilidade de Usuários do Sistema
ALTER TABLE public.usuarios_sistema ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura publica usuarios_sistema" ON public.usuarios_sistema;
CREATE POLICY "Leitura publica usuarios_sistema" ON public.usuarios_sistema FOR SELECT USING (true);

DROP POLICY IF EXISTS "Gravacao publica usuarios_sistema" ON public.usuarios_sistema;
CREATE POLICY "Gravacao publica usuarios_sistema" ON public.usuarios_sistema FOR ALL USING (true) WITH CHECK (true);


-- 3. ADICIONAR COLUNA PARA CONTROLE DE TROCA DE SENHA INICIAL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'usuarios_sistema' 
      AND column_name = 'senha_padrao_saram'
  ) THEN
    ALTER TABLE public.usuarios_sistema ADD COLUMN senha_padrao_saram BOOLEAN DEFAULT true;
  END IF;
END $$;


-- 4. FUNÇÃO CENTRAL: CRIAR OU ATUALIZAR CONTA EM auth.users E public.usuarios_sistema
CREATE OR REPLACE FUNCTION public.criar_ou_atualizar_usuario_auth(
  p_email TEXT,
  p_senha TEXT,
  p_saram TEXT,
  p_nome_completo TEXT,
  p_nome_guerra TEXT,
  p_posto_grad TEXT,
  p_secao_sigla TEXT DEFAULT NULL,
  p_perfil TEXT DEFAULT 'militar',
  p_status_aprovacao TEXT DEFAULT 'ativo'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id UUID;
  v_clean_email TEXT := LOWER(TRIM(p_email));
  v_clean_saram TEXT := TRIM(p_saram);
  v_clean_senha TEXT := TRIM(p_senha);
  v_enc_pass TEXT;
BEGIN
  IF v_clean_email IS NULL OR v_clean_email = '' OR v_clean_senha IS NULL OR v_clean_senha = '' THEN
    RETURN NULL;
  END IF;

  v_enc_pass := crypt(v_clean_senha, gen_salt('bf', 10));

  -- Busca se já existe em auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_clean_email LIMIT 1;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      email_change_token_current,
      phone_change,
      phone_change_token,
      reauthentication_token,
      is_sso_user,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_clean_email,
      v_enc_pass,
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object(
        'saram', v_clean_saram,
        'nome_completo', p_nome_completo,
        'nome_guerra', p_nome_guerra,
        'posto_grad', p_posto_grad,
        'secao_sigla', p_secao_sigla
      ),
      '', '', '', '', '', '', '', '',
      false,
      now(),
      now()
    );
  ELSE
    -- Atualiza senha e garante que email está confirmado e tokens sanitizados
    UPDATE auth.users
    SET
      encrypted_password = v_enc_pass,
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      confirmation_token = COALESCE(confirmation_token, ''),
      recovery_token = COALESCE(recovery_token, ''),
      email_change_token_new = COALESCE(email_change_token_new, ''),
      email_change = COALESCE(email_change, ''),
      email_change_token_current = COALESCE(email_change_token_current, ''),
      phone_change = COALESCE(phone_change, ''),
      phone_change_token = COALESCE(phone_change_token, ''),
      reauthentication_token = COALESCE(reauthentication_token, ''),
      is_sso_user = COALESCE(is_sso_user, false),
      raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
        'saram', v_clean_saram,
        'nome_completo', p_nome_completo,
        'nome_guerra', p_nome_guerra,
        'posto_grad', p_posto_grad,
        'secao_sigla', p_secao_sigla
      ),
      updated_at = now()
    WHERE id = v_user_id;
  END IF;

  -- Garante registro na tabela de identidades do Supabase GoTrue
  BEGIN
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_clean_email),
      'email',
      v_user_id::text,
      now(),
      now(),
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      identity_data = jsonb_build_object('sub', v_user_id::text, 'email', v_clean_email),
      provider_id = v_user_id::text,
      updated_at = now();
  EXCEPTION WHEN OTHERS THEN
    -- Fallback para schemas com chave composta (provider, identity_id)
    BEGIN
      INSERT INTO auth.identities (
        provider_id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
      ) VALUES (
        v_user_id::text,
        v_user_id,
        jsonb_build_object('sub', v_user_id::text, 'email', v_clean_email),
        'email',
        now(),
        now(),
        now()
      )
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      -- Se a estrutura de identities for gerenciada dinamicamente, prossegue
    END;
  END;

  -- Insere ou atualiza na tabela pública usuarios_sistema
  INSERT INTO public.usuarios_sistema (
    id,
    email,
    saram,
    nome_completo,
    nome_guerra,
    posto_grad,
    secao_sigla,
    perfil,
    status_aprovacao,
    senha_padrao_saram,
    aprovado_em,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    v_clean_email,
    v_clean_saram,
    COALESCE(p_nome_completo, split_part(v_clean_email, '@', 1)),
    COALESCE(p_nome_guerra, split_part(v_clean_email, '@', 1)),
    COALESCE(p_posto_grad, 'MILITAR'),
    p_secao_sigla,
    p_perfil,
    p_status_aprovacao,
    true,
    now(),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    saram = EXCLUDED.saram,
    nome_completo = COALESCE(EXCLUDED.nome_completo, public.usuarios_sistema.nome_completo),
    nome_guerra = COALESCE(EXCLUDED.nome_guerra, public.usuarios_sistema.nome_guerra),
    posto_grad = COALESCE(EXCLUDED.posto_grad, public.usuarios_sistema.posto_grad),
    secao_sigla = COALESCE(EXCLUDED.secao_sigla, public.usuarios_sistema.secao_sigla),
    perfil = CASE WHEN p_perfil = 'admin' THEN 'admin' ELSE public.usuarios_sistema.perfil END,
    status_aprovacao = 'ativo',
    updated_at = now();

  RETURN v_user_id;
END;
$$;


-- 5. TRIGGER AUTOMÁTICO: AO COMPLETAR / SALVAR NOVO MILITAR NO EFETIVO
CREATE OR REPLACE FUNCTION public.trg_auto_criar_login_efetivo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_saram_clean TEXT;
  v_email_clean TEXT;
BEGIN
  v_saram_clean := TRIM(REGEXP_REPLACE(COALESCE(NEW.saram, ''), '\D', '', 'g'));
  v_email_clean := LOWER(TRIM(COALESCE(NEW.email, '')));

  -- Gera conta se tiver e-mail válido com @ e saram com pelo menos 4 dígitos
  IF v_email_clean LIKE '%@%' AND LENGTH(v_saram_clean) >= 4 THEN
    PERFORM public.criar_ou_atualizar_usuario_auth(
      v_email_clean,
      v_saram_clean, -- Senha inicial padrão = SARAM
      v_saram_clean,
      NEW.nome_completo,
      NEW.nome_guerra,
      NEW.posto_grad,
      NEW.cargo_funcao,
      'militar',
      'ativo'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_efetivo_auto_login ON public.efetivo_pessoal;
CREATE TRIGGER trg_efetivo_auto_login
AFTER INSERT OR UPDATE OF email, saram, nome_guerra, nome_completo, posto_grad ON public.efetivo_pessoal
FOR EACH ROW EXECUTE FUNCTION public.trg_auto_criar_login_efetivo();


-- 6. MIGRAÇÃO EM MASSA: GERAR LOGINS PARA TODOS OS MILITARES EXISTENTES
DO $$
DECLARE
  r RECORD;
  v_saram TEXT;
  v_email TEXT;
  v_total INT := 0;
BEGIN
  FOR r IN (
    SELECT * FROM public.efetivo_pessoal
    WHERE email IS NOT NULL 
      AND email LIKE '%@%' 
      AND saram IS NOT NULL
  ) LOOP
    v_saram := TRIM(REGEXP_REPLACE(r.saram, '\D', '', 'g'));
    v_email := LOWER(TRIM(r.email));

    IF LENGTH(v_saram) >= 4 AND v_email LIKE '%@%' THEN
      PERFORM public.criar_ou_atualizar_usuario_auth(
        v_email,
        v_saram, -- Senha inicial = SARAM
        v_saram,
        r.nome_completo,
        r.nome_guerra,
        r.posto_grad,
        r.cargo_funcao,
        'militar',
        'ativo'
      );
      v_total := v_total + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'Total de militares migrados para o sistema de login: %', v_total;
END $$;


-- 7. PROMOÇÃO DIRETA DO ADMINISTRADOR: halfeldrhm@fab.mil.br (SARAM: 6088651)
SELECT public.criar_ou_atualizar_usuario_auth(
  'halfeldrhm@fab.mil.br',
  '6088651',                        -- Senha inicial para o primeiro login
  '6088651',                        -- SARAM
  'RODRIGO HENRIQUE MOREIRA HALFELD', -- Nome Completo
  'HALFELD',                         -- Nome de Guerra
  'CAP',                            -- Posto
  'DE',                             -- Seção
  'admin',                          -- Perfil: ADMINISTRADOR TOTAL
  'ativo'                           -- Status: ATIVO
);

-- Garante perfil admin explicitamente na tabela
UPDATE public.usuarios_sistema
SET perfil = 'admin', status_aprovacao = 'ativo'
WHERE email = 'halfeldrhm@fab.mil.br' OR saram = '6088651';
