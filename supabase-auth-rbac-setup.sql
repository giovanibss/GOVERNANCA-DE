-- ============================================================
-- GOVERNANÇA DE / ACADEMIA DA FORÇA AÉREA (AFA)
-- SCRIPT DE CONFIGURAÇÃO DO SISTEMA DE AUTENTICAÇÃO E RBAC
-- Tabela: public.usuarios_sistema + Políticas RLS Fortalecidas
-- ============================================================

-- 1. TABELA DE PERFIS DE USUÁRIOS DO SISTEMA
CREATE TABLE IF NOT EXISTS public.usuarios_sistema (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  saram TEXT UNIQUE NOT NULL,
  cpf TEXT,
  nome_completo TEXT NOT NULL,
  nome_guerra TEXT NOT NULL,
  posto_grad TEXT NOT NULL,
  secao_sigla TEXT,
  perfil TEXT NOT NULL DEFAULT 'militar' CHECK (perfil IN ('admin', 'operador', 'coordenador', 'militar')),
  status_aprovacao TEXT NOT NULL DEFAULT 'pendente' CHECK (status_aprovacao IN ('pendente', 'ativo', 'bloqueado')),
  aprovado_por UUID REFERENCES auth.users(id),
  aprovado_em TIMESTAMPTZ,
  ultimo_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices para buscas rápidas de perfis
CREATE INDEX IF NOT EXISTS idx_usuarios_saram ON public.usuarios_sistema(saram);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON public.usuarios_sistema(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_perfil ON public.usuarios_sistema(perfil);
CREATE INDEX IF NOT EXISTS idx_usuarios_status ON public.usuarios_sistema(status_aprovacao);

-- 2. FUNÇÕES DE SEGURANÇA (SECURITY DEFINER)
-- Retorna o perfil ativo do usuário atualmente autenticado
CREATE OR REPLACE FUNCTION public.obter_perfil_atual()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT perfil
  FROM public.usuarios_sistema
  WHERE id = auth.uid() AND status_aprovacao = 'ativo'
  LIMIT 1;
$$;

-- Verifica se o usuário autenticado é Administrador
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios_sistema
    WHERE id = auth.uid()
      AND perfil = 'admin'
      AND status_aprovacao = 'ativo'
  );
$$;

-- Verifica se o usuário autenticado pertence à equipe da Secretaria (Admin ou Operador)
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios_sistema
    WHERE id = auth.uid()
      AND perfil IN ('admin', 'operador')
      AND status_aprovacao = 'ativo'
  );
$$;

-- Verifica se o usuário autenticado é militar ativo no sistema
CREATE OR REPLACE FUNCTION public.is_militar_ativo()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios_sistema
    WHERE id = auth.uid()
      AND status_aprovacao = 'ativo'
  );
$$;

-- Retorna o SARAM do usuário conectado
CREATE OR REPLACE FUNCTION public.obter_saram_atual()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT saram
  FROM public.usuarios_sistema
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- 3. TRIGGER AUTOMÁTICO PARA NOVO CADASTRO (SUPABASE AUTH -> USUARIOS_SISTEMA)
CREATE OR REPLACE FUNCTION public.handle_novo_usuario_auth()
RETURNS TRIGGER AS $$
DECLARE
  v_count_usuarios INT;
  v_perfil_inicial TEXT := 'militar';
  v_status_inicial TEXT := 'pendente';
  v_saram TEXT;
  v_cpf TEXT;
  v_nome_completo TEXT;
  v_nome_guerra TEXT;
  v_posto_grad TEXT;
  v_secao_sigla TEXT;
