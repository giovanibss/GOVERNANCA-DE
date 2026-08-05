-- BANCO DE DADOS: TABELA DE SOLICITAÇÕES DE MISSÃO (SEM SENHA / PÚBLICA)
-- Executar este SQL no SQL Editor do Supabase para suporte às solicitações pré-montadas.

CREATE TABLE IF NOT EXISTS public.solicitacoes_missao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    protocolo TEXT UNIQUE NOT NULL,
    modalidade TEXT NOT NULL, -- 'diaria', 'gratificacao', 'sem_custo'
    militares JSONB NOT NULL DEFAULT '[]'::jsonb,
    servico_local TEXT NOT NULL,
    data_inicio DATE NOT NULL,
    hora_inicio TIME NOT NULL DEFAULT '08:00',
    data_fim DATE NOT NULL,
    hora_fim TIME NOT NULL DEFAULT '18:00',
    dias NUMERIC(4,1) DEFAULT 1,
    passagem TEXT DEFAULT 'NÃO',
    observacoes TEXT,
    fora_prazo BOOLEAN DEFAULT FALSE,
    justificativa_prazo TEXT,
    pagamento_antecipado BOOLEAN DEFAULT FALSE,
    justificativa_antecipacao TEXT,
    status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente', 'aprovado', 'rejeitado'
    motivo_rejeicao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.solicitacoes_missao ENABLE ROW LEVEL SECURITY;

-- Política para inserção pública (qualquer militar sem login)
CREATE POLICY "Permitir criacao publica de solicitacoes" ON public.solicitacoes_missao
    FOR INSERT WITH CHECK (true);

-- Política para leitura pública (para consultar status do protocolo)
CREATE POLICY "Permitir leitura publica de solicitacoes" ON public.solicitacoes_missao
    FOR SELECT USING (true);

-- Política para atualização e exclusão pelo operador
CREATE POLICY "Permitir operacao total para usuarios anonimos/autenticados" ON public.solicitacoes_missao
    FOR ALL USING (true) WITH CHECK (true);

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.solicitacoes_missao;
