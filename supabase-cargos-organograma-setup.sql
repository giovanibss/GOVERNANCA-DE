-- ==============================================================================
-- SCRIPT DE SETUP: public.cargos_organograma_estrutura
-- ==============================================================================
-- Este script cria a tabela de estrutura visual do Organograma da Divisão de Ensino (AFA),
-- com todas as políticas RLS necessárias e a carga inicial dos nós hierárquicos.
--
-- Como executar:
-- 1. Acesse o painel do Supabase (https://supabase.com/dashboard/project/sovrgsbdhdpxsaomspsp)
-- 2. Vá em "SQL Editor" -> "New query"
-- 3. Cole este código e clique em "Run".
-- ==============================================================================

-- 1. Criação da tabela
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

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_organograma_parent ON public.cargos_organograma_estrutura(parent_sigla);
CREATE INDEX IF NOT EXISTS idx_organograma_ordem ON public.cargos_organograma_estrutura(ordem);

-- 3. Habilitar RLS
ALTER TABLE public.cargos_organograma_estrutura ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Acesso Anônimo (SELECT, INSERT, UPDATE, DELETE)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cargos_organograma_estrutura' AND policyname = 'Permitir leitura cargos_organograma_estrutura') THEN
    CREATE POLICY "Permitir leitura cargos_organograma_estrutura" ON public.cargos_organograma_estrutura FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cargos_organograma_estrutura' AND policyname = 'Permitir insercao cargos_organograma_estrutura') THEN
    CREATE POLICY "Permitir insercao cargos_organograma_estrutura" ON public.cargos_organograma_estrutura FOR INSERT WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cargos_organograma_estrutura' AND policyname = 'Permitir update cargos_organograma_estrutura') THEN
    CREATE POLICY "Permitir update cargos_organograma_estrutura" ON public.cargos_organograma_estrutura FOR UPDATE USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cargos_organograma_estrutura' AND policyname = 'Permitir delete cargos_organograma_estrutura') THEN
    CREATE POLICY "Permitir delete cargos_organograma_estrutura" ON public.cargos_organograma_estrutura FOR DELETE USING (true);
  END IF;
END $$;

-- 5. Inserir Nós Estruturais do Organograma Oficial
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
  ('CInst-SDINT', 'SDINT', 'Corpo de Instrutores da SDINT', 'Corpo de Instruções da SDINT (CInst-SDINT)', 'secao', 3, 2, 'Maj', 'Everton', '3882136', 'oficial'),
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
