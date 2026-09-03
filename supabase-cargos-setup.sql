-- ============================================================
-- MÓDULO DE CARGOS E FUNÇÕES (AFA / DE)
-- Script de Criação e Configuração de Tabelas no Supabase
-- ============================================================

-- 1. Tabela de Seções
CREATE TABLE IF NOT EXISTS public.cargos_secoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT UNIQUE NOT NULL,
  sigla TEXT,
  parent_sigla TEXT,
  ordem INT DEFAULT 0,
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

-- 6. Tabela da Estrutura Hierárquica do Organograma (Árvore Visual Editável)
CREATE TABLE IF NOT EXISTS public.cargos_organograma_estrutura (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave_sigla TEXT UNIQUE NOT NULL, -- Ex: 'DE', 'VC-DE', 'SEC-DE', 'SDEX', 'SVA'
  parent_sigla TEXT,                -- Sigla do nó pai ('DE', 'VC-DE', etc)
  secao_nome TEXT NOT NULL,
  titulo_exibicao TEXT NOT NULL,
  tipo_no TEXT DEFAULT 'secao',      -- 'raiz' | 'staff' | 'subdivisao' | 'celula' | 'secao'
  ordem INT DEFAULT 0,
  nivel INT DEFAULT 1,
  titular_saram TEXT,
  titular_posto TEXT,
  titular_nome TEXT,
  categoria TEXT DEFAULT 'oficial',  -- 'chefe' | 'oficial' | 'graduado' | 'praca'
  membros_extras JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Inserir Seções Oficiais da Divisão de Ensino (AFA)
INSERT INTO public.cargos_secoes (nome, sigla, parent_sigla, ordem)
VALUES 
  ('Divisão de Ensino', 'DE', NULL, 1),
  ('Vice-Chefia da Divisão de Ensino', 'VC-DE', 'DE', 2),
  ('Secretaria da Divisão de Ensino', 'SEC-DE', 'VC-DE', 3),
  ('Célula de Infraestrutura do Ensino', 'CIE-DE', 'SEC-DE', 4),
  ('Célula de Obtenções e Serviços', 'COS-DE', 'SEC-DE', 5),
  ('Célula de Logística de Material e Patrimônio', 'CLMP', 'VC-DE', 6),
  ('Subdivisão de Apoio Docente e Discente', 'CADA', 'DE', 7),
  ('Célula de Análise de Desempenho de Ensino', 'CADE', 'CADA', 8),
  ('Célula de Avaliação e Abordagem Psicopedagógica', 'CAAP', 'CADA', 9),
  ('Célula de Documentação do Ensino', 'CDEns', 'CADA', 10),
  ('Seção de Educação a Distância', 'SED', 'DE', 11),
  ('Subdivisão de Planejamento', 'SDPL', 'DE', 12),
  ('Seção de Planejamento de Ensino', 'SPE', 'SDPL', 13),
  ('Seção de Análise de Programação de Ensino', 'SAPRE', 'SDPL', 14),
  ('Subdivisão de Execução', 'SDEX', 'DE', 15),
  ('Seção de Admissão e Exclusão', 'SAE', 'SDEX', 16),
  ('Seção de Programas Internacionais', 'SPI', 'SDEX', 17),
  ('Seção de Serviços Escolares', 'SSE', 'SDEX', 18),
  ('Seção de Verificação de Aprendizagem', 'SVA', 'SDEX', 19),
  ('Subdivisão de Pesquisa e Produção Científica', 'SPPC', 'DE', 20),
  ('Coordenadoria de Trabalho de Conclusão de Curso', 'CTCC', 'SPPC', 21),
  ('Coordenadoria de Produção Científica', 'CPC', 'SPPC', 22),
  ('Coordenadoria de Publicação', 'CPubl', 'SPPC', 23),
  ('Biblioteca da Divisão de Ensino', 'BIBLI', 'SPPC', 24),
  ('Subdivisão de Instrução Científica', 'SDIC', 'DE', 25),
  ('Subdivisão de Instrução de Aviação', 'SDIA', 'DE', 26),
  ('Seção de Instrução de Aviação', 'SIAV', 'SDIA', 27),
  ('Corpo de Instrutores da SDIA', 'CInst-SDIA', 'SDIA', 28),
  ('Subdivisão de Instrução de Intendência', 'SDINT', 'DE', 29),
  ('Seção de Instrução de Intendência', 'SIINT', 'SDINT', 30),
  ('Seção de Coordenação de Estágios', 'SCEst', 'SDINT', 31),
  ('Corpo de Instrutores da SDINT', 'CInst-SDINT', 'SDINT', 32),
  ('Subdivisão de Instrução de Infantaria', 'SDINF', 'DE', 33)
ON CONFLICT (nome) DO UPDATE SET 
  sigla = EXCLUDED.sigla,
  parent_sigla = EXCLUDED.parent_sigla,
  ordem = EXCLUDED.ordem;

-- Inserir Nós Estruturais do Organograma Oficial
INSERT INTO public.cargos_organograma_estrutura (chave_sigla, parent_sigla, secao_nome, titulo_exibicao, tipo_no, ordem, nivel, titular_posto, titular_nome, titular_saram, categoria)
VALUES
  ('DE', NULL, 'Divisão de Ensino', 'CHEFE', 'raiz', 1, 0, 'Cel Av', 'Marcelo Resende', '3147550', 'chefe'),
  ('VC-DE', 'DE', 'Vice-Chefia da Divisão de Ensino', 'VC-DE', 'staff', 1, 1, 'Cel R1', 'Lopes', '1047612', 'chefe'),
  ('SEC-DE', 'VC-DE', 'Secretaria da Divisão de Ensino', 'SEC-DE', 'staff', 1, 2, 'Cap AV', 'Bassanesi', '4311779', 'chefe'),
  ('CIE-DE', 'SEC-DE', 'Célula de Infraestrutura do Ensino', 'Célula de Infraestrutura do Ensino (CIE-DE)', 'celula', 1, 3, '1T', 'Alex', '7488718', 'oficial'),
  ('COS-DE', 'SEC-DE', 'Célula de Obtenções e Serviços', 'Célula de Obtenções e Serviços (COS-DE)', 'celula', 2, 3, '1T', 'Camila Calherani', '7272421', 'oficial'),
  ('CLMP', 'VC-DE', 'Célula de Logística de Material e Patrimônio', 'CLMP', 'staff', 2, 2, 'Ten Cel Av', 'Pacheco', '3324346', 'chefe'),
  ('CADA', 'DE', 'Subdivisão de Apoio Docente e Discente', 'CADA', 'subdivisao', 2, 1, 'Ten Cel Av', 'Belli', '3410773', 'chefe'),
  ('CADE', 'CADA', 'Célula de Análise de Desempenho de Ensino', 'Célula de Análise de Desempenho de Ensino (CADE)', 'celula', 1, 2, '1T', 'Remédio', '7335326', 'oficial'),
  ('CAAP', 'CADA', 'Célula de Avaliação e Abordagem Psicopedagógica', 'Célula de Avaliação e Abordagem Psicopedagógica (CAAP)', 'celula', 2, 2, '1T', 'Débora Sunega', '7272448', 'oficial'),
  ('CDEns', 'CADA', 'Célula de Documentação do Ensino', 'Célula de Documentação do Ensino (CDEns)', 'celula', 3, 2, '1T', 'Thais Bergue', '7430540', 'oficial'),
  ('SED', 'DE', 'Seção de Educação a Distância', 'SED', 'secao', 3, 1, 'Cap', 'Frederico', '3962180', 'oficial'),
  ('SDPL', 'DE', 'Subdivisão de Planejamento', 'SDPL', 'subdivisao', 4, 1, 'Ten Cel Av', 'Pacheco', '3324346', 'chefe'),
  ('SPE', 'SDPL', 'Seção de Planejamento de Ensino', 'Seção de Planejamento de Ensino (SPE)', 'secao', 1, 2, '1T Av', 'Wellington', '6482805', 'oficial'),
  ('SAPRE', 'SDPL', 'Seção de Análise de Programação de Ensino', 'Seção de Análise de Programação de Ensino (SAPRE)', 'secao', 2, 2, '1T', 'Alex', '7488718', 'oficial'),
  ('SDEX', 'DE', 'Subdivisão de Execução', 'SDEX', 'subdivisao', 5, 1, 'Ten Cel Av', 'Nicolazzi', '3256537', 'chefe'),
  ('SAE', 'SDEX', 'Seção de Admissão e Exclusão', 'Seção de Admissão e Exclusão (SAE)', 'secao', 1, 2, '1T', 'Mariana', '7430442', 'oficial'),
  ('SPI', 'SDEX', 'Seção de Programas Internacionais', 'Seção de Programas Internacionais (SPI)', 'secao', 2, 2, '1T', 'Franco', '7488734', 'oficial'),
  ('SSE', 'SDEX', 'Seção de Serviços Escolares', 'Seção de Serviços Escolares (SSE)', 'secao', 3, 2, '1T', 'Andrade', '7488645', 'oficial'),
  ('SVA', 'SDEX', 'Seção de Verificação de Aprendizagem', 'Seção de Verificação de Aprendizagem (SVA)', 'secao', 4, 2, 'Maj Av', 'Pedro', '3822427', 'oficial'),
  ('SPPC', 'DE', 'Subdivisão de Pesquisa e Produção Científica', 'SPPC', 'subdivisao', 6, 1, 'Maj', 'Mendes', '4200101', 'chefe'),
  ('CTCC', 'SPPC', 'Coordenadoria de Trabalho de Conclusão de Curso', 'Coordenadoria de Trabalho de Conclusão de Curso (CTCC)', 'secao', 1, 2, '1T', 'Rebeca Mega', '7488793', 'oficial'),
  ('CPC', 'SPPC', 'Coordenadoria de Produção Científica', 'Coordenadoria de Produção Científica (CPC)', 'secao', 2, 2, '2T', 'Renan Peixoto', '7708408', 'oficial'),
  ('CPubl', 'SPPC', 'Coordenadoria de Publicação', 'Coordenadoria de Publicação (CPubl)', 'secao', 3, 2, '1T', 'Leonardo', '7535082', 'oficial'),
  ('BIBLI', 'SPPC', 'Biblioteca da Divisão de Ensino', 'Biblioteca (BIBLI)', 'secao', 4, 2, '1T', 'C. Rodrigues', '7430450', 'oficial'),
  ('SDIC', 'DE', 'Subdivisão de Instrução Científica', 'SDIC', 'subdivisao', 7, 1, 'Profa', 'Marina', '', 'oficial'),
  ('SDIA', 'DE', 'Subdivisão de Instrução de Aviação', 'SDIA', 'subdivisao', 8, 1, 'Maj', 'Puhle', '3822141', 'chefe'),
  ('SIAV', 'SDIA', 'Seção de Instrução de Aviação', 'Seção de Instrução de Aviação (SIAV)', 'secao', 1, 2, 'Maj', 'Puhle', '3822141', 'oficial'),
  ('CInst-SDIA', 'SDIA', 'Corpo de Instrutores da SDIA', 'Corpo de Instrutores (CInst-SDIA)', 'secao', 2, 2, 'Maj', 'Puhle', '3822141', 'oficial'),
  ('SDINT', 'DE', 'Subdivisão de Instrução de Intendência', 'SDINT', 'subdivisao', 9, 1, 'Cel R1', 'Lopes', '1047612', 'chefe'),
  ('SIINT', 'SDINT', 'Seção de Instrução de Intendência', 'Seção de Instrução de Intendência (SIINT)', 'secao', 1, 2, '1T', 'Kazu', '7488726', 'oficial'),
  ('SCEst', 'SDINT', 'Seção de Coordenação de Estágios', 'Seção de Coordenação de Estágios (SCEst)', 'secao', 2, 2, 'Maj', 'Everton', '3882136', 'oficial'),
  ('CInst-SDINT', 'SDINT', 'Corpo de Instrutores da SDINT', 'Corpo de Instrutores (CInst-SDINT)', 'secao', 3, 2, 'Maj', 'Everton', '3882136', 'oficial'),
  ('SDINF', 'DE', 'Subdivisão de Instrução de Infantaria', 'SDINF', 'subdivisao', 10, 1, 'Ten Cel', 'Muriel', '3834743', 'chefe')
ON CONFLICT (chave_sigla) DO UPDATE SET
  parent_sigla = EXCLUDED.parent_sigla,
  secao_nome = EXCLUDED.secao_nome,
  titulo_exibicao = EXCLUDED.titulo_exibicao,
  tipo_no = EXCLUDED.tipo_no,
  ordem = EXCLUDED.ordem,
  nivel = EXCLUDED.nivel,
  titular_posto = EXCLUDED.titular_posto,
  titular_nome = EXCLUDED.titular_nome,
  titular_saram = EXCLUDED.titular_saram,
  categoria = EXCLUDED.categoria;

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.cargos_secoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargos_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargos_militares_ativos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargos_solicitacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargos_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargos_organograma_estrutura ENABLE ROW LEVEL SECURITY;

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

  -- cargos_organograma_estrutura
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cargos_organograma_estrutura' AND policyname = 'Permitir leitura cargos_organograma_estrutura') THEN
    CREATE POLICY "Permitir leitura cargos_organograma_estrutura" ON public.cargos_organograma_estrutura FOR SELECT USING (true);
    CREATE POLICY "Permitir insercao cargos_organograma_estrutura" ON public.cargos_organograma_estrutura FOR INSERT WITH CHECK (true);
    CREATE POLICY "Permitir update cargos_organograma_estrutura" ON public.cargos_organograma_estrutura FOR UPDATE USING (true);
    CREATE POLICY "Permitir delete cargos_organograma_estrutura" ON public.cargos_organograma_estrutura FOR DELETE USING (true);
  END IF;
END $$;

-- Habilitar Realtime para as tabelas principais
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cargos_secoes;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cargos_solicitacoes;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cargos_militares_ativos;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cargos_organograma_estrutura;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 7. Bucket de Storage para Boletins Ostensivos (PDF-A)
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
