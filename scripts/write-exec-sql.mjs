import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const dir = join(process.cwd(), ".migration-chunks");
const rls2 = JSON.parse(readFileSync(join(dir, "payload_rls2.json"), "utf8"));
const rls3 = JSON.parse(readFileSync(join(dir, "payload_rls3.json"), "utf8"));
writeFileSync(join(dir, "exec_rls2.sql"), rls2.query);
writeFileSync(join(dir, "exec_rls3.sql"), rls3.query);

const idx = readFileSync(join(process.cwd(), "temp_p5_indexes.sql"), "utf8").replace(
  /CREATE INDEX /g,
  "CREATE INDEX IF NOT EXISTS "
);
const storage = readFileSync(join(dir, "m0_fk.sql"), "utf8"); // wrong file
const storageSql = readFileSync(join(process.cwd(), "scripts", "extract-m0-repair.mjs"), "utf8"); // no

const storagePart = `
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', FALSE) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', TRUE) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', TRUE) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', FALSE) ON CONFLICT (id) DO NOTHING;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_read' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "auth_read" ON storage.objects FOR SELECT TO authenticated USING (TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_insert' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "auth_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_update' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "auth_update" ON storage.objects FOR UPDATE TO authenticated USING (TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_delete' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "auth_delete" ON storage.objects FOR DELETE TO authenticated USING (TRUE);
  END IF;
END $$;
`.trim();

writeFileSync(join(dir, "exec_idx.sql"), idx + "\n\n" + storagePart);
console.log("written exec_rls2, exec_rls3, exec_idx");
