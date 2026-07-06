import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPER_ADMIN_EMAILS = ["babajuwon0@gmail.com", "bsbsjuwon0@gmail.com"];

function pick<T extends Record<string, unknown>>(obj: T, keys: string[]) {
  const out: Record<string, unknown> = {};
  for (const k of keys) if (k in obj && obj[k] !== undefined && obj[k] !== "") out[k] = obj[k];
  return out;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const body = req.method === "GET" ? {} : await req.json().catch(() => ({}));
    const action = body.action || new URL(req.url).searchParams.get("action") || "list";

    // Resolve caller (may be anonymous)
    const authHeader = req.headers.get("Authorization");
    let callerEmail: string | null = null;
    let callerId: string | null = null;
    if (authHeader) {
      const callerClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace("Bearer ", "");
      const { data: claims } = await callerClient.auth.getClaims(token);
      if (claims?.claims?.sub) {
        callerId = claims.claims.sub;
        const admin0 = createClient(supabaseUrl, serviceRoleKey);
        const { data: callerAuth } = await admin0.auth.admin.getUserById(callerId);
        callerEmail = callerAuth?.user?.email?.toLowerCase() ?? null;
      }
    }
    const isOwner = !!callerEmail && SUPER_ADMIN_EMAILS.includes(callerEmail);

    // Authorize probe: always 200; the client reads `authorized`.
    if (action === "authorize") {
      return json({
        authorized: isOwner,
        authenticated: !!callerId,
        email: callerEmail,
        reason: !callerId ? "unauthenticated" : (!isOwner ? "forbidden" : null),
      });
    }

    // All other actions require the platform owner
    if (!callerId) return json({ error: "Unauthorized" }, 401);
    if (!isOwner) return json({ error: "Forbidden" }, 403);

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const claims = { claims: { sub: callerId } } as { claims: { sub: string } };

    if (action === "list") {
      const { data: profiles, error } = await admin
        .from("profiles")
        .select("id, name, email, company_id, avatar, created_at")
        .order("created_at", { ascending: false });
      if (error) return json({ error: error.message }, 400);

      // Company names
      const companyIds = [...new Set(profiles.map((p) => p.company_id).filter(Boolean))];
      const { data: companies } = await admin
        .from("company_profiles")
        .select("id, name")
        .in("id", companyIds.length ? companyIds : ["00000000-0000-0000-0000-000000000000"]);
      const companyMap = new Map((companies || []).map((c) => [c.id, c.name]));

      // Auth data (last sign in)
      const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 1000 });
      const authMap = new Map((authUsers?.users || []).map((u) => [u.id, u]));

      // User roles
      const userIds = profiles.map((p) => p.id);
      const { data: userRoleRows } = await admin
        .from("user_roles")
        .select("user_id, role_id, roles(id, name)")
        .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
      const roleMap = new Map<string, { id: string; name: string }[]>();
      for (const r of (userRoleRows || []) as any[]) {
        const list = roleMap.get(r.user_id) || [];
        if (r.roles) list.push({ id: r.roles.id, name: r.roles.name });
        roleMap.set(r.user_id, list);
      }

      const users = profiles.map((p) => ({
        id: p.id,
        name: p.name,
        email: p.email || authMap.get(p.id)?.email || null,
        company_id: p.company_id,
        company_name: p.company_id ? companyMap.get(p.company_id) || null : null,
        avatar_url: p.avatar,
        created_at: p.created_at,
        last_sign_in_at: authMap.get(p.id)?.last_sign_in_at || null,
        banned_until: (authMap.get(p.id) as any)?.banned_until || null,
        roles: roleMap.get(p.id) || [],
      }));
      return json({ users });
    }

    if (action === "list_roles") {
      const { data, error } = await admin.from("roles").select("id, name, description").order("name");
      if (error) return json({ error: error.message }, 400);
      return json({ roles: data });
    }

    if (action === "assign_role") {
      const { userId, roleId } = body;
      if (!userId || !roleId) return json({ error: "userId and roleId required" }, 400);
      await admin.from("user_roles").delete().eq("user_id", userId);
      const { error } = await admin.from("user_roles").insert({ user_id: userId, role_id: roleId });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    // Multi-role assignment (replace set)
    if (action === "assign_roles") {
      const { userId, roleIds } = body;
      if (!userId || !Array.isArray(roleIds)) return json({ error: "userId and roleIds[] required" }, 400);
      await admin.from("user_roles").delete().eq("user_id", userId);
      if (roleIds.length) {
        const rows = roleIds.map((rid: string) => ({ user_id: userId, role_id: rid }));
        const { error } = await admin.from("user_roles").insert(rows);
        if (error) return json({ error: error.message }, 400);
      }
      return json({ ok: true });
    }

    // Store / warehouse assignments per user
    if (action === "user_assignments") {
      const { userId } = body;
      if (!userId) return json({ error: "userId required" }, 400);
      const [s, w] = await Promise.all([
        admin.from("user_store_assignments").select("store_id").eq("user_id", userId),
        admin.from("user_warehouse_assignments").select("warehouse_id").eq("user_id", userId),
      ]);
      return json({
        storeIds: (s.data || []).map((r: any) => r.store_id),
        warehouseIds: (w.data || []).map((r: any) => r.warehouse_id),
      });
    }

    if (action === "set_user_assignments") {
      const { userId, storeIds, warehouseIds } = body;
      if (!userId) return json({ error: "userId required" }, 400);
      if (Array.isArray(storeIds)) {
        await admin.from("user_store_assignments").delete().eq("user_id", userId);
        if (storeIds.length) {
          const rows = storeIds.map((sid: string) => ({ user_id: userId, store_id: sid, assigned_by: callerId }));
          const { error } = await admin.from("user_store_assignments").insert(rows);
          if (error) return json({ error: error.message }, 400);
        }
      }
      if (Array.isArray(warehouseIds)) {
        await admin.from("user_warehouse_assignments").delete().eq("user_id", userId);
        if (warehouseIds.length) {
          const rows = warehouseIds.map((wid: string) => ({ user_id: userId, warehouse_id: wid, assigned_by: callerId }));
          const { error } = await admin.from("user_warehouse_assignments").insert(rows);
          if (error) return json({ error: error.message }, 400);
        }
      }
      return json({ ok: true });
    }

    if (action === "create") {
      const { email, password, name } = body;
      if (!email || !password || !name) return json({ error: "email, password, name required" }, 400);
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });
      if (error) return json({ error: error.message }, 400);
      return json({ user: data.user });
    }

    // Company / store / warehouse creation
    if (action === "create_company") {
      const { name, ownerId } = body as any;
      if (!name) return json({ error: "name required" }, 400);
      const patch = pick(body as any, ["name","industry","country","currency","phone","email","website","address","city","state","tax_id","business_type"]);
      const insert: Record<string, unknown> = {
        ...patch,
        owner_id: ownerId || callerId,
        is_active: true,
      };
      const { data, error } = await admin.from("company_profiles").insert(insert).select("*").single();
      if (error) return json({ error: error.message }, 400);
      return json({ company: data });
    }

    if (action === "create_store") {
      const { companyId, name, type, address, phone, email } = body as any;
      if (!companyId || !name) return json({ error: "companyId and name required" }, 400);
      const insert = { company_id: companyId, name, type: type || "retail", address: address || null, phone: phone || null, email: email || null, status: "active" };
      const { data, error } = await admin.from("stores").insert(insert).select("*").single();
      if (error) return json({ error: error.message }, 400);
      return json({ store: data });
    }

    if (action === "create_warehouse") {
      const { companyId, name, location, capacity } = body as any;
      if (!companyId || !name) return json({ error: "companyId and name required" }, 400);
      const insert: Record<string, unknown> = { company_id: companyId, name, location: location || null, status: "active" };
      if (capacity != null && capacity !== "") insert.capacity = Number(capacity);
      const { data, error } = await admin.from("warehouses").insert(insert).select("*").single();
      if (error) return json({ error: error.message }, 400);
      return json({ warehouse: data });
    }

    // Bulk user actions
    if (action === "bulk_ban" || action === "bulk_unban") {
      const { userIds } = body as any;
      if (!Array.isArray(userIds) || !userIds.length) return json({ error: "userIds[] required" }, 400);
      const duration = action === "bulk_ban" ? "876000h" : "none";
      const results: any[] = [];
      for (const uid of userIds) {
        if (uid === callerId) { results.push({ uid, skipped: "self" }); continue; }
        const { error } = await admin.auth.admin.updateUserById(uid, { ban_duration: duration } as any);
        results.push({ uid, ok: !error, error: error?.message });
      }
      return json({ results });
    }

    if (action === "bulk_move_company") {
      const { userIds, companyId } = body as any;
      if (!Array.isArray(userIds) || !userIds.length) return json({ error: "userIds[] required" }, 400);
      const { error } = await admin.from("profiles").update({ company_id: companyId || null }).in("id", userIds);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "update") {
      const { userId, name, email, password } = body;
      if (!userId) return json({ error: "userId required" }, 400);
      const updates: Record<string, unknown> = {};
      if (email) updates.email = email;
      if (password) updates.password = password;
      if (name) updates.user_metadata = { name };
      if (Object.keys(updates).length) {
        const { error } = await admin.auth.admin.updateUserById(userId, updates);
        if (error) return json({ error: error.message }, 400);
      }
      if (name || email) {
        await admin
          .from("profiles")
          .update({ ...(name && { name }), ...(email && { email }) })
          .eq("id", userId);
      }
      return json({ ok: true });
    }

    if (action === "delete") {
      const { userId } = body;
      if (!userId) return json({ error: "userId required" }, 400);
      if (userId === claims.claims.sub) return json({ error: "Cannot delete yourself" }, 400);
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    // ---------- Platform stats ----------
    if (action === "platform_stats") {
      const [companies, profilesC, stores, warehouses, salesAgg, activeCompanies] = await Promise.all([
        admin.from("company_profiles").select("id", { count: "exact", head: true }),
        admin.from("profiles").select("id", { count: "exact", head: true }),
        admin.from("stores").select("id", { count: "exact", head: true }),
        admin.from("warehouses").select("id", { count: "exact", head: true }),
        admin.from("sales_transactions").select("total").eq("status", "completed"),
        admin.from("company_profiles").select("id", { count: "exact", head: true }).eq("is_active", true),
      ]);
      const salesTotal = (salesAgg.data || []).reduce((s: number, r: any) => s + Number(r.total || 0), 0);
      return json({
        stats: {
          companies: companies.count || 0,
          active_companies: activeCompanies.count || 0,
          users: profilesC.count || 0,
          stores: stores.count || 0,
          warehouses: warehouses.count || 0,
          sales_completed_count: (salesAgg.data || []).length,
          sales_completed_total: salesTotal,
        },
      });
    }

    // ---------- Companies ----------
    if (action === "list_companies") {
      const { data: companies, error } = await admin
        .from("company_profiles")
        .select("id, name, industry, country, currency, is_active, suspended_at, suspended_reason, owner_id, created_at")
        .order("created_at", { ascending: false });
      if (error) return json({ error: error.message }, 400);

      const ids = (companies || []).map((c) => c.id);
      const inList = ids.length ? ids : ["00000000-0000-0000-0000-000000000000"];

      const [usersRes, storesRes, whRes, salesRes] = await Promise.all([
        admin.from("profiles").select("id, company_id").in("company_id", inList),
        admin.from("stores").select("id, company_id").in("company_id", inList),
        admin.from("warehouses").select("id, company_id").in("company_id", inList),
        admin.from("sales_transactions").select("company_id, total").in("company_id", inList).eq("status", "completed"),
      ]);
      const bump = (m: Map<string, number>, k: string, n = 1) => m.set(k, (m.get(k) || 0) + n);
      const uCount = new Map<string, number>(), sCount = new Map<string, number>(),
            wCount = new Map<string, number>(), salesSum = new Map<string, number>();
      for (const p of (usersRes.data || [])) if (p.company_id) bump(uCount, p.company_id);
      for (const s of (storesRes.data || [])) if (s.company_id) bump(sCount, s.company_id);
      for (const w of (whRes.data || [])) if (w.company_id) bump(wCount, w.company_id);
      for (const t of (salesRes.data || []) as any[]) if (t.company_id) bump(salesSum, t.company_id, Number(t.total || 0));

      const rows = (companies || []).map((c) => ({
        ...c,
        user_count: uCount.get(c.id) || 0,
        store_count: sCount.get(c.id) || 0,
        warehouse_count: wCount.get(c.id) || 0,
        sales_total: salesSum.get(c.id) || 0,
      }));
      return json({ companies: rows });
    }

    if (action === "company_detail") {
      const { companyId } = body;
      if (!companyId) return json({ error: "companyId required" }, 400);
      const [comp, profs, stores, warehouses, ownerAuth] = await Promise.all([
        admin.from("company_profiles").select("*").eq("id", companyId).single(),
        admin.from("profiles").select("id, name, email, avatar, created_at").eq("company_id", companyId),
        admin.from("stores").select("id, name, address, phone, email, type, status, created_at").eq("company_id", companyId),
        admin.from("warehouses").select("id, name, location, capacity, status, created_at").eq("company_id", companyId),
        Promise.resolve(null),
      ]);
      if (comp.error) return json({ error: comp.error.message }, 400);

      // roles + auth data for the users
      const userIds = (profs.data || []).map((p) => p.id);
      const inList = userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"];
      const [rolesRes, authUsersRes] = await Promise.all([
        admin.from("user_roles").select("user_id, roles(id, name)").in("user_id", inList),
        admin.auth.admin.listUsers({ perPage: 1000 }),
      ]);
      const roleMap = new Map<string, { id: string; name: string }[]>();
      for (const r of (rolesRes.data || []) as any[]) {
        const list = roleMap.get(r.user_id) || [];
        if (r.roles) list.push({ id: r.roles.id, name: r.roles.name });
        roleMap.set(r.user_id, list);
      }
      const authMap = new Map((authUsersRes.data?.users || []).map((u) => [u.id, u]));
      const users = (profs.data || []).map((p) => ({
        ...p,
        last_sign_in_at: authMap.get(p.id)?.last_sign_in_at || null,
        banned_until: (authMap.get(p.id) as any)?.banned_until || null,
        roles: roleMap.get(p.id) || [],
      }));
      return json({ company: comp.data, users, stores: stores.data || [], warehouses: warehouses.data || [] });
    }

    if (action === "update_company") {
      const { companyId, patch } = body;
      if (!companyId || !patch) return json({ error: "companyId and patch required" }, 400);
      const allowed = ["name","industry","country","currency","phone","email","website","address","city","state","tax_id","business_type"];
      const clean: Record<string, unknown> = {};
      for (const k of allowed) if (k in patch) clean[k] = (patch as any)[k];
      if (!Object.keys(clean).length) return json({ error: "No valid fields" }, 400);
      const { error } = await admin.from("company_profiles").update(clean).eq("id", companyId);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "set_company_active") {
      const { companyId, active, reason } = body;
      if (!companyId || typeof active !== "boolean") return json({ error: "companyId and active required" }, 400);
      const patch = active
        ? { is_active: true, suspended_at: null, suspended_reason: null }
        : { is_active: false, suspended_at: new Date().toISOString(), suspended_reason: reason || null };
      const { error } = await admin.from("company_profiles").update(patch).eq("id", companyId);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    // ---------- User cross-company actions ----------
    if (action === "move_user_company") {
      const { userId, companyId } = body;
      if (!userId) return json({ error: "userId required" }, 400);
      const { error } = await admin.from("profiles").update({ company_id: companyId || null }).eq("id", userId);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "ban_user") {
      const { userId } = body;
      if (!userId) return json({ error: "userId required" }, 400);
      if (userId === callerId) return json({ error: "Cannot ban yourself" }, 400);
      const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: "876000h" } as any);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "unban_user") {
      const { userId } = body;
      if (!userId) return json({ error: "userId required" }, 400);
      const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: "none" } as any);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    // ---------- Audit log ----------
    if (action === "list_audit") {
      const { companyId, action: actFilter, severity, from, to, limit } = body as any;
      let q = admin.from("audit_log").select("id, created_at, user_name, user_role, action, module, target, detail, severity, company_id", { count: "exact" }).order("created_at", { ascending: false }).limit(Math.min(Number(limit || 200), 500));
      if (companyId) q = q.eq("company_id", companyId);
      if (actFilter) q = q.ilike("action", `%${actFilter}%`);
      if (severity) q = q.eq("severity", severity);
      if (from) q = q.gte("created_at", from);
      if (to) q = q.lte("created_at", to);
      const { data, error, count } = await q;
      if (error) return json({ error: error.message }, 400);
      // Attach company names
      const cIds = [...new Set((data || []).map((r) => r.company_id).filter(Boolean))];
      const { data: comps } = await admin.from("company_profiles").select("id, name").in("id", cIds.length ? cIds : ["00000000-0000-0000-0000-000000000000"]);
      const cMap = new Map((comps || []).map((c) => [c.id, c.name]));
      const rows = (data || []).map((r) => ({ ...r, company_name: r.company_id ? cMap.get(r.company_id) || null : null }));
      return json({ audit: rows, total: count || rows.length });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});