-- ====================================================================
-- TABELA: efetivo_solicitacoes
-- DESCRIÇÃO: Fila de cadastros de novos militares, rascunhos parciais
--            e aprovações de antiguidade da Secretaria da DE
-- PROJETO: Governança DE - Academia da Força Aérea (AFA)
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.efetivo_solicitacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    saram VARCHAR(7) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'pendente', 'aprovada', 'rejeitada')),
    posto_grad VARCHAR(10),
    especialidade VARCHAR(20),
    nome_guerra VARCHAR(100),
    nome_completo VARCHAR(255),
    data_praca DATE,
    ordem_sugerida INTEGER,
    ordem_final INTEGER,
    dados JSONB NOT NULL DEFAULT '{}'::jsonb,
    motivo_rejeicao TEXT,
    aprovado_por VARCHAR(100),
    aprovado_em TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_ef_solic_saram ON public.efetivo_solicitacoes(saram);
CREATE INDEX IF NOT EXISTS idx_ef_solic_status ON public.efetivo_solicitacoes(status);
CREATE INDEX IF NOT EXISTS idx_ef_solic_created ON public.efetivo_solicitacoes(created_at DESC);

-- Trigger de updated_at
CREATE OR REPLACE FUNCTION public.handle_efetivo_solicitacoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_efetivo_solicitacoes_updated_at ON public.efetivo_solicitacoes;
CREATE TRIGGER trigger_efetivo_solicitacoes_updated_at
    BEFORE UPDATE ON public.efetivo_solicitacoes
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_efetivo_solicitacoes_updated_at();

-- Habilita Row Level Security (RLS)
ALTER TABLE public.efetivo_solicitacoes ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso anônimo (anon key da aplicação)
DROP POLICY IF EXISTS "Anon Select efetivo_solicitacoes" ON public.efetivo_solicitacoes;
CREATE POLICY "Anon Select efetivo_solicitacoes" ON public.efetivo_solicitacoes
    FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Anon Insert efetivo_solicitacoes" ON public.efetivo_solicitacoes;
CREATE POLICY "Anon Insert efetivo_solicitacoes" ON public.efetivo_solicitacoes
    FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Anon Update efetivo_solicitacoes" ON public.efetivo_solicitacoes;
CREATE POLICY "Anon Update efetivo_solicitacoes" ON public.efetivo_solicitacoes
    FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon Delete efetivo_solicitacoes" ON public.efetivo_solicitacoes;
CREATE POLICY "Anon Delete efetivo_solicitacoes" ON public.efetivo_solicitacoes
    FOR DELETE TO anon USING (true);
