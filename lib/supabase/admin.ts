// lib/supabase/admin.ts
// サービスロールキーを使用してRLSをバイパスするクライアント。
// Route Handler などサーバーサイドの処理でのみ使用すること。
// クライアントサイド（ブラウザ）には絶対に公開しないこと。
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    );
}