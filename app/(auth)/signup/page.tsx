"use client";

// app/(auth)/signup/page.tsx
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type FieldErrors = {
    username?: string;
    display_name?: string;
    password?: string;
    password_confirm?: string;
    email?: string;
};

export default function SignupPage() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [password, setPassword] = useState("");
    const [passwordConfirm, setPasswordConfirm] = useState("");
    const [email, setEmail] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [isLoading, setIsLoading] = useState(false);

    function clearFieldError(field: keyof FieldErrors) {
        setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }

    function validate(): boolean {
        const errors: FieldErrors = {};

        if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
            errors.username = "英数字3〜20文字で入力してください。";
        }
        if (displayName.trim().length < 1 || displayName.trim().length > 30) {
            errors.display_name = "1〜30文字で入力してください。";
        }
        if (password.length < 8) {
            errors.password = "8文字以上で入力してください。";
        }
        if (password !== passwordConfirm) {
            errors.password_confirm = "パスワードが一致しません。";
        }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            errors.email = "有効なメールアドレスを入力してください。";
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");

        if (!validate()) return;

        setIsLoading(true);

        try {
            const res = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: username.trim(),
                    display_name: displayName.trim(),
                    password,
                    email: email.trim() || undefined,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error?.message ?? "アカウント作成に失敗しました。");
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
                <p className="text-sm text-slate-500">アカウントを作成</p>
            </div>

            {/* フォームカード */}
            <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-8">
                <h1 className="text-lg font-semibold text-slate-900 mb-6">新規登録</h1>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* ユーザーID */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            ユーザーID
                            <span className="ml-1.5 text-xs font-normal text-slate-400">
                                英数字3〜20文字
                            </span>
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => { setUsername(e.target.value); clearFieldError("username"); }}
                            placeholder="例: haruto123"
                            required
                            autoComplete="username"
                            className={`w-full rounded-lg border px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition ${fieldErrors.username ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"
                                }`}
                        />
                        {fieldErrors.username && (
                            <p className="mt-1 text-xs text-red-500">{fieldErrors.username}</p>
                        )}
                    </div>

                    {/* 表示名 */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            表示名
                            <span className="ml-1.5 text-xs font-normal text-slate-400">
                                1〜30文字
                            </span>
                        </label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => { setDisplayName(e.target.value); clearFieldError("display_name"); }}
                            placeholder="例: ハルト"
                            required
                            autoComplete="name"
                            className={`w-full rounded-lg border px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition ${fieldErrors.display_name ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"
                                }`}
                        />
                        {fieldErrors.display_name && (
                            <p className="mt-1 text-xs text-red-500">{fieldErrors.display_name}</p>
                        )}
                    </div>

                    {/* パスワード */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            パスワード
                            <span className="ml-1.5 text-xs font-normal text-slate-400">
                                8文字以上
                            </span>
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); clearFieldError("password"); }}
                                placeholder="パスワードを入力"
                                required
                                autoComplete="new-password"
                                className={`w-full rounded-lg border px-4 py-2.5 pr-14 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition ${fieldErrors.password ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"
                                    }`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 transition px-1"
                            >
                                {showPassword ? "隠す" : "表示"}
                            </button>
                        </div>
                        {fieldErrors.password && (
                            <p className="mt-1 text-xs text-red-500">{fieldErrors.password}</p>
                        )}
                    </div>

                    {/* パスワード確認 */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            パスワード確認
                        </label>
                        <input
                            type={showPassword ? "text" : "password"}
                            value={passwordConfirm}
                            onChange={(e) => { setPasswordConfirm(e.target.value); clearFieldError("password_confirm"); }}
                            placeholder="もう一度入力"
                            required
                            autoComplete="new-password"
                            className={`w-full rounded-lg border px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition ${fieldErrors.password_confirm ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"
                                }`}
                        />
                        {fieldErrors.password_confirm && (
                            <p className="mt-1 text-xs text-red-500">{fieldErrors.password_confirm}</p>
                        )}
                    </div>

                    {/* メールアドレス（任意） */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            メールアドレス
                            <span className="ml-1.5 text-xs font-normal text-slate-400">
                                任意
                            </span>
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); clearFieldError("email"); }}
                            placeholder="email@example.com"
                            autoComplete="email"
                            className={`w-full rounded-lg border px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition ${fieldErrors.email ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"
                                }`}
                        />
                        {fieldErrors.email && (
                            <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>
                        )}
                        <p className="mt-1 text-xs text-slate-400">
                            パスワード忘れ時の回復に使用します
                        </p>
                    </div>

                    {/* 全体エラーメッセージ */}
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
                        {isLoading ? "作成中..." : "アカウントを作成"}
                    </button>
                </form>
            </div>

            {/* ログインリンク */}
            <p className="mt-5 text-center text-sm text-slate-500">
                すでにアカウントをお持ちの方は{" "}
                <Link href="/login" className="text-teal-600 font-medium hover:underline">
                    ログイン
                </Link>
            </p>
        </div>
    );
}