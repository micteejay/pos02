import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPER_ADMIN_EMAILS = ["babajuwon0@gmail.com", "bsbsjuwon0@gmail.com"];

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
        .select("id, name, email, company_id, avatar_url, created_at")
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
        avatar_url: p.avatar_url,
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

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});