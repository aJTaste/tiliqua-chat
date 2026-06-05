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
- [ ] Supabase テーブル作成・RLS設定
- [ ] 認証フロー実装
- [ ] チャット機能実装

## 環境変数
.env.local に以下を設定済み（Cloudinary は画像機能実装時に追加）:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

## 開発上のルール
- コミットメッセージは Conventional Commits 形式（chore:, feat:, fix: 等）
- RLS は全テーブルに必須
- サーバーサイド処理は lib/supabase/server.ts を使用
- クライアントサイド処理は lib/supabase/client.ts を使用