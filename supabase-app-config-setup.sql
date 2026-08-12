-- ============================================================
-- TABELA CENTRAL DE CONFIGURAÇÕES DO SISTEMA (PIN & INTEGRAÇÕES)
-- Governança DE / Academia da Força Aérea
-- ============================================================

CREATE TABLE IF NOT EXISTS public.app_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  pin TEXT NOT NULL DEFAULT '123456',
  gmail_user TEXT DEFAULT '',
  gmail_app_password TEXT DEFAULT '',
  gmail_sender_name TEXT DEFAULT 'Secretaria DE · AFA',
  gmail_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ativar Row Level Security (RLS)
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso anônimo para app_config
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'app_config' AND policyname = 'Permitir leitura anonima em app_config'
  ) THEN
    CREATE POLICY "Permitir leitura anonima em app_config"
    ON public.app_config FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'app_config' AND policyname = 'Permitir insercao anonima em app_config'
  ) THEN
    CREATE POLICY "Permitir insercao anonima em app_config"
    ON public.app_config FOR INSERT WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'app_config' AND policyname = 'Permitir edicao anonima em app_config'
  ) THEN
    CREATE POLICY "Permitir edicao anonima em app_config"
    ON public.app_config FOR UPDATE USING (true);
  END IF;
END $$;

-- Inserir registro padrão se não existir
INSERT INTO public.app_config (id, pin, gmail_enabled)
VALUES ('default', '123456', true)
ON CONFLICT (id) DO NOTHING;

-- Habilitar Realtime
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_config;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