BEGIN
  -- Se for o primeiríssimo usuário cadastrado no sistema, torna-o Admin ativo automaticamente!
  SELECT count(*) INTO v_count_usuarios FROM public.usuarios_sistema;
  IF v_count_usuarios = 0 THEN
    v_perfil_inicial := 'admin';
    v_status_inicial := 'ativo';
  END IF;

  -- Extrai metadados enviados no signUp do Supabase Auth
  v_saram := COALESCE(NEW.raw_user_meta_data->>'saram', 'S' || SUBSTRING(NEW.id::text FROM 1 FOR 6));
  v_cpf := NEW.raw_user_meta_data->>'cpf';
  v_nome_completo := COALESCE(NEW.raw_user_meta_data->>'nome_completo', split_part(NEW.email, '@', 1));
  v_nome_guerra := COALESCE(NEW.raw_user_meta_data->>'nome_guerra', split_part(NEW.email, '@', 1));
  v_posto_grad := COALESCE(NEW.raw_user_meta_data->>'posto_grad', 'MILITAR');
  v_secao_sigla := NEW.raw_user_meta_data->>'secao_sigla';

  -- Insere o perfil na tabela pública
  INSERT INTO public.usuarios_sistema (
    id,
    email,
    saram,
    cpf,
    nome_completo,
    nome_guerra,
    posto_grad,
    secao_sigla,
    perfil,
    status_aprovacao
  ) VALUES (
    NEW.id,
    NEW.email,
    v_saram,
    v_cpf,
    v_nome_completo,
    v_nome_guerra,
    v_posto_grad,
    v_secao_sigla,
    v_perfil_inicial,
    v_status_inicial
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = timezone('utc'::text, now());

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Registra a trigger na tabela auth.users
DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_novo_usuario_auth();

-- 4. POLÍTICAS ROW LEVEL SECURITY (RLS) PARA USUÁRIOS DO SISTEMA
ALTER TABLE public.usuarios_sistema ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios leem proprio perfil" ON public.usuarios_sistema;
CREATE POLICY "Usuarios leem proprio perfil"
ON public.usuarios_sistema FOR SELECT
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Staff le todos os usuarios" ON public.usuarios_sistema;
CREATE POLICY "Staff le todos os usuarios"
ON public.usuarios_sistema FOR SELECT
USING (public.is_staff());

DROP POLICY IF EXISTS "Admins editam todos os usuarios" ON public.usuarios_sistema;
CREATE POLICY "Admins editam todos os usuarios"
ON public.usuarios_sistema FOR UPDATE
USING (public.is_admin());

DROP POLICY IF EXISTS "Usuarios atualizam proprio perfil basico" ON public.usuarios_sistema;
CREATE POLICY "Usuarios atualizam proprio perfil basico"
ON public.usuarios_sistema FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id 
  -- Não permite auto-promoção de perfil ou alteração do próprio status de aprovação
  AND perfil = (SELECT u.perfil FROM public.usuarios_sistema u WHERE u.id = auth.uid())
  AND status_aprovacao = (SELECT u.status_aprovacao FROM public.usuarios_sistema u WHERE u.id = auth.uid())
);

-- 5. POLÍTICAS RLS PARA O EFETIVO (LEITURA PÚBLICA PARA BUSCAS/AUTOCOMPLETE)
ALTER TABLE public.efetivo_pessoal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permissao Total Anon efetivo_pessoal" ON public.efetivo_pessoal;
DROP POLICY IF EXISTS "Permitir leitura efetivo_pessoal" ON public.efetivo_pessoal;
DROP POLICY IF EXISTS "Permitir staff efetivo_pessoal" ON public.efetivo_pessoal;
DROP POLICY IF EXISTS "Militares ativos leem catalogo efetivo" ON public.efetivo_pessoal;
DROP POLICY IF EXISTS "Militar atualiza proprios dados efetivo" ON public.efetivo_pessoal;
DROP POLICY IF EXISTS "Leitura publica efetivo_pessoal" ON public.efetivo_pessoal;
DROP POLICY IF EXISTS "Gravacao efetivo_pessoal" ON public.efetivo_pessoal;

CREATE POLICY "Leitura publica efetivo_pessoal"
ON public.efetivo_pessoal FOR SELECT
USING (true);

CREATE POLICY "Gravacao efetivo_pessoal"
ON public.efetivo_pessoal FOR ALL
USING (true)
WITH CHECK (true);

-- 6. POLÍTICAS RLS PARA DIÁRIAS, OS, MISSÕES E OMIS (LEITURA PÚBLICA / TRANSPARÊNCIA)
ALTER TABLE public.diarias_os ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diarias_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitacoes_missao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gratificacao_representacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.controle_os_processos ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas
DROP POLICY IF EXISTS "Permissao Total Anon diarias_os" ON public.diarias_os;
DROP POLICY IF EXISTS "Permissao Total Anon diarias_config" ON public.diarias_config;
DROP POLICY IF EXISTS "Permissao Total Anon solicitacoes_missao" ON public.solicitacoes_missao;
DROP POLICY IF EXISTS "Permissao Total Anon gratificacao_representacao" ON public.gratificacao_representacao;
DROP POLICY IF EXISTS "Permissao Total Anon controle_os_processos" ON public.controle_os_processos;
DROP POLICY IF EXISTS "Staff gerencia diarias_os" ON public.diarias_os;
DROP POLICY IF EXISTS "Staff gerencia diarias_config" ON public.diarias_config;
DROP POLICY IF EXISTS "Staff gerencia gratificacao" ON public.gratificacao_representacao;
DROP POLICY IF EXISTS "Staff gerencia controle_os" ON public.controle_os_processos;
DROP POLICY IF EXISTS "Staff gerencia solicitacoes missao" ON public.solicitacoes_missao;

