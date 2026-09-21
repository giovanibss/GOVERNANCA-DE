-- ============================================================
-- GOVERNANÇA DE / ACADEMIA DA FORÇA AÉREA (AFA)
-- SCRIPT DE CONFIGURAÇÃO DA TABELA CENTRAL DE EFETIVO (PESSOAL)
-- Tabela: public.efetivo_pessoal
-- ============================================================

CREATE TABLE IF NOT EXISTS public.efetivo_pessoal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 1. IDENTIFICAÇÃO MILITAR
  ordem INT DEFAULT 999,                          -- Col B: Antiguidade / Ordem geral
  posto_grad TEXT NOT NULL,                       -- Col C: POST/GRAD (CL, TC, MAJ, CAP, 1T, 2T, SO, 1S, etc.)
  especialidade TEXT,                             -- Col D: ESP (AV, INT, INT R1, CTA, BMA, etc.)
  nome_guerra TEXT NOT NULL,                      -- Col E: NOME DE GUERRA
  
  -- 2. CARGO E FUNÇÃO NA DIVISÃO DE ENSINO
  cargo_funcao TEXT,                              -- Col H: CARGO / FUNÇÃO (ex: Chefe (DE), Adjunto (SDINT))
  ramal TEXT,                                     -- Col I: RAMAL (ex: 7992, 7815)
  funcao_publicada BOOLEAN DEFAULT false,         -- Col J: FUNÇÃO PUBLICADA?
  data_inicio DATE,                               -- Col K: DATA DE INÍCIO
  boletim TEXT,                                   -- Col L: BOLETIM (ex: DESIGNAÇÃO PARA CARGO - BO 188 15/10/2025)
  
  -- 3. DADOS PESSOAIS E CONTATO
  nome_completo TEXT NOT NULL,                    -- Col N: NOME COMPLETO
  telefone TEXT,                                  -- Col O: TELEFONE PESSOAL
  email TEXT,                                     -- Col P: E-MAIL ZIMBRA
  lista_zimbra BOOLEAN DEFAULT true,              -- Col Q: LISTA DO ZIMBRA?
  endereco TEXT,                                  -- Col R: ENDEREÇO RESIDENCIAL
  
  -- 4. DOCUMENTOS
  saram TEXT UNIQUE NOT NULL,                     -- Col T: SARAM (7 dígitos - chave única natural)
  cpf TEXT,                                       -- Col U: CPF
  rg TEXT,                                        -- Col V: RG / Identidade Militar
  
  -- 5. DADOS BANCÁRIOS E BENEFÍCIOS
  soldo NUMERIC(10,2) DEFAULT 0,                  -- Col W: SOLDO
  banco_nome TEXT,                                -- Col X: BANCO (ex: Banco do Brasil, Santander)
  banco_codigo TEXT,                              -- Col Y: N BANCO (ex: 001, 033)
  banco_agencia TEXT,                             -- Col Z: AGÊNCIA
  banco_conta TEXT,                               -- Col AA: CONTA
  auxilio_transporte BOOLEAN DEFAULT false,       -- Col AB: Aux Transporte? (Sim / Não)
  valor_auxilio_transporte NUMERIC(10,2) DEFAULT 0,-- Col AC: Valor Aux Transp.
  
  -- 6. CARREIRA, DATAS E PRAZOS
  data_nascimento DATE,                           -- Col AE: DATA NASCIM.
  data_praca DATE,                                -- Col AF: DATA PRAÇA (Ingresso na FAB)
  data_formacao DATE,                             -- Col AG: DATA FORMAÇÃO (Asp / Oficialato)
  ultima_promocao DATE,                           -- Col AH: ÚLTIMA PROMOÇÃO
  proxima_promocao TEXT,                          -- Col AI: PRÓXIMA PROMOÇÃO
  apresentacao_om DATE,                           -- Col AJ: APRESENTAÇÃO NA OM/LOC
  tempo_localidade TEXT,                          -- Col AK: TEMPO DE LOCALIDADE (ex: 2 anos e 6 meses)
  data_final_reengajamento DATE,                  -- Col AL: DATA FINAL REENGAJAMENTO
  tempo_inicio_processo TEXT,                     -- Col AM: TEMPO P/ INÍCIO PROCESSO (AVISO <5MESES)
  fim_servico_temp DATE,                          -- Col AN: FIM DO SERVIÇO (TEMP)
  status_reengajamento TEXT,                      -- Col AO: Status (ex: VAI ENCERRAR, VERIFICAR)
  disciplina TEXT,                                -- Col AP: DISCIPLINA
  codigo_disciplina TEXT,                         -- Col AQ: CÓDIGO DISCIPLINA (ex: NAVA, GOVC)
  escala_risaer TEXT,                             -- Col AR: ESCALA RISAER QUE CONCORRE (ex: ORA)
  medalha_santos_dumont TEXT DEFAULT 'N APLIC',   -- Col AS: SANTOS DUMONT (SIM, NÃO, N APLIC)
  medalha_bartolomeu_gusmao TEXT DEFAULT 'N APLIC',-- Col AT: Bartolomeu de Gusmão (SIM, NÃO, N APLIC)
  
  -- 7. AERONAVEGANTES (CÓDIGOS 5717 E 5718)
  aero_5717_ultima_pub DATE,                      -- Col AV: 5717 Data da Última publicação
  aero_5717_prox_pub TEXT,                        -- Col AW: 5717 Próxima publicação
  aero_5718_ultima_pub DATE,                      -- Col AY: 5718 Assento Ejetável Data da Última publicação
  aero_5718_prox_pub TEXT,                        -- Col AZ: 5718 Assento Ejetável Próxima publicação
  
  -- 8. METADADOS E CONTROLE DE SISTEMA
  ativo BOOLEAN NOT NULL DEFAULT true,            -- Militar ativo na Divisão de Ensino
  observacoes TEXT,                               -- Anotações internas da Secretaria
  raw_data JSONB DEFAULT '{}'::jsonb,             -- Cópia dos dados brutos importados (sem perda de informação)
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices de alta performance para buscas e filtros
CREATE INDEX IF NOT EXISTS idx_efetivo_saram ON public.efetivo_pessoal(saram);
CREATE INDEX IF NOT EXISTS idx_efetivo_cpf ON public.efetivo_pessoal(cpf);
CREATE INDEX IF NOT EXISTS idx_efetivo_nome_guerra ON public.efetivo_pessoal(nome_guerra);
CREATE INDEX IF NOT EXISTS idx_efetivo_posto_grad ON public.efetivo_pessoal(posto_grad);
CREATE INDEX IF NOT EXISTS idx_efetivo_ativo ON public.efetivo_pessoal(ativo);
CREATE INDEX IF NOT EXISTS idx_efetivo_aux_transp ON public.efetivo_pessoal(auxilio_transporte);

-- Trigger para atualizar automaticamete o updated_at
CREATE OR REPLACE FUNCTION update_efetivo_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_efetivo_updated_at ON public.efetivo_pessoal;
CREATE TRIGGER trg_efetivo_updated_at
BEFORE UPDATE ON public.efetivo_pessoal
FOR EACH ROW
EXECUTE FUNCTION update_efetivo_updated_at();

-- Habilitação de Row Level Security (RLS)
ALTER TABLE public.efetivo_pessoal ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso total anônimo (padrão adotado no projeto Governança DE)
DROP POLICY IF EXISTS "Permissao Total Anon efetivo_pessoal" ON public.efetivo_pessoal;
CREATE POLICY "Permissao Total Anon efetivo_pessoal" 
ON public.efetivo_pessoal FOR ALL 
USING (true) WITH CHECK (true);
