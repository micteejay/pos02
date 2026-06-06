import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller using getClaims (works with signing-keys)
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const callerId = claimsData.claims.sub;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check caller has admin role
    const { data: isAdmin } = await adminClient.rpc("has_any_role", { _user_id: callerId, _roles: ["super_admin", "admin"] });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin role required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { username, password, name, role, department, store, companyId: bodyCompanyId } = await req.json();

    if (!username || !password || !name) {
      return new Response(JSON.stringify({ error: "username, password, and name are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Generate a synthetic email from username for Supabase Auth
    const email = username.includes("@") ? username : `${username.toLowerCase().replace(/\s+/g, ".")}@staff.internal`;

    // Create auth user with admin API (auto-confirms email)
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (createError || !newUser?.user) {
      const msg = createError?.message || "Failed to create user";
      const userMsg = msg.includes("already been registered")
        ? `Username "${username}" is already taken. Please choose a different username.`
        : msg;
      return new Response(JSON.stringify({ error: userMsg }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userId = newUser.user.id;

    // Get caller's company_id to assign to the new user
    let companyId = bodyCompanyId;
    if (!companyId) {
      const { data: callerProfile } = await adminClient.from("profiles").select("company_id").eq("id", callerId).single();
      companyId = callerProfile?.company_id || null;
    }

    if (!companyId) {
      // Roll back the orphan auth user so the admin can retry cleanly.
      await adminClient.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: "Your account is not linked to a company. Open Company Setup first, then create users." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Update profile with name and company_id (trigger should have created it).
    // We retry briefly because the auth → profiles trigger is async.
    let profileUpdated = false;
    for (let attempt = 0; attempt < 5 && !profileUpdated; attempt++) {
      const { error: updErr, data: updRow } = await adminClient
        .from("profiles")
        .update({ name, email, company_id: companyId })
        .eq("id", userId)
        .select("id")
        .maybeSingle();
      if (!updErr && updRow) { profileUpdated = true; break; }
      await new Promise((r) => setTimeout(r, 150));
    }
    if (!profileUpdated) {
      // Fallback: insert the row directly if the trigger never fired.
      await adminClient.from("profiles").upsert({ id: userId, name, email, company_id: companyId });
    }

    // Assign role if specified
    if (role) {
      const { data: roleRow } = await adminClient.from("roles").select("id").eq("name", role).single();
      if (roleRow) {
        await adminClient.from("user_roles").delete().eq("user_id", userId);
        await adminClient.from("user_roles").insert({ user_id: userId, role_id: roleRow.id });
      }
    }

    // Assign store if specified
    if (store) {
      const { data: storeRow } = await adminClient.from("stores").select("id").eq("name", store).single();
      if (storeRow) {
        await adminClient.from("user_store_assignments").insert({ user_id: userId, store_id: storeRow.id, assigned_by: callerId });
        await adminClient.from("profiles").update({ store_id: storeRow.id }).eq("id", userId);
      }
    }

    // Assign department if specified
    if (department) {
      const { data: deptRow } = await adminClient.from("departments").select("id").eq("name", department).single();
      if (deptRow) {
        await adminClient.from("profiles").update({ department_id: deptRow.id }).eq("id", userId);
      }
    }

    return new Response(JSON.stringify({ id: userId, email, name }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
