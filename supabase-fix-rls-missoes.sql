-- ============================================================
-- GOVERNANÇA DE / ACADEMIA DA FORÇA AÉREA (AFA)
-- SCRIPT DE CORREÇÃO IMEDIATA DE RLS: RESTAURAÇÃO DAS MISSÕES & EFETIVO
-- Arquivo: supabase-fix-rls-missoes.sql
-- ============================================================

-- 1. CONCEDE PERMISSÕES BÁSICAS DE USO E ACESSO AOS ROLES DO SUPABASE
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- 2. TABELA DE MISSÕES E GRATIFICAÇÃO (gratificacao_representacao)
-- Restabelece a visibilidade das missões no módulo Diárias/Missões e no Hub
ALTER TABLE public.gratificacao_representacao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permissao Total Anon Gratificacao" ON public.gratificacao_representacao;
DROP POLICY IF EXISTS "Permissao Total Anon gratificacao_representacao" ON public.gratificacao_representacao;
DROP POLICY IF EXISTS "Staff gerencia gratificacao" ON public.gratificacao_representacao;
DROP POLICY IF EXISTS "Leitura publica gratificacao" ON public.gratificacao_representacao;
DROP POLICY IF EXISTS "Gravacao gratificacao" ON public.gratificacao_representacao;

-- Leitura pública para que qualquer usuário/militar visualize as escalas e OMIS da Divisão de Ensino
CREATE POLICY "Leitura publica gratificacao"
ON public.gratificacao_representacao FOR SELECT
USING (true);

-- Permissão total de gravação e gerenciamento
CREATE POLICY "Gravacao gratificacao"
ON public.gratificacao_representacao FOR ALL
USING (true)
WITH CHECK (true);


-- 3. TABELA DE CONTROLE DE PROCESSOS DE OS (controle_os_processos)
ALTER TABLE public.controle_os_processos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permissao Total Anon Controle" ON public.controle_os_processos;
DROP POLICY IF EXISTS "Permissao Total Anon controle_os_processos" ON public.controle_os_processos;
DROP POLICY IF EXISTS "Staff gerencia controle_os" ON public.controle_os_processos;
DROP POLICY IF EXISTS "Leitura publica controle_os" ON public.controle_os_processos;
DROP POLICY IF EXISTS "Gravacao controle_os" ON public.controle_os_processos;

CREATE POLICY "Leitura publica controle_os"
ON public.controle_os_processos FOR SELECT
USING (true);

CREATE POLICY "Gravacao controle_os"
ON public.controle_os_processos FOR ALL
USING (true)
WITH CHECK (true);


-- 4. TABELAS DE DIÁRIAS OS E CONFIGURAÇÃO (diarias_os & diarias_config)
ALTER TABLE public.diarias_os ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diarias_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permissao Total Anon diarias_os" ON public.diarias_os;
DROP POLICY IF EXISTS "Staff gerencia diarias_os" ON public.diarias_os;
DROP POLICY IF EXISTS "Leitura publica diarias_os" ON public.diarias_os;
DROP POLICY IF EXISTS "Gravacao diarias_os" ON public.diarias_os;

CREATE POLICY "Leitura publica diarias_os"
ON public.diarias_os FOR SELECT
USING (true);

CREATE POLICY "Gravacao diarias_os"
ON public.diarias_os FOR ALL
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Permissao Total Anon diarias_config" ON public.diarias_config;
DROP POLICY IF EXISTS "Staff gerencia diarias_config" ON public.diarias_config;
DROP POLICY IF EXISTS "Militares ativos leem diarias_config" ON public.diarias_config;
DROP POLICY IF EXISTS "Leitura publica diarias_config" ON public.diarias_config;
DROP POLICY IF EXISTS "Gravacao diarias_config" ON public.diarias_config;

CREATE POLICY "Leitura publica diarias_config"
ON public.diarias_config FOR SELECT
USING (true);

CREATE POLICY "Gravacao diarias_config"
ON public.diarias_config FOR ALL
USING (true)
WITH CHECK (true);


-- 5. TABELA DE SOLICITAÇÕES DE MISSÃO (solicitacoes_missao)
ALTER TABLE public.solicitacoes_missao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permissao Total Anon Solicitacoes" ON public.solicitacoes_missao;
DROP POLICY IF EXISTS "Permissao Total Anon solicitacoes_missao" ON public.solicitacoes_missao;
DROP POLICY IF EXISTS "Militares criam solicitacoes missao" ON public.solicitacoes_missao;
DROP POLICY IF EXISTS "Staff gerencia solicitacoes missao" ON public.solicitacoes_missao;
DROP POLICY IF EXISTS "Militares leem proprias solicitacoes" ON public.solicitacoes_missao;
DROP POLICY IF EXISTS "Acesso total solicitacoes_missao" ON public.solicitacoes_missao;

CREATE POLICY "Acesso total solicitacoes_missao"
ON public.solicitacoes_missao FOR ALL
USING (true)
WITH CHECK (true);


-- 6. TABELA DE MILITARES EXTERNOS (militares_externos)
ALTER TABLE public.militares_externos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permissao Total Anon Externos" ON public.militares_externos;
DROP POLICY IF EXISTS "Acesso total militares_externos" ON public.militares_externos;

CREATE POLICY "Acesso total militares_externos"
ON public.militares_externos FOR ALL
USING (true)
WITH CHECK (true);


-- 7. TABELA DE EFETIVO PESSOAL (efetivo_pessoal)
-- Leitura pública para autocompletar cadastro via SARAM, dropdowns dos módulos e busca no Hero
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


-- 8. TABELA DE USUÁRIOS DO SISTEMA (usuarios_sistema)
-- Permite leitura para consulta de email via SARAM no formulário de login
ALTER TABLE public.usuarios_sistema ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura publica usuarios_sistema" ON public.usuarios_sistema;
CREATE POLICY "Leitura publica usuarios_sistema"
ON public.usuarios_sistema FOR SELECT
USING (true);


-- 9. PUBLICAÇÃO DO REALTIME NO SUPABASE
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.gratificacao_representacao;
  EXCEPTION WHEN duplicate_object THEN END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.controle_os_processos;
  EXCEPTION WHEN duplicate_object THEN END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.solicitacoes_missao;
  EXCEPTION WHEN duplicate_object THEN END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.diarias_os;
  EXCEPTION WHEN duplicate_object THEN END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.diarias_config;
  EXCEPTION WHEN duplicate_object THEN END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.efetivo_pessoal;
  EXCEPTION WHEN duplicate_object THEN END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.usuarios_sistema;
  EXCEPTION WHEN duplicate_object THEN END;
END $$;
