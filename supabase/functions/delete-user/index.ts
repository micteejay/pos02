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
    const { data: callerAuthUser } = await adminClient.auth.admin.getUserById(callerId);
    const callerEmail = (callerAuthUser?.user?.email || "").toLowerCase();
    const isOwner = callerEmail === "babajuwon0@gmail.com";
    if (!isAdmin && !isOwner) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin role required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Prevent self-deletion
    if (user_id === callerId) {
      return new Response(JSON.stringify({ error: "Cannot delete your own account" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Cross-company deletions are owner-only
    if (!isOwner) {
      const [{ data: callerProfileScope }, { data: targetProfile }] = await Promise.all([
        adminClient.from("profiles").select("company_id").eq("id", callerId).single(),
        adminClient.from("profiles").select("company_id").eq("id", user_id).single(),
      ]);
      if (!callerProfileScope?.company_id || callerProfileScope.company_id !== targetProfile?.company_id) {
        return new Response(JSON.stringify({ error: "Forbidden: cross-company deletion is owner-only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Delete the auth user (cascades to profiles, user_roles, etc.)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user_id);
    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
