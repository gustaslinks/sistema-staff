-- Rode este SQL no Supabase apenas se o botão "Lista de espera" der erro de status.
-- Ele remove checks antigos da coluna inscricoes.status e recria aceitando lista_espera.
DO $body$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.inscricoes'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.inscricoes DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;

  ALTER TABLE public.inscricoes
  ADD CONSTRAINT inscricoes_status_check
  CHECK (status IN ('pendente', 'inscrito', 'confirmado', 'lista_espera', 'reserva', 'cancelado'));
END;
$body$;
