import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const root = join(process.cwd());
const outDir = join(root, ".migration-chunks");
mkdirSync(outDir, { recursive: true });

const p2 = readFileSync(join(root, "temp_p2_tables.sql"), "utf8");
const start = p2.indexOf("CREATE TABLE public.stock_adjustments");
const tablesSql = p2.slice(start, p2.indexOf("-- EXPENSES"));

const fkSql = `
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_store_manager') THEN
    ALTER TABLE public.stores ADD CONSTRAINT fk_store_manager FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_warehouse_manager') THEN
    ALTER TABLE public.warehouses ADD CONSTRAINT fk_warehouse_manager FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_department_head') THEN
    ALTER TABLE public.departments ADD CONSTRAINT fk_department_head FOREIGN KEY (head_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;
`.trim();

const storageSql = `
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

writeFileSync(join(outDir, "m0_fk.sql"), fkSql);
writeFileSync(join(outDir, "m0_tables.sql"), tablesSql);
writeFileSync(join(outDir, "m0_functions.sql"), readFileSync(join(root, "temp_p3_functions.sql"), "utf8"));
writeFileSync(join(outDir, "m0_rls.sql"), readFileSync(join(root, "temp_p4_rls.sql"), "utf8"));
writeFileSync(
  join(outDir, "m0_indexes_storage.sql"),
  readFileSync(join(root, "temp_p5_indexes.sql"), "utf8") + "\n\n" + storageSql
);

console.log(
  ["m0_fk", "m0_tables", "m0_functions", "m0_rls", "m0_indexes_storage"]
    .map((f) => `${f}: ${readFileSync(join(outDir, f + ".sql"), "utf8").length}`)
    .join("\n")
);
