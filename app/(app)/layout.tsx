// app/(app)/layout.tsx
// 認証済みユーザー向けのレイアウト（チャット機能実装時に拡張予定）
export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <div className="min-h-screen bg-slate-50">{children}</div>;
}