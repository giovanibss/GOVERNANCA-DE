-- ============================================================
-- MÓDULO DE CARGOS E FUNÇÕES (AFA / DE)
-- Script de Criação e Configuração de Tabelas no Supabase
-- ============================================================

-- 1. Tabela de Seções
CREATE TABLE IF NOT EXISTS public.cargos_secoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT UNIQUE NOT NULL,
  sigla TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de Catálogo de Cargos e Funções por Seção
CREATE TABLE IF NOT EXISTS public.cargos_catalogo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  secao_id UUID REFERENCES public.cargos_secoes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('cargo', 'funcao')),
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela de Militares com Atribuição Ativa (para consulta 'Minha Função/Cargo' e bloqueio de exclusão)
CREATE TABLE IF NOT EXISTS public.cargos_militares_ativos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saram TEXT UNIQUE NOT NULL,
  posto_grad TEXT,
  nome TEXT NOT NULL,
  cpf TEXT,
  secao_id UUID REFERENCES public.cargos_secoes(id) ON DELETE SET NULL,
  secao_nome TEXT,
  tipo TEXT CHECK (tipo IN ('cargo', 'funcao')),
  cargo_funcao_nome TEXT,
  data_assuncao DATE,
  boletim_publicacao TEXT,
  boletim_data DATE,
  siloms_num TEXT,
  origem TEXT DEFAULT 'sistema',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Garantir que a constraint UNIQUE exista caso a tabela já tenha sido criada anteriormente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'cargos_militares_ativos_saram_unique' OR conname = 'cargos_militares_ativos_saram_key'
  ) THEN
    ALTER TABLE public.cargos_militares_ativos 
    ADD CONSTRAINT cargos_militares_ativos_saram_unique UNIQUE (saram);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cargos_militares_saram ON public.cargos_militares_ativos (saram);
CREATE INDEX IF NOT EXISTS idx_cargos_militares_secao ON public.cargos_militares_ativos (secao_id);

-- 4. Tabela de Solicitações de Publicação e Tramitação
CREATE TABLE IF NOT EXISTS public.cargos_solicitacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  tipo TEXT NOT NULL CHECK (tipo IN ('cargo', 'funcao')),
  acao_tipo TEXT DEFAULT 'designacao',
  secao_id UUID REFERENCES public.cargos_secoes(id) ON DELETE SET NULL,
  secao_nome TEXT NOT NULL,
  cargo_funcao_nome TEXT NOT NULL,
  solicitante_nome TEXT,
  solicitante_saram TEXT,
  solicitante_cpf TEXT,
  solicitante_email TEXT,
  militar_designado_nome TEXT,
  militar_designado_saram TEXT,
  militar_designado_posto TEXT,
  militar_designado_cpf TEXT,
  militar_dispensado_nome TEXT,
  militar_dispensado_saram TEXT,
  militar_dispensado_posto TEXT,
  militar_dispensado_cpf TEXT,
  data_inicio DATE,
  status_funcao TEXT DEFAULT 'pendente', -- 'pendente' | 'item_confeccionado' | 'publicado_atualizar_105' | 'finalizado'
  status_cargo TEXT DEFAULT 'pendente',  -- 'pendente' | 'item_confeccionado' | 'finalizado'
  boletim_numero TEXT,
  boletim_data DATE,
  boletim_arquivo_url TEXT,
  boletim_arquivo_nome TEXT,
  siloms_processo_num TEXT,
  siloms_status TEXT DEFAULT 'pendente', -- 'pendente' | 'enviado_militar' | 'assinado' | 'finalizado'
  ttac_pendente BOOLEAN DEFAULT false,
  motivo_codigo TEXT,
  observacoes TEXT
);

CREATE INDEX IF NOT EXISTS idx_cargos_solic_tipo ON public.cargos_solicitacoes (tipo);
CREATE INDEX IF NOT EXISTS idx_cargos_solic_status_funcao ON public.cargos_solicitacoes (status_funcao);
CREATE INDEX IF NOT EXISTS idx_cargos_solic_status_cargo ON public.cargos_solicitacoes (status_cargo);

-- 5. Tabela de Configurações Gerais do Módulo
CREATE TABLE IF NOT EXISTS public.cargos_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  pin TEXT DEFAULT '123456',
  motivo_cargo_designacao TEXT DEFAULT '1138',
  motivo_cargo_dispensa TEXT DEFAULT '1139',
  motivo_funcao_designacao TEXT DEFAULT '9208',
  motivo_funcao_dispensa TEXT DEFAULT '9209',
  email_sreg TEXT DEFAULT 'sreg.afa@fab.mil.br',
  texto_padrao_email_sreg TEXT DEFAULT 'Prezado Senhores,\n\nSolicito o TTAC e a relação de carga da Seção {SECAO}, conforme publicado no boletim n°{BOLETIM_NUM} de {BOLETIM_DATA} dos respectivos militares:\nDispensa: {MILITAR_DISP}\nDesignação: {MILITAR_DESIG}.\n\nAtenciosamente,\nSecretaria da Divisão de Ensino - AFA',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Inserir registro inicial de configuração se não existir
