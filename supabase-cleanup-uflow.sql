-- ============================================================
-- SCRIPT DE LIMPEZA DO BANCO UFLOW (OPCIONAL)
-- Projeto Uflow: rsaaryrgdrolcsvigckz
-- 
-- ATENÇÃO: Execute este script APENAS no SQL Editor do projeto
-- Supabase do Uflow (rsaaryrgdrolcsvigckz) se desejar remover
-- as tabelas do Governança DE que foram criadas lá indevidamente.
-- ============================================================

-- 1. Remover tabelas de OS e Missões
DROP TABLE IF EXISTS public.controle_os_processos CASCADE;
DROP TABLE IF EXISTS public.gratificacao_representacao CASCADE;
DROP TABLE IF EXISTS public.solicitacoes_missao CASCADE;
DROP TABLE IF EXISTS public.militares_externos CASCADE;
DROP TABLE IF EXISTS public.os_config CASCADE;

-- 2. Remover tabelas de Diárias
DROP TABLE IF EXISTS public.diarias_os CASCADE;
DROP TABLE IF EXISTS public.diarias_config CASCADE;

-- 3. Remover tabelas de Cargos e Funções
DROP TABLE IF EXISTS public.cargos_solicitacoes CASCADE;
DROP TABLE IF EXISTS public.cargos_militares_ativos CASCADE;
DROP TABLE IF EXISTS public.cargos_catalogo CASCADE;
DROP TABLE IF EXISTS public.cargos_secoes CASCADE;
DROP TABLE IF EXISTS public.cargos_config CASCADE;

-- 4. Remover tabelas de TACF
DROP TABLE IF EXISTS public.tacf_solicitacoes CASCADE;
DROP TABLE IF EXISTS public.tacf_temporadas CASCADE;

-- 5. Remover tabelas de Manutenção (se criadas no Uflow)
DROP TABLE IF EXISTS public.mnt_chamados CASCADE;

-- 6. Remover app_config (Cuidado: apenas se o Uflow não utiliza uma tabela própria com este nome)
-- DROP TABLE IF EXISTS public.app_config CASCADE;

-- 7. Remover Bucket de Storage 'boletins' (se criado no Uflow)
-- DELETE FROM storage.buckets WHERE id = 'boletins';
