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

    // --- 認証用メールアドレスの決定 ---
    // メールアドレスが未入力の場合は内部用メールを生成する
    // （Supabase Authはメールアドレスなしでのサインアップをサポートしていないため）
    const authEmail =
        email && email.trim() ? email.trim() : `${username}@tiliqua.app`;

    // --- Supabase Auth へのユーザー作成 ---
    // admin.createUser() を使用することでメールドメイン検証をバイパスする
    // （supabase.auth.signUp() はドメインのMXレコードを確認するため内部メールが弾かれる）
    const { error: createError } = await adminClient.auth.admin.createUser({
        email: authEmail,
        password,
        user_metadata: {
            username,
            display_name: display_name.trim(),
        },
        email_confirm: true, // メール確認を不要にする
    });

    if (createError) {
        if (
            createError.message.includes("already registered") ||
            createError.code === "email_exists"
        ) {
            return NextResponse.json(
                { error: { code: "VALIDATION_ERROR", message: "このユーザーIDまたはメールアドレスはすでに登録されています。" } },
                { status: 422 }
            );
        }
        console.error("[signup] Admin error:", createError);
        return NextResponse.json(
            { error: { code: "INTERNAL_ERROR", message: "アカウント作成に失敗しました。しばらく待ってから再度お試しください。" } },
            { status: 500 }
        );
    }

    // ユーザー作成後、すぐにサインインしてセッションを作成する
    const supabase = await createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password,
    });

    if (signInError) {
        console.error("[signup] Sign in after creation error:", signInError);
        return NextResponse.json(
            { error: { code: "INTERNAL_ERROR", message: "アカウントは作成されましたが、ログインに失敗しました。ログインページからお試しください。" } },
            { status: 500 }
        );
    }

    return NextResponse.json({ user: data.user }, { status: 201 });
}