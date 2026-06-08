// app/api/auth/logout/route.ts
// サインアウト処理。クッキーをクリアしてログインページへリダイレクトする。
// クッキーの書き込みをレスポンスに確実に反映するため、
// createClient() ではなく createServerClient() を直接使用する。
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
    // リダイレクトレスポンスを先に作成し、このオブジェクトに直接クッキーを書き込む
    const response = NextResponse.redirect(new URL("/login", request.url));

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    // セッションクッキーをリダイレクトレスポンスに書き込む
                    // これにより、ブラウザのクッキーが確実に削除される
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    await supabase.auth.signOut();
    return response;
}