-- ============================================================
-- GOVERNANÇA DE (AFA/DE) — ESQUEMA COMPLETO DO MÓDULO DE OS
-- Arquivo: supabase-os-setup.sql
-- Contempla: Solicitações, Gratificações, Militares Externos,
--            Apresentação de Retorno (Gov.br), SILOMS,
--            Controle de Processos (CONTROLE OS 2026 / COMGEP) e Configurações.
-- ============================================================

-- 1. TABELA DE SOLICITAÇÕES DE MISSÃO (PORTAL PÚBLICO)
CREATE TABLE IF NOT EXISTS public.solicitacoes_missao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    protocolo TEXT UNIQUE NOT NULL,
    modalidade TEXT NOT NULL, -- 'gratificacao', 'diaria', 'omis', 'sem_custo'
    solicita_omis BOOLEAN DEFAULT false,
    
    solicitante_nome TEXT,
    solicitante_email TEXT,
    coordenador_nome TEXT,
    coordenador_email TEXT,
    
    militares JSONB NOT NULL DEFAULT '[]'::jsonb,
    servico_local TEXT NOT NULL,
    
    data_inicio DATE NOT NULL,
    hora_inicio TEXT DEFAULT '04:00',
    data_fim DATE NOT NULL,
    hora_fim TEXT DEFAULT '16:00',
    dias NUMERIC(5,1) DEFAULT 1,
    passagem TEXT DEFAULT 'NÃO',
    
    -- Apoio Estruturado
    apoio_transporte_tipo TEXT DEFAULT 'AFA',
    apoio_transporte_om TEXT,
    apoio_hospedagem_tipo TEXT DEFAULT 'DESTINO',
    apoio_hospedagem_om TEXT,
    apoio_alimentacao_tipo TEXT DEFAULT 'DESTINO',
    apoio_alimentacao_om TEXT,
    apoio_recebido TEXT,
    
    -- Prazos e Antecipação
    fora_prazo BOOLEAN DEFAULT false,
    justificativa_prazo TEXT,
    pagamento_antecipado BOOLEAN DEFAULT false,
    justificativa_antecipacao TEXT,
    
    -- Apresentação de Retorno
    retorno_apresentado BOOLEAN DEFAULT false,
    retorno_apresentado_em TIMESTAMPTZ,
    retorno_teve_alteracao BOOLEAN DEFAULT false,
    retorno_dados_alteracao JSONB,
    pdf_retorno_assinado TEXT, -- Caminho do PDF assinado no Gov.br
    
    observacoes TEXT,
    status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente', 'aprovado', 'rejeitado', 'em_edicao', 'apresentado'
    motivo_rejeicao TEXT,
    os_gerada_num TEXT,
    num_omis TEXT
);

-- 2. TABELA DE PROCESSOS DE GRATIFICAÇÃO DE REPRESENTAÇÃO
CREATE TABLE IF NOT EXISTS public.gratificacao_representacao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    ano INT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    num_os TEXT NOT NULL,
    num_omis TEXT,
    siloms_numero TEXT,
    comgep_linha TEXT,
    
    militares JSONB NOT NULL DEFAULT '[]'::jsonb,
    posto_grad TEXT,
    especialidade TEXT,
    nome TEXT,
    nome_guerra TEXT,
    cpf TEXT,
    saram TEXT,
    om TEXT DEFAULT 'AFA',
    
    data_inicio DATE NOT NULL,
    hora_inicio TEXT DEFAULT '04:00',
    data_fim DATE NOT NULL,
    hora_fim TEXT DEFAULT '16:00',
    dias NUMERIC(5,1) NOT NULL DEFAULT 1,
    passagem TEXT DEFAULT 'NÃO',
    
    servico_local TEXT NOT NULL,
    apoio_recebido TEXT,
    enquadramento_legal TEXT DEFAULT 'Art 5°, Inc II (Viagem de Instrução)',
    passagens_outra_om TEXT DEFAULT 'Não se aplica.',
    
    pagamento_antecipado BOOLEAN DEFAULT false,
    justificativa_antecipacao TEXT,
    fora_prazo BOOLEAN DEFAULT false,
    justificativa_prazo TEXT,
    percentual TEXT DEFAULT '2%',
    
    -- Apresentação de Retorno
    teve_alteracao_retorno BOOLEAN DEFAULT false,
    justificativa_alteracao_retorno TEXT,
    retorno_dados_alteracao JSONB,
    pdf_retorno_assinado TEXT,
    retorno_apresentado_em TIMESTAMPTZ,
    
    -- Assinantes e Autoridades
    comandante_nome TEXT DEFAULT 'Cel QOINT WELLINGTON MARCELO FERNANDES',
    comandante_cargo TEXT DEFAULT 'Chefe da Divisão Administrativa',
    chefe_nome TEXT DEFAULT 'GABRIEL HENRIQUES DE OLIVEIRA FARIAS Cel Av',
    chefe_cargo TEXT DEFAULT 'Chefe da 2SC',
    
    -- OMIS Vinculada
    gerou_omis BOOLEAN DEFAULT false,
    omis_autoridade TEXT DEFAULT 'Odilor da Silva Lopes Cel Int R1',
    omis_cargo TEXT DEFAULT 'Adjunto da Divisão de Ensino da AFA',
    omis_enviada BOOLEAN DEFAULT false,
    
    status TEXT DEFAULT 'Pendente'
);

