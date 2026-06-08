// proxy.ts
// すべてのリクエストに対してSupabaseのセッションを更新し、
// 未認証ユーザーを保護されたルートからリダイレクトする。
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
    // レスポンスを初期化する。setAll でクッキーを更新するため let で定義。
    let supabaseResponse = NextResponse.next({
        request,
    });

    // ミドルウェア専用のSupabaseクライアントを作成する。
    // クッキーをリクエストから読み取り、レスポンスに書き戻す。
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    // リクエストのクッキーを更新する
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    // レスポンスを再作成し、クッキーをレスポンスにも書き込む
                    supabaseResponse = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // IMPORTANT: getUser() の前後にロジックを挟まないこと。
    // セッションの検証と更新はこの呼び出しで行われる。
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { pathname } = request.nextUrl;

    // 保護されたルート（要認証）
    const isProtectedRoute = pathname.startsWith("/chat");
    // 認証ルート（ログイン済みならリダイレクト）
    const isAuthRoute = pathname === "/login" || pathname === "/signup";

    // 未認証で保護ルートにアクセス → ログインページへ
    if (!user && isProtectedRoute) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    // ログイン済みで認証ルートにアクセス → チャットページへ
    if (user && isAuthRoute) {
        const url = request.nextUrl.clone();
        url.pathname = "/chat";
        return NextResponse.redirect(url);
    }

    return supabaseResponse;
}

export const config = {
    matcher: [
        // 静的ファイルと画像最適化を除くすべてのルートにミドルウェアを適用する
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};