"use client";

// app/(auth)/login/page.tsx
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identifier: identifier.trim(), password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error?.message ?? "ログインに失敗しました。");
                return;
            }

            router.push("/chat");
            router.refresh();
        } catch {
            setError("通信エラーが発生しました。再度お試しください。");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="w-full max-w-sm">
            {/* ロゴ・タイトル */}
            <div className="mb-8 text-center">
                <div className="inline-flex items-center gap-2 mb-3">
                    <span className="text-2xl">🦎</span>
                    <span className="text-2xl font-bold tracking-tight text-slate-900">
                        tiliqua
                    </span>
                </div>
                <p className="text-sm text-slate-500">プライベートなチャットへ</p>
            </div>

            {/* フォームカード */}
            <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-8">
                <h1 className="text-lg font-semibold text-slate-900 mb-6">ログイン</h1>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* ユーザーIDまたはメールアドレス */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            ユーザーIDまたはメールアドレス
                        </label>
                        <input
                            type="text"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            placeholder="username または email@example.com"
                            required
                            autoComplete="username"
                            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                        />
                    </div>

                    {/* パスワード */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            パスワード
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="パスワードを入力"
                                required
                                autoComplete="current-password"
                                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 pr-14 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 transition px-1"
                            >
                                {showPassword ? "隠す" : "表示"}
                            </button>
                        </div>
                    </div>

                    {/* エラーメッセージ */}
                    {error && (
                        <p className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
                            {error}
                        </p>
                    )}

                    {/* 送信ボタン */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium py-2.5 text-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isLoading ? "ログイン中..." : "ログイン"}
                    </button>
                </form>
            </div>

            {/* 新規登録リンク */}
            <p className="mt-5 text-center text-sm text-slate-500">
                アカウントをお持ちでない方は{" "}
                <Link
                    href="/signup"
                    className="text-teal-600 font-medium hover:underline"
                >
                    新規登録
                </Link>
            </p>
        </div>
    );
}