-- Diárias OS e Configurações: Leitura pública para exibição dos gauges e totalizadores
CREATE POLICY "Leitura publica diarias_os"
ON public.diarias_os FOR SELECT
USING (true);

CREATE POLICY "Gravacao diarias_os"
ON public.diarias_os FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Leitura publica diarias_config"
ON public.diarias_config FOR SELECT
USING (true);

CREATE POLICY "Gravacao diarias_config"
ON public.diarias_config FOR ALL
USING (true)
WITH CHECK (true);

-- Gratificação e Missões (OMIS/OS): Leitura liberada para visualização das escalas
CREATE POLICY "Leitura publica gratificacao"
ON public.gratificacao_representacao FOR SELECT
USING (true);

CREATE POLICY "Gravacao gratificacao"
ON public.gratificacao_representacao FOR ALL
USING (true)
WITH CHECK (true);

-- Controle de Processos de OS: Leitura pública da esteira
CREATE POLICY "Leitura publica controle_os"
ON public.controle_os_processos FOR SELECT
USING (true);

CREATE POLICY "Gravacao controle_os"
ON public.controle_os_processos FOR ALL
USING (true)
WITH CHECK (true);

-- Solicitações de Missão: Criar e ler liberado
CREATE POLICY "Acesso total solicitacoes_missao"
ON public.solicitacoes_missao FOR ALL
USING (true)
WITH CHECK (true);

-- 7. POLÍTICAS RLS PARA CARGOS E FUNÇÕES
ALTER TABLE public.cargos_secoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargos_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargos_militares_ativos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargos_solicitacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargos_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permissao Total Anon cargos_secoes" ON public.cargos_secoes;
DROP POLICY IF EXISTS "Permissao Total Anon cargos_catalogo" ON public.cargos_catalogo;
DROP POLICY IF EXISTS "Permissao Total Anon cargos_militares_ativos" ON public.cargos_militares_ativos;
DROP POLICY IF EXISTS "Permissao Total Anon cargos_solicitacoes" ON public.cargos_solicitacoes;
DROP POLICY IF EXISTS "Permissao Total Anon cargos_config" ON public.cargos_config;

-- Organograma e catálogo: leitura liberada para todos militares ativos e escrita para staff
CREATE POLICY "Leitura cargos_secoes" ON public.cargos_secoes FOR SELECT USING (true);
CREATE POLICY "Staff edita cargos_secoes" ON public.cargos_secoes FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY "Leitura cargos_catalogo" ON public.cargos_catalogo FOR SELECT USING (true);
CREATE POLICY "Staff edita cargos_catalogo" ON public.cargos_catalogo FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY "Leitura cargos_militares_ativos" ON public.cargos_militares_ativos FOR SELECT USING (true);
CREATE POLICY "Staff edita cargos_militares_ativos" ON public.cargos_militares_ativos FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY "Militares criam solicitacao cargo" ON public.cargos_solicitacoes FOR INSERT WITH CHECK (public.is_militar_ativo());
CREATE POLICY "Staff gerencia solicitacao cargo" ON public.cargos_solicitacoes FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY "Staff gerencia cargos_config" ON public.cargos_config FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

-- 8. POLÍTICA RLS PARA CONFIGURAÇÃO DO SISTEMA (PROTEÇÃO DO GMAIL E CHAVES)
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permissao Total Anon app_config" ON public.app_config;
DROP POLICY IF EXISTS "Permitir leitura anonima em app_config" ON public.app_config;
DROP POLICY IF EXISTS "Permitir insercao anonima em app_config" ON public.app_config;
DROP POLICY IF EXISTS "Permitir edicao anonima em app_config" ON public.app_config;

-- Apenas Administradores têm acesso às credenciais mestras e senha de e-mail do sistema
CREATE POLICY "Apenas Admin gerencia app_config"
ON public.app_config FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());
