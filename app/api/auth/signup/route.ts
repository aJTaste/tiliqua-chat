// app/api/auth/signup/route.ts
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

    const { username, display_name, password, email } = body as Record<string, string>;

    // --- バリデーション ---
    if (!username || !display_name || !password) {
        return NextResponse.json(
            { error: { code: "VALIDATION_ERROR", message: "ユーザーID、表示名、パスワードは必須です。" } },
            { status: 422 }
        );
    }

    if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
        return NextResponse.json(
            { error: { code: "VALIDATION_ERROR", message: "ユーザーIDは英数字3〜20文字で入力してください。" } },
            { status: 422 }
        );
    }

    if (display_name.trim().length < 1 || display_name.trim().length > 30) {
        return NextResponse.json(
            { error: { code: "VALIDATION_ERROR", message: "表示名は1〜30文字で入力してください。" } },
            { status: 422 }
        );
    }

    if (password.length < 8) {
        return NextResponse.json(
            { error: { code: "VALIDATION_ERROR", message: "パスワードは8文字以上で入力してください。" } },
            { status: 422 }
        );
    }

    // --- ユーザーID重複チェック ---
    // 未認証状態のためRLSをバイパスするadminClientを使用する
    const adminClient = createAdminClient();
    const { data: existingProfile } = await adminClient
        .from("profiles")
        .select("username")
        .eq("username", username)
        .maybeSingle();

    if (existingProfile) {
        return NextResponse.json(
            { error: { code: "VALIDATION_ERROR", message: "このユーザーIDはすでに使われています。" } },
            { status: 422 }
        );
    }

    // --- Supabase Auth へのサインアップ ---
    // メールアドレスが未入力の場合は内部用メールを生成する
    // （Supabase Authはメールアドレスなしでのサインアップをサポートしていないため）
    const authEmail =
        email && email.trim() ? email.trim() : `${username}@tiliqua.internal`;

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
        email: authEmail,
        password,
        options: {
            // このメタデータは on_auth_user_created トリガーが読み取り、
            // profiles レコードの作成に使用する
            data: {
                username,
                display_name: display_name.trim(),
            },
        },
    });

    if (error) {
        // メールアドレス重複
        if (
            error.message.includes("already registered") ||
            error.code === "user_already_exists"
        ) {
            return NextResponse.json(
                { error: { code: "VALIDATION_ERROR", message: "このメールアドレスはすでに登録されています。" } },
                { status: 422 }
            );
        }
        console.error("[signup] Supabase error:", error);
        return NextResponse.json(
            { error: { code: "INTERNAL_ERROR", message: "アカウント作成に失敗しました。しばらく待ってから再度お試しください。" } },
            { status: 500 }
        );
    }

    return NextResponse.json({ user: data.user }, { status: 201 });
}