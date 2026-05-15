-- Sistema Staff v138
-- Execute uma vez no SQL Editor do Supabase antes de usar os novos campos.

ALTER TABLE staffs
ADD COLUMN IF NOT EXISTS calcado integer;

ALTER TABLE staffs
DROP CONSTRAINT IF EXISTS staffs_calcado_check;

ALTER TABLE staffs
ADD CONSTRAINT staffs_calcado_check
CHECK (calcado IS NULL OR (calcado >= 34 AND calcado <= 45));

ALTER TABLE corridas
ADD COLUMN IF NOT EXISTS possui_patrocinador_tenis boolean DEFAULT false;

UPDATE corridas
SET possui_patrocinador_tenis = false
WHERE possui_patrocinador_tenis IS NULL;
