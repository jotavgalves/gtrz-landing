ALTER TABLE freelancer_applications ADD COLUMN cpf TEXT;
ALTER TABLE freelancer_applications ADD COLUMN birth_date TEXT;
ALTER TABLE freelancer_applications ADD COLUMN neighborhood TEXT;
ALTER TABLE freelancer_applications ADD COLUMN other_role TEXT;
ALTER TABLE freelancer_applications ADD COLUMN resume_file_name TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_freelancers_cpf ON freelancer_applications(cpf) WHERE cpf IS NOT NULL;

INSERT INTO site_settings(key,value_json,updated_at)
VALUES(
  'recruitment',
  '{"whatsapp":"","roles":["DJ","FOTÓGRAFO(A)","VIDEOMAKER","SEGURANÇA","BOMBEIRO(A)","RECEPÇÃO","BARMAN","GARÇOM","LIMPEZA","OUTROS"]}',
  CURRENT_TIMESTAMP
)
ON CONFLICT(key) DO NOTHING;
