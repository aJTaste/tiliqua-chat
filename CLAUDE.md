@AGENTS.md

# tiliqua-chat 開発メモ

## プロジェクト概要
軽量・プライバシー重視のWebチャットアプリ。
詳細要件は `docs/srs.md` を参照。

## 技術スタック
- フロントエンド: Next.js 16 (App Router / TypeScript)
- スタイリング: Tailwind CSS v4
- バックエンド: Supabase (Auth / PostgreSQL / Realtime)
- 画像ストレージ: Cloudinary
- デプロイ: Vercel

## セットアップ状況
- [x] Next.js プロジェクト作成
- [x] Supabase プロジェクト作成・クライアント設定 (lib/supabase/)
- [x] GitHub リポジトリ作成・初回プッシュ
- [x] Vercel デプロイ・GitHub 連携
- [x] Supabase テーブル作成・RLS設定 (docs/schema.sql)
- [x] 認証フロー実装（サインアップ・ログイン・ログアウト）
- [ ] チャット機能実装

## 環境変数
.env.local に以下を設定済み（Cloudinary は画像機能実装時に追加）:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

## ファイル構成（認証フロー完了時点）
```
tiliqua-chat/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx           # 認証ページ共通レイアウト（中央寄せ）
│   │   ├── login/
│   │   │   └── page.tsx         # ログインページ
│   │   └── signup/
│   │       └── page.tsx         # サインアップページ（パスワード確認あり）
│   ├── (app)/
│   │   ├── layout.tsx           # 認証済みページ共通レイアウト
│   │   └── chat/
│   │       └── page.tsx         # チャットページ（プレースホルダー）
│   ├── api/
│   │   └── auth/
│   │       ├── signup/route.ts  # サインアップAPI
│   │       ├── login/route.ts   # ログインAPI
│   │       └── logout/route.ts  # ログアウトAPI
│   ├── globals.css
│   ├── layout.tsx               # ルートレイアウト
│   └── page.tsx                 # ランディングページ（未実装）
├── lib/
│   └── supabase/
│       ├── client.ts            # ブラウザ用クライアント
│       ├── server.ts            # サーバー用クライアント（Cookie管理）
│       └── admin.ts             # 管理者用クライアント（service_role・RLSバイパス）
├── docs/
│   ├── srs.md                   # ソフトウェア要件定義書
│   └── schema.sql               # DBスキーマ（Supabase SQL Editor用）
├── proxy.ts                     # Next.js 16 セッション管理・ルート保護
└── CLAUDE.md                    # このファイル
```

## 技術的な決定事項・注意点

### DBスキーマ
- **Userテーブルの分割**: SRSのUserテーブルを `profiles`（公開情報）と `user_settings`（非公開情報）の2テーブルに分割。RLSは行単位のみ制御可能なため、カラム単位のアクセス制御にはテーブル分割が必要。
- **GRANTの必要性**: SQL Editorで作成したテーブルはservice_roleへの権限付与が必要。`GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;` を実行済み（Supabase Dashboard自動付与の対象外）。
- **is_room_member()関数**: RLSポリシーの再帰を避けるため `SECURITY DEFINER` + `SET search_path = public` を設定。
- **handle_new_user()トリガー**: auth.usersへのINSERT時にprofilesとuser_settingsを自動作成。`SET search_path = public` が必須（なければpublicスキーマのテーブルが見つからずエラー）。metadata（username・display_name）はサインアップ時にoptions.dataとして渡す。

### 認証フロー
- **内部メールアドレス**: メールアドレス未登録ユーザーには `{username}@tiliqua.app` 形式の内部メールを使用してSupabase Authに登録。user_settingsにはNULLで保存（triggerのCASE文で判定）。
- **admin.createUser()**: `supabase.auth.signUp()` はMXレコード検証を行い内部メールを弾くため、代わりに `adminClient.auth.admin.createUser()` を使用（email_confirm: true でメール確認不要）。
- **ユーザーIDログイン**: profilesテーブルでusernameからIDを取得 → user_settingsでメールを確認 → signInWithPassword。

### Next.js 16
- `middleware.ts` は廃止。`proxy.ts` にリネームし、export関数名も `middleware` → `proxy` に変更。

## 開発上のルール
- コミットメッセージは Conventional Commits 形式（chore:, feat:, fix: 等）
- RLS は全テーブルに必須
- サーバーサイド処理は lib/supabase/server.ts を使用
- クライアントサイド処理は lib/supabase/client.ts を使用
- RLSバイパスが必要な処理（未認証時のDB参照等）は lib/supabase/admin.ts を使用
- 完全なファイルを提供・置き換える方針（部分差し替えによるミスを防ぐため）