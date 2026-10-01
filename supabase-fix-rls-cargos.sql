-- ==============================================================================
-- GOVERNANÇA DE / ACADEMIA DA FORÇA AÉREA (AFA)
-- SCRIPT DE CORREÇÃO DEFINITIVA DE RLS: MÓDULO DE CARGOS E FUNÇÕES
-- Restauração da visibilidade e gravação de Solicitações de Publicações e Transmissões
-- Arquivo: supabase-fix-rls-cargos.sql
-- ==============================================================================

-- 1. CONCEDE PERMISSÕES BÁSICAS DE USO E ACESSO AOS ROLES DO SUPABASE
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- 2. TABELA DE SOLICITAÇÕES DE CARGOS E TRANSMISSÕES (cargos_solicitacoes)
-- Garante que todas as solicitações apareçam para os chefes, operadores, militares e na Secretaria
ALTER TABLE public.cargos_solicitacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permissao Total Anon cargos_solicitacoes" ON public.cargos_solicitacoes;
DROP POLICY IF EXISTS "Permitir leitura cargos_solicitacoes" ON public.cargos_solicitacoes;
DROP POLICY IF EXISTS "Permitir insercao cargos_solicitacoes" ON public.cargos_solicitacoes;
DROP POLICY IF EXISTS "Permitir update cargos_solicitacoes" ON public.cargos_solicitacoes;
DROP POLICY IF EXISTS "Permitir delete cargos_solicitacoes" ON public.cargos_solicitacoes;
DROP POLICY IF EXISTS "Militares criam solicitacao cargo" ON public.cargos_solicitacoes;
DROP POLICY IF EXISTS "Staff gerencia solicitacao cargo" ON public.cargos_solicitacoes;
DROP POLICY IF EXISTS "Leitura publica cargos_solicitacoes" ON public.cargos_solicitacoes;
DROP POLICY IF EXISTS "Gravacao cargos_solicitacoes" ON public.cargos_solicitacoes;

-- Leitura irrestrita para que o painel de publicações/transmissões, a aba Minha Função e os badges do Hub carreguem normalmente
CREATE POLICY "Leitura publica cargos_solicitacoes"
ON public.cargos_solicitacoes FOR SELECT
USING (true);

-- Permissão total de gravação, atualização de status e exclusão
CREATE POLICY "Gravacao cargos_solicitacoes"
ON public.cargos_solicitacoes FOR ALL
USING (true)
WITH CHECK (true);


-- 3. TABELA DE CONFIGURAÇÃO DO MÓDULO DE CARGOS (cargos_config)
-- Permite leitura de códigos de motivo (1138, 1139, 9208, 9209) e email do SREG
ALTER TABLE public.cargos_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permissao Total Anon cargos_config" ON public.cargos_config;
DROP POLICY IF EXISTS "Permitir leitura cargos_config" ON public.cargos_config;
DROP POLICY IF EXISTS "Permitir insercao cargos_config" ON public.cargos_config;
DROP POLICY IF EXISTS "Permitir update cargos_config" ON public.cargos_config;
DROP POLICY IF EXISTS "Permitir delete cargos_config" ON public.cargos_config;
DROP POLICY IF EXISTS "Staff gerencia cargos_config" ON public.cargos_config;
DROP POLICY IF EXISTS "Leitura publica cargos_config" ON public.cargos_config;
DROP POLICY IF EXISTS "Gravacao cargos_config" ON public.cargos_config;

CREATE POLICY "Leitura publica cargos_config"
ON public.cargos_config FOR SELECT
USING (true);

CREATE POLICY "Gravacao cargos_config"
ON public.cargos_config FOR ALL
USING (true)
WITH CHECK (true);


-- 4. TABELA DE MILITARES COM ATRIBUIÇÃO ATIVA (cargos_militares_ativos)
ALTER TABLE public.cargos_militares_ativos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permissao Total Anon cargos_militares_ativos" ON public.cargos_militares_ativos;
DROP POLICY IF EXISTS "Permitir leitura cargos_militares_ativos" ON public.cargos_militares_ativos;
DROP POLICY IF EXISTS "Permitir insercao cargos_militares_ativos" ON public.cargos_militares_ativos;
DROP POLICY IF EXISTS "Permitir update cargos_militares_ativos" ON public.cargos_militares_ativos;
DROP POLICY IF EXISTS "Permitir delete cargos_militares_ativos" ON public.cargos_militares_ativos;
DROP POLICY IF EXISTS "Leitura cargos_militares_ativos" ON public.cargos_militares_ativos;
DROP POLICY IF EXISTS "Staff edita cargos_militares_ativos" ON public.cargos_militares_ativos;
DROP POLICY IF EXISTS "Leitura publica cargos_militares_ativos" ON public.cargos_militares_ativos;
DROP POLICY IF EXISTS "Gravacao cargos_militares_ativos" ON public.cargos_militares_ativos;

CREATE POLICY "Leitura publica cargos_militares_ativos"
ON public.cargos_militares_ativos FOR SELECT
USING (true);

CREATE POLICY "Gravacao cargos_militares_ativos"
ON public.cargos_militares_ativos FOR ALL
USING (true)
WITH CHECK (true);


-- 5. TABELAS DE SEÇÕES E CATÁLOGO (cargos_secoes & cargos_catalogo)
ALTER TABLE public.cargos_secoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargos_catalogo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permissao Total Anon cargos_secoes" ON public.cargos_secoes;
DROP POLICY IF EXISTS "Permitir leitura cargos_secoes" ON public.cargos_secoes;
DROP POLICY IF EXISTS "Leitura cargos_secoes" ON public.cargos_secoes;
DROP POLICY IF EXISTS "Staff edita cargos_secoes" ON public.cargos_secoes;
DROP POLICY IF EXISTS "Gravacao cargos_secoes" ON public.cargos_secoes;

CREATE POLICY "Leitura cargos_secoes"
ON public.cargos_secoes FOR SELECT
USING (true);

CREATE POLICY "Gravacao cargos_secoes"
ON public.cargos_secoes FOR ALL
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Permissao Total Anon cargos_catalogo" ON public.cargos_catalogo;
DROP POLICY IF EXISTS "Permitir leitura cargos_catalogo" ON public.cargos_catalogo;
DROP POLICY IF EXISTS "Leitura cargos_catalogo" ON public.cargos_catalogo;
DROP POLICY IF EXISTS "Staff edita cargos_catalogo" ON public.cargos_catalogo;
DROP POLICY IF EXISTS "Gravacao cargos_catalogo" ON public.cargos_catalogo;

CREATE POLICY "Leitura cargos_catalogo"
ON public.cargos_catalogo FOR SELECT
USING (true);

CREATE POLICY "Gravacao cargos_catalogo"
ON public.cargos_catalogo FOR ALL
USING (true)
WITH CHECK (true);


-- 6. TABELA DE ESTRUTURA DO ORGANOGRAMA (cargos_organograma_estrutura)
CREATE TABLE IF NOT EXISTS public.cargos_organograma_estrutura (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave_sigla TEXT UNIQUE NOT NULL,
  parent_sigla TEXT,
  secao_nome TEXT NOT NULL,
  titulo_exibicao TEXT NOT NULL,
  tipo_no TEXT DEFAULT 'secao',
  ordem INT DEFAULT 0,
  nivel INT DEFAULT 1,
  titular_saram TEXT,
  titular_posto TEXT,
  titular_nome TEXT,
  categoria TEXT DEFAULT 'oficial',
  membros_extras JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.cargos_organograma_estrutura ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura cargos_organograma_estrutura" ON public.cargos_organograma_estrutura;
DROP POLICY IF EXISTS "Permitir insercao cargos_organograma_estrutura" ON public.cargos_organograma_estrutura;
DROP POLICY IF EXISTS "Permitir update cargos_organograma_estrutura" ON public.cargos_organograma_estrutura;
DROP POLICY IF EXISTS "Permitir delete cargos_organograma_estrutura" ON public.cargos_organograma_estrutura;
DROP POLICY IF EXISTS "Leitura cargos_organograma_estrutura" ON public.cargos_organograma_estrutura;
DROP POLICY IF EXISTS "Gravacao cargos_organograma_estrutura" ON public.cargos_organograma_estrutura;

CREATE POLICY "Leitura cargos_organograma_estrutura"
ON public.cargos_organograma_estrutura FOR SELECT
USING (true);

CREATE POLICY "Gravacao cargos_organograma_estrutura"
ON public.cargos_organograma_estrutura FOR ALL
USING (true)
WITH CHECK (true);


-- 7. BUCKET DE STORAGE PARA BOLETINS (PDF)
INSERT INTO storage.buckets (id, name, public)
VALUES ('boletins', 'boletins', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Permitir upload boletins" ON storage.objects;
DROP POLICY IF EXISTS "Permitir leitura boletins" ON storage.objects;
DROP POLICY IF EXISTS "Permitir update boletins" ON storage.objects;
DROP POLICY IF EXISTS "Permitir delete boletins" ON storage.objects;

CREATE POLICY "Permitir leitura boletins"
ON storage.objects FOR SELECT
USING (bucket_id = 'boletins');

CREATE POLICY "Permitir upload boletins"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'boletins');

CREATE POLICY "Permitir update boletins"
ON storage.objects FOR UPDATE
USING (bucket_id = 'boletins');

CREATE POLICY "Permitir delete boletins"
ON storage.objects FOR DELETE
USING (bucket_id = 'boletins');


-- 8. PUBLICAÇÃO REALTIME
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cargos_solicitacoes;
  EXCEPTION WHEN duplicate_object THEN END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cargos_militares_ativos;
  EXCEPTION WHEN duplicate_object THEN END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cargos_secoes;
  EXCEPTION WHEN duplicate_object THEN END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cargos_catalogo;
  EXCEPTION WHEN duplicate_object THEN END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cargos_config;
  EXCEPTION WHEN duplicate_object THEN END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cargos_organograma_estrutura;
  EXCEPTION WHEN duplicate_object THEN END;
END $$;
