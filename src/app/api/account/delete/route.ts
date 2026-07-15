import { NextResponse } from "next/server";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function DELETE(req: Request) {
  try {
    // 1. Verify the request has a valid session
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    // NOTE: isOAuthUser is NOT read from the client body — it is determined
    // server-side below to prevent privilege escalation via a spoofed flag.
    const { password, confirmEmail } = body as {
      password?: string;
      confirmEmail?: string;
    };

    // 2. Determine the account type SERVER-SIDE using the admin client.
    //    This cannot be spoofed by the client.
    const adminClient = createServiceClient();
    const { data: adminUserData, error: adminUserError } = await adminClient.auth.admin.getUserById(user.id);

    if (adminUserError || !adminUserData?.user) {
      console.error("[DELETE /api/account/delete] Failed to fetch user from admin:", adminUserError);
      return NextResponse.json({ error: "Could not verify account. Please try again." }, { status: 500 });
    }

    const identities = adminUserData.user.identities ?? [];
    const isOAuthUser = !identities.some((id) => id.provider === "email");

    // 3. Re-verify identity before any destructive action
    if (!isOAuthUser) {
      // Email/password account: re-authenticate with their password
      if (!password || typeof password !== "string" || password.trim() === "") {
        return NextResponse.json(
          { error: "Password is required to delete your account." },
          { status: 400 }
        );
      }
      if (!user.email) {
        return NextResponse.json(
          { error: "Could not determine account email." },
          { status: 400 }
        );
      }

      // Use the anon client to re-validate the password
      const anonClient = await createClient();
      const { error: signInError } = await anonClient.auth.signInWithPassword({
        email: user.email,
        password,
      });

      if (signInError) {
        return NextResponse.json(
          { error: "Incorrect password. Account was not deleted." },
          { status: 403 }
        );
      }
    } else {
      // OAuth account: verify the typed email matches the session email
      if (!confirmEmail || typeof confirmEmail !== "string") {
        return NextResponse.json(
          { error: "Email confirmation is required." },
          { status: 400 }
        );
      }
      if (confirmEmail.trim().toLowerCase() !== user.email?.toLowerCase()) {
        return NextResponse.json(
          { error: "Email address does not match. Account was not deleted." },
          { status: 403 }
        );
      }
    }

    // 4. Identity verified — proceed with deletion using the service role client.
    //    All deletions are scoped to the authenticated user's own ID.
    const userId = user.id;

    const deletionSteps = [
      adminClient.from("push_subscriptions").delete().eq("user_id", userId),
      adminClient.from("notifications").delete().eq("user_id", userId),
      adminClient.from("watchlist_entries").delete().eq("user_id", userId),
      adminClient.from("user_preferences").delete().eq("user_id", userId),
      adminClient.from("profiles").delete().eq("id", userId),
    ];

    const results = await Promise.allSettled(deletionSteps);
    const dataErrors = results
      .filter((r) => r.status === "rejected" || (r.status === "fulfilled" && r.value.error))
      .map((r) =>
        r.status === "rejected"
          ? r.reason
          : (r as PromiseFulfilledResult<{ error: any }>).value.error
      );

    if (dataErrors.length > 0) {
      console.error("[DELETE /api/account/delete] Non-fatal data deletion errors:", dataErrors);
    }

    // 5. Delete the auth user — removes auth.users row and cascades to identities etc.
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteUserError) {
      console.error("[DELETE /api/account/delete] Failed to delete auth user:", deleteUserError);
      return NextResponse.json(
        { error: "Failed to delete account. Please try again or contact support." },
        { status: 500 }
      );
    }

    // 6. Sign out the current session (best-effort; user is already deleted)
    try {
      const sessionClient = await createClient();
      await sessionClient.auth.signOut();
    } catch (_) {
      // Non-fatal — the auth record is gone; any lingering session will be invalid.
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/account/delete] Unexpected error:", error);
    return NextResponse.json({ error: error.message ?? "Internal server error" }, { status: 500 });
  }
}

