// app/(app)/chat/page.tsx
// チャット機能実装までのプレースホルダー。
// ミドルウェアによる保護があるが、念のためサーバーサイドでも認証を確認する。
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ChatPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("username, display_name")
        .eq("id", user.id)
        .single();

    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="text-center space-y-2">
                <div className="text-4xl mb-4">🦎</div>
                <h1 className="text-xl font-semibold text-slate-900">
                    ようこそ、{profile?.display_name ?? "ユーザー"}さん！
                </h1>
                <p className="text-sm text-slate-500">@{profile?.username}</p>
                <p className="text-sm text-slate-400 pt-2">チャット機能は実装中です</p>

                {/* ログアウト */}
                <form action="/api/auth/logout" method="POST" className="pt-4">
                    <button
                        type="submit"
                        className="rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-6 py-2 text-sm font-medium transition"
                    >
                        ログアウト
                    </button>
                </form>
            </div>
        </div>
    );
}