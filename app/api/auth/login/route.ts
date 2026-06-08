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

    if (!identifier || !password) {
        return NextResponse.json(
            { error: { code: "VALIDATION_ERROR", message: "ユーザーIDまたはメールアドレスとパスワードを入力してください。" } },
            { status: 422 }
        );
    }

    // identifier に @ が含まれているかで、メールログインかユーザーIDログインかを判定する
    let authEmail: string;

    if (identifier.includes("@")) {
        // メールアドレスでのログイン（そのまま使用）
        authEmail = identifier.trim();
    } else {
        // ユーザーIDでのログイン
        // 未認証状態のためRLSをバイパスするadminClientを使用する
        const adminClient = createAdminClient();

        // ユーザーIDからプロフィールを検索してIDを取得する
        const { data: profile } = await adminClient
            .from("profiles")
            .select("id")
            .eq("username", identifier.trim())
            .maybeSingle();

        if (!profile) {
            // ユーザーが見つからない場合でも、情報を漏らさないために同じエラーを返す
            return NextResponse.json(
                { error: { code: "UNAUTHORIZED", message: "ユーザーIDまたはパスワードが正しくありません。" } },
                { status: 401 }
            );
        }

        // user_settings からメールアドレスを取得する
        const { data: settings } = await adminClient
            .from("user_settings")
            .select("email")
            .eq("id", profile.id)
            .maybeSingle();

        // 実際のメールがあればそれを、なければ内部用メールを使用する
        authEmail = settings?.email ?? `${identifier.trim()}@tiliqua.internal`;
    }

    // Supabase Auth でサインインする
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password,
    });

    if (error) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED", message: "ユーザーIDまたはパスワードが正しくありません。" } },
            { status: 401 }
        );
    }

    return NextResponse.json({ user: data.user }, { status: 200 });
}