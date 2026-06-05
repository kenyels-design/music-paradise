-- PASSO 1: Verifica se a coluna role já existe
-- Se retornar uma linha, a coluna já existe — pule o ALTER TABLE.
-- Se retornar vazio, execute o ALTER TABLE abaixo.
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles' AND column_name = 'role';

-- PASSO 2: Adiciona a coluna (seguro — IF NOT EXISTS não falha se já existir)
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'musico'
    CHECK (role IN ('musico', 'tecnica', 'admin'));

-- PASSO 3: Sincroniza admins existentes que tinham is_admin = true mas role = 'musico'
UPDATE user_profiles SET role = 'admin' WHERE is_admin = true AND role = 'musico';

-- PASSO 4: Confirma o estado final da tabela
SELECT id, email, name, role, is_admin FROM user_profiles ORDER BY created_at;