INSERT INTO public.cargos_config (id, pin, motivo_cargo_designacao, motivo_cargo_dispensa, motivo_funcao_designacao, motivo_funcao_dispensa, email_sreg)
VALUES ('default', '123456', '1138', '1139', '9208', '9209', 'sreg.afa@fab.mil.br')
ON CONFLICT (id) DO NOTHING;

-- Inserir algumas seções padrão da Divisão de Ensino se a tabela estiver vazia
INSERT INTO public.cargos_secoes (nome, sigla)
VALUES 
  ('Divisão de Ensino', 'DE'),
  ('Subdivisão de Instrução Militar', 'SDINT'),
  ('Subdivisão de Instrução Geral', 'SDIR'),
  ('Célula de Infraestrutura ao Ensino', 'CEL-INFRA'),
  ('Secretaria da Divisão de Ensino', 'SEC-DE'),
  ('Célula de Planejamento e Avaliação', 'CEL-PLAN')
ON CONFLICT (nome) DO NOTHING;

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.cargos_secoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargos_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargos_militares_ativos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargos_solicitacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargos_config ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso Anônimo (SELECT, INSERT, UPDATE, DELETE)
DO $$
BEGIN
  -- cargos_secoes
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cargos_secoes' AND policyname = 'Permitir leitura cargos_secoes') THEN
    CREATE POLICY "Permitir leitura cargos_secoes" ON public.cargos_secoes FOR SELECT USING (true);
    CREATE POLICY "Permitir insercao cargos_secoes" ON public.cargos_secoes FOR INSERT WITH CHECK (true);
    CREATE POLICY "Permitir update cargos_secoes" ON public.cargos_secoes FOR UPDATE USING (true);
    CREATE POLICY "Permitir delete cargos_secoes" ON public.cargos_secoes FOR DELETE USING (true);
  END IF;

  -- cargos_catalogo
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cargos_catalogo' AND policyname = 'Permitir leitura cargos_catalogo') THEN
    CREATE POLICY "Permitir leitura cargos_catalogo" ON public.cargos_catalogo FOR SELECT USING (true);
    CREATE POLICY "Permitir insercao cargos_catalogo" ON public.cargos_catalogo FOR INSERT WITH CHECK (true);
    CREATE POLICY "Permitir update cargos_catalogo" ON public.cargos_catalogo FOR UPDATE USING (true);
    CREATE POLICY "Permitir delete cargos_catalogo" ON public.cargos_catalogo FOR DELETE USING (true);
  END IF;

  -- cargos_militares_ativos
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cargos_militares_ativos' AND policyname = 'Permitir leitura cargos_militares_ativos') THEN
    CREATE POLICY "Permitir leitura cargos_militares_ativos" ON public.cargos_militares_ativos FOR SELECT USING (true);
    CREATE POLICY "Permitir insercao cargos_militares_ativos" ON public.cargos_militares_ativos FOR INSERT WITH CHECK (true);
    CREATE POLICY "Permitir update cargos_militares_ativos" ON public.cargos_militares_ativos FOR UPDATE USING (true);
    CREATE POLICY "Permitir delete cargos_militares_ativos" ON public.cargos_militares_ativos FOR DELETE USING (true);
  END IF;

  -- cargos_solicitacoes
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cargos_solicitacoes' AND policyname = 'Permitir leitura cargos_solicitacoes') THEN
    CREATE POLICY "Permitir leitura cargos_solicitacoes" ON public.cargos_solicitacoes FOR SELECT USING (true);
    CREATE POLICY "Permitir insercao cargos_solicitacoes" ON public.cargos_solicitacoes FOR INSERT WITH CHECK (true);
    CREATE POLICY "Permitir update cargos_solicitacoes" ON public.cargos_solicitacoes FOR UPDATE USING (true);
    CREATE POLICY "Permitir delete cargos_solicitacoes" ON public.cargos_solicitacoes FOR DELETE USING (true);
  END IF;

  -- cargos_config
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cargos_config' AND policyname = 'Permitir leitura cargos_config') THEN
    CREATE POLICY "Permitir leitura cargos_config" ON public.cargos_config FOR SELECT USING (true);
    CREATE POLICY "Permitir insercao cargos_config" ON public.cargos_config FOR INSERT WITH CHECK (true);
    CREATE POLICY "Permitir update cargos_config" ON public.cargos_config FOR UPDATE USING (true);
    CREATE POLICY "Permitir delete cargos_config" ON public.cargos_config FOR DELETE USING (true);
  END IF;
END $$;

-- Habilitar Realtime para as tabelas principais
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cargos_secoes;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cargos_solicitacoes;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cargos_militares_ativos;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 6. Bucket de Storage para Boletins Ostensivos (PDF-A)
INSERT INTO storage.buckets (id, name, public)
VALUES ('boletins', 'boletins', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Permitir upload boletins') THEN
    CREATE POLICY "Permitir upload boletins" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'boletins');
    CREATE POLICY "Permitir leitura boletins" ON storage.objects FOR SELECT USING (bucket_id = 'boletins');
    CREATE POLICY "Permitir update boletins" ON storage.objects FOR UPDATE USING (bucket_id = 'boletins');
    CREATE POLICY "Permitir delete boletins" ON storage.objects FOR DELETE USING (bucket_id = 'boletins');
  END IF;
END $$;