-- 3. TABELA DE MILITARES EXTERNOS
CREATE TABLE IF NOT EXISTS public.militares_externos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    posto_grad TEXT NOT NULL,
    especialidade TEXT,
    nome_completo TEXT NOT NULL,
    nome_guerra TEXT,
    cpf TEXT NOT NULL,
    saram TEXT,
    om TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    ativo BOOLEAN DEFAULT true,
    data_confirmacao_dados TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 4. TABELA DA ESTEIRA DE PROCESSOS (CONTROLE OS 2026)
CREATE TABLE IF NOT EXISTS public.controle_os_processos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    ano INT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    num_os TEXT NOT NULL,
    num_omis TEXT,
    modalidade TEXT NOT NULL DEFAULT 'Gratificação',
    
    coordenador TEXT NOT NULL,
    militares_resumo TEXT,
    servico_local TEXT,
    periodo_inicio DATE,
    periodo_fim DATE,
    
    -- Esteira de Tramitação
    sigad_numero TEXT,
    siloms_numero TEXT,
    comgep_linha TEXT,
    status TEXT NOT NULL DEFAULT 'Pendente', -- 'Pendente', 'Em Análise', 'Missão Aprovada', 'Apresentado', 'Despachado', 'Corrigir', 'Aguardando BCA', 'Confeccionado', 'Publicado'
    auditoria TEXT,
    nup TEXT,
    bca_numero TEXT,
    bi_numero TEXT,
    pdf_retorno_assinado TEXT
);

-- 5. TABELA DE CONFIGURAÇÕES DE ASSINANTES E NOTIFICAÇÕES (OS_CONFIG)
CREATE TABLE IF NOT EXISTS public.os_config (
    id TEXT PRIMARY KEY DEFAULT 'default',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    omis_autoridade_nome TEXT DEFAULT 'Odilor da Silva Lopes Cel Int R1',
    omis_autoridade_cargo TEXT DEFAULT 'Adjunto da Divisão de Ensino da AFA',
    omis_autoridade_email TEXT,
    
    grat_os_autoridade_nome TEXT DEFAULT 'Cel QOINT WELLINGTON MARCELO FERNANDES',
    grat_os_autoridade_cargo TEXT DEFAULT 'Chefe da Divisão Administrativa',
    
    grat_aut_autoridade_nome TEXT DEFAULT 'GABRIEL HENRIQUES DE OLIVEIRA FARIAS Cel Av',
    grat_aut_autoridade_cargo TEXT DEFAULT 'Chefe da 2SC',
    grat_aut_cidade TEXT DEFAULT 'Brasilia-DF',
    
    notificar_solicitante_email BOOLEAN DEFAULT true,
    notificar_chefe_omis_email BOOLEAN DEFAULT true
);

-- ============================================================
-- HABILITAÇÃO DE ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.solicitacoes_missao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gratificacao_representacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.militares_externos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.controle_os_processos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permissao Total Anon Solicitacoes" ON public.solicitacoes_missao;
CREATE POLICY "Permissao Total Anon Solicitacoes" ON public.solicitacoes_missao FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permissao Total Anon Gratificacao" ON public.gratificacao_representacao;
CREATE POLICY "Permissao Total Anon Gratificacao" ON public.gratificacao_representacao FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permissao Total Anon Externos" ON public.militares_externos;
CREATE POLICY "Permissao Total Anon Externos" ON public.militares_externos FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permissao Total Anon Controle" ON public.controle_os_processos;
CREATE POLICY "Permissao Total Anon Controle" ON public.controle_os_processos FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permissao Total Anon OsConfig" ON public.os_config;
CREATE POLICY "Permissao Total Anon OsConfig" ON public.os_config FOR ALL TO anon USING (true) WITH CHECK (true);

-- Realtime
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.solicitacoes_missao;
  EXCEPTION WHEN duplicate_object THEN END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.gratificacao_representacao;
  EXCEPTION WHEN duplicate_object THEN END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.militares_externos;
  EXCEPTION WHEN duplicate_object THEN END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.controle_os_processos;
  EXCEPTION WHEN duplicate_object THEN END;
END $$;
