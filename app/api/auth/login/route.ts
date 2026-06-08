// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { error: { code: "VALIDATION_ERROR", message: "リクエストの形式が正しくありません。" } },
            { status: 422 }
        );
    }

    const { identifier, password } = body as Record<string, string>;

    // ── DEBUG ──────────────────────────────────────────────
    console.log("[LOGIN:1] identifier:", JSON.stringify(identifier));
    console.log("[LOGIN:1] password length:", password?.length);
    // ───────────────────────────────────────────────────────

    if (!identifier || !password) {
        return NextResponse.json(
            { error: { code: "VALIDATION_ERROR", message: "ユーザーIDまたはメールアドレスとパスワードを入力してください。" } },
            { status: 422 }
        );
    }

    let authEmail: string;

    if (identifier.includes("@")) {
        // メールアドレスでのログイン
        authEmail = identifier.trim();
        console.log("[LOGIN:2] メールログイン, authEmail:", authEmail);
    } else {
        // ユーザーIDでのログイン
        const adminClient = createAdminClient();

        // Step A: profilesからユーザーIDを検索
        const { data: profile, error: profileError } = await adminClient
            .from("profiles")
            .select("id")
            .eq("username", identifier.trim())
            .maybeSingle();

        console.log("[LOGIN:3] profiles検索結果:", { profile, profileError });

        if (profileError || !profile) {
            console.log("[LOGIN:3] profile未発見 → 401[P]");
            return NextResponse.json(
                // [P] = profileが見つからなかった場合
                { error: { code: "UNAUTHORIZED", message: "ユーザーIDまたはパスワードが正しくありません。[P]" } },
                { status: 401 }
            );
        }

        // Step B: user_settingsからメールアドレスを取得
        const { data: settings, error: settingsError } = await adminClient
            .from("user_settings")
            .select("email")
            .eq("id", profile.id)
            .maybeSingle();

        console.log("[LOGIN:4] user_settings検索結果:", { settings, settingsError });

        // 実際のメールがあればそれを、なければ内部メールを使用
        authEmail = settings?.email ?? `${identifier.trim()}@tiliqua.app`;
        console.log("[LOGIN:5] 決定したauthEmail:", authEmail);
    }

    // Step C: Supabase Authでサインイン
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password,
    });

    console.log("[LOGIN:6] signInWithPassword結果:", {
        成功: !!data?.user,
        errorMessage: error?.message,
        errorCode: error?.code,
        errorStatus: error?.status,
    });

    if (error) {
        // [S] = signInWithPasswordが失敗した場合
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED", message: "ユーザーIDまたはパスワードが正しくありません。[S]" } },
            { status: 401 }
        );
    }

    return NextResponse.json({ user: data.user }, { status: 200 });
}