-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: RESET DE SENHA POR ADMINS E MEMBROS DA SECRETARIA (SEM PIN)
-- Projeto: Governança DE · Academia da Força Aérea
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. FUNÇÃO RPC: admin_resetar_senha_usuario
-- Regras de Negócio:
-- • Administradores gerenciam senhas de Administradores e de todos os demais membros.
-- • Membros da Secretaria (operadores) gerenciam senhas de qualquer membro comum,
--   mas NÃO possuem permissão para alterar senha de Administradores.
-- • Executada com SECURITY DEFINER para acessar auth.users com segurança controlada.

CREATE OR REPLACE FUNCTION public.admin_resetar_senha_usuario(
  p_target_user_id UUID,
  p_nova_senha TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_id UUID;
  v_caller_perfil TEXT;
  v_caller_status TEXT;
  v_target_email TEXT;
  v_target_saram TEXT;
  v_target_nome TEXT;
  v_target_perfil TEXT;
  v_is_saram_default BOOLEAN;
BEGIN
  -- Identifica o usuário que está executando a chamada via JWT
  v_caller_id := auth.uid();

  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Acesso não autenticado. Faça login no sistema militar.';
  END IF;

  -- Valida se o chamador possui perfil de Administrador ou Operador (Secretaria) ativo
  SELECT perfil, status_aprovacao INTO v_caller_perfil, v_caller_status
  FROM public.usuarios_sistema
  WHERE id = v_caller_id;

  IF v_caller_perfil IS NULL OR v_caller_status <> 'ativo' OR v_caller_perfil NOT IN ('admin', 'operador', 'secretaria', 'gestor') THEN
    RAISE EXCEPTION 'Acesso negado: apenas Administradores e membros da Secretaria podem gerenciar senhas.';
  END IF;

  -- Validação do tamanho mínimo da nova senha
  IF p_nova_senha IS NULL OR LENGTH(TRIM(p_nova_senha)) < 4 THEN
    RAISE EXCEPTION 'A nova senha deve conter pelo menos 4 caracteres.';
  END IF;

  -- Localiza os dados e perfil do militar alvo
  SELECT email, saram, COALESCE(nome_guerra, nome_completo), perfil
  INTO v_target_email, v_target_saram, v_target_nome, v_target_perfil
  FROM public.usuarios_sistema
  WHERE id = p_target_user_id;

  IF v_target_email IS NULL THEN
    RAISE EXCEPTION 'Militar não encontrado na base de usuários (ID: %)', p_target_user_id;
  END IF;

  -- Regra estrita: Membros da Secretaria NÃO podem resetar senha de Administrador
  IF v_target_perfil = 'admin' AND v_caller_perfil <> 'admin' THEN
    RAISE EXCEPTION 'Acesso negado: Membros da Secretaria não possuem permissão para alterar senha de Administrador. Solicite a um Administrador.';
  END IF;

  -- Se a nova senha for igual ao SARAM, marca a flag para forçar o aviso de troca no primeiro login
  v_is_saram_default := (TRIM(p_nova_senha) = TRIM(COALESCE(v_target_saram, '')));

  -- 1. Atualiza o hash da senha em auth.users
  UPDATE auth.users
  SET
    encrypted_password = crypt(TRIM(p_nova_senha), gen_salt('bf', 10)),
    updated_at = now()
  WHERE id = p_target_user_id;

  -- 2. Atualiza os metadados de controle em public.usuarios_sistema
  UPDATE public.usuarios_sistema
  SET
    senha_padrao_saram = v_is_saram_default,
    updated_at = now()
  WHERE id = p_target_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_target_user_id,
    'email', v_target_email,
    'saram', v_target_saram,
    'nome', v_target_nome,
    'target_perfil', v_target_perfil,
    'caller_perfil', v_caller_perfil,
    'senha_padrao_saram', v_is_saram_default,
    'message', 'Senha atualizada com sucesso.'
  );
END;
$$;

-- Permite a execução da RPC por qualquer usuário autenticado (a checagem de perfil é feita dentro da função)
GRANT EXECUTE ON FUNCTION public.admin_resetar_senha_usuario(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION public.admin_resetar_senha_usuario IS 'Permite que administradores e membros da secretaria redefinam senhas com base na hierarquia militar.';
