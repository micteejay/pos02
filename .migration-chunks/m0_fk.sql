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