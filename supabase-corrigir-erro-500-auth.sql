-- ==============================================================================
-- GOVERNANÇA DE / ACADEMIA DA FORÇA AÉREA (AFA)
-- SCRIPT DE CORREÇÃO DO ERRO 500 NO SUPABASE AUTH (Database error querying schema)
-- Arquivo: supabase-corrigir-erro-500-auth.sql
-- ==============================================================================

-- 1. CORREÇÃO DAS COLUNAS DE TEXTO EM auth.users (Elimina o Scan error do GoTrue)
-- O motor de autenticação Go do Supabase (GoTrue) exige string vazia ('') em vez de NULL
UPDATE auth.users
SET
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change = COALESCE(email_change, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  phone_change = COALESCE(phone_change, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  reauthentication_token = COALESCE(reauthentication_token, ''),
  is_sso_user = COALESCE(is_sso_user, false)
WHERE confirmation_token IS NULL
   OR recovery_token IS NULL
   OR email_change_token_new IS NULL
   OR email_change IS NULL
   OR email_change_token_current IS NULL
   OR phone_change IS NULL
   OR phone_change_token IS NULL
   OR reauthentication_token IS NULL
   OR is_sso_user IS NULL;


-- 2. GARANTIR IDENTIDADES VÁLIDAS EM auth.identities
-- O GoTrue vincula o login por email através da tabela auth.identities
DELETE FROM auth.identities WHERE provider = 'email';

INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT
  u.id,
  u.id,
  jsonb_build_object('sub', u.id::text, 'email', LOWER(TRIM(u.email))),
  'email',
  u.id::text,
  now(),
  now(),
  now()
FROM auth.users u;


-- 3. GARANTIR A SENHA E PERFIL DO ADMINISTRADOR (1S Halfeld)
-- Senha inicial: 6088651 | Perfil: admin
UPDATE auth.users
SET
  encrypted_password = crypt('6088651', gen_salt('bf', 10)),
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  raw_user_meta_data = jsonb_build_object(
    'nome_completo', 'RAMON HALFELD MARANHÃO',
    'nome_guerra', 'HALFELD',
    'posto_grad', '1S',
    'saram', '6088651'
  ),
  updated_at = now()
WHERE email = 'halfeldrhm@fab.mil.br';

UPDATE public.usuarios_sistema
SET
  perfil = 'admin',
  status_aprovacao = 'ativo',
  posto_grad = '1S',
  nome_completo = 'RAMON HALFELD MARANHÃO',
  updated_at = now()
WHERE email = 'halfeldrhm@fab.mil.br' OR saram = '6088651';


-- 4. ATUALIZAR A FUNÇÃO public.criar_ou_atualizar_usuario_auth PARA PREVENIR ERROS FUTUROS
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

  -- Atualiza identidade
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

  -- Atualiza tabela pública
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
