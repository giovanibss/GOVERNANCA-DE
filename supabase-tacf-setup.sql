-- ============================================================
-- TABELAS: Módulo TACF (Teste de Avaliação do Condicionamento Físico)
-- Governança DE / Academia da Força Aérea
-- ============================================================

-- 1. Tabela de Temporadas / Períodos de Aplicação do TACF
CREATE TABLE IF NOT EXISTS public.tacf_temporadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  ano INT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  semestre INT NOT NULL DEFAULT 1,
  titulo TEXT NOT NULL DEFAULT '1º TACF do Ano',
  status TEXT NOT NULL DEFAULT 'agendamento_aberto', -- 'agendamento_aberto', 'agendamento_fechado', 'escala_gerada', 'finalizado'
  
  datas_aplicacao JSONB NOT NULL DEFAULT '[]'::jsonb, -- Lista de datas no formato ["YYYY-MM-DD", ...]
  vagas_por_dia INT NOT NULL DEFAULT 15,
  vagas_livres_reserva INT NOT NULL DEFAULT 3,
  observacoes TEXT
);

-- 2. Tabela de Solicitações e Escala dos Militares
CREATE TABLE IF NOT EXISTS public.tacf_solicitacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  temporada_id UUID REFERENCES public.tacf_temporadas(id) ON DELETE CASCADE,
  
  -- Dados do Militar (sincronizados da Planilha Efetivo)
  saram TEXT NOT NULL,
  cpf TEXT,
  posto_grad TEXT NOT NULL,
  especialidade TEXT,
  nome_guerra TEXT NOT NULL,
  nome_completo TEXT,
  antiguidade_index INT DEFAULT 999, -- Índice de antiguidade (linha na planilha)
  
  -- Opções de Datas (Prioridades)
  prio1_data DATE,
  prio2_data DATE,
  prio3_data DATE,
  
  -- Resultado da Escala / Alocação
  dia_escalado DATE,
  metodo_alocacao TEXT, -- 'prio1', 'prio2', 'prio3', 'regra_secundaria_velhos', 'regra_secundaria_novos', 'manual'
  status_solicitacao TEXT NOT NULL DEFAULT 'pendente', -- 'pendente', 'escalado', 'nao_realizou', 'realizou'
  
  -- Classificação de Elegibilidade (Gerida pela Secretaria)
  status_elegibilidade TEXT NOT NULL DEFAULT 'elegivel', -- 'elegivel', 'r1_reserva', 'baixa', 'dispensa'
  justificativa TEXT,
  data_realizacao DATE,

  CONSTRAINT unique_militar_temporada UNIQUE (temporada_id, saram)
);

-- Ativar Row Level Security (RLS)
ALTER TABLE public.tacf_temporadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tacf_solicitacoes ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso anônimo para tacf_temporadas
CREATE POLICY "Permitir leitura anonima em tacf_temporadas"
ON public.tacf_temporadas FOR SELECT USING (true);

CREATE POLICY "Permitir insercao anonima em tacf_temporadas"
ON public.tacf_temporadas FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir edicao anonima em tacf_temporadas"
ON public.tacf_temporadas FOR UPDATE USING (true);

CREATE POLICY "Permitir exclusao anonima em tacf_temporadas"
ON public.tacf_temporadas FOR DELETE USING (true);

-- Políticas de acesso anônimo para tacf_solicitacoes
CREATE POLICY "Permitir leitura anonima em tacf_solicitacoes"
ON public.tacf_solicitacoes FOR SELECT USING (true);

CREATE POLICY "Permitir insercao anonima em tacf_solicitacoes"
ON public.tacf_solicitacoes FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir edicao anonima em tacf_solicitacoes"
ON public.tacf_solicitacoes FOR UPDATE USING (true);

CREATE POLICY "Permitir exclusao anonima em tacf_solicitacoes"
ON public.tacf_solicitacoes FOR DELETE USING (true);

-- Habilitar Realtime (com verificação de publicação)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tacf_temporadas;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tacf_solicitacoes;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
