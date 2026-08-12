-- ============================================================
-- TABELA: gratificacao_representacao
-- Módulo de Missões / Gratificação de Representação (AFA / DE)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.gratificacao_representacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  ano INT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  num_os TEXT NOT NULL,
  
  -- Dados do Militar (conectado ao Efetivo)
  militar_id TEXT,
  posto_grad TEXT NOT NULL,
  especialidade TEXT,
  nome TEXT NOT NULL,
  cpf TEXT,
  saram TEXT,
  om TEXT DEFAULT 'AFA',
  
  -- Período e Missão
  data_inicio DATE NOT NULL,
  hora_inicio TEXT DEFAULT '08:00',
  data_fim DATE NOT NULL,
  hora_fim TEXT DEFAULT '18:00',
  dias NUMERIC(5,1) NOT NULL DEFAULT 1,
  passagem TEXT DEFAULT 'NÃO',
  servico_local TEXT NOT NULL,
  apoio_recebido TEXT,
  enquadramento_legal TEXT DEFAULT 'Art 5°, Inc II (Viagem de Instrução)',
  passagens_outra_om TEXT DEFAULT 'Não se aplica.',
  
  -- Pagamento Antecipado e Prazos
  pagamento_antecipado BOOLEAN DEFAULT false,
  justificativa_antecipacao TEXT,
  justificativa_prazo TEXT,
  percentual TEXT DEFAULT '2%',
  
  -- Retorno de Missão (Ficha de Apresentação)
  teve_alteracao_retorno BOOLEAN DEFAULT true,
  justificativa_alteracao_retorno TEXT,
  retorno_inicio DATE,
  retorno_hora_inicio TEXT DEFAULT '10:00',
  retorno_fim DATE,
  retorno_hora_fim TEXT DEFAULT '01:00',
  dias_retorno NUMERIC(5,1),
  
  -- Autoridade e Datas Finais
  data_os DATE,
  comandante_nome TEXT DEFAULT 'Brig Ar GUSTAVO PESTANA GARCEZ',
  comandante_cargo TEXT DEFAULT 'Comandante da Academia da Força Aérea',
  data_autorizacao DATE,
  chefe_nome TEXT DEFAULT 'GABRIEL HENRIQUES DE OLIVEIRA FARIAS Cel Av',
  chefe_cargo TEXT DEFAULT 'Chefe da 2SC'
);

-- Ativar Row Level Security (RLS)
ALTER TABLE public.gratificacao_representacao ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso anônimo
CREATE POLICY "Permitir leitura anonima em gratificacao_representacao"
ON public.gratificacao_representacao FOR SELECT USING (true);

CREATE POLICY "Permitir insercao anonima em gratificacao_representacao"
ON public.gratificacao_representacao FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir edicao anonima em gratificacao_representacao"
ON public.gratificacao_representacao FOR UPDATE USING (true);

CREATE POLICY "Permitir exclusao anonima em gratificacao_representacao"
ON public.gratificacao_representacao FOR DELETE USING (true);

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.gratificacao_representacao;
