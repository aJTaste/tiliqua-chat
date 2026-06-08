-- ============================================================
-- tiliqua-chat データベーススキーマ
-- Supabase SQL Editor にそのまま貼り付けて実行してください
-- ============================================================


-- ============================================================
-- テーブル作成
-- ============================================================

-- 1. profiles（公開プロフィール情報）
-- auth.users と1対1で対応する。他ユーザーから見える情報を持つ。
CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username     TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url   TEXT,
  dm_from_stranger_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- ユーザーID: 英数字のみ・3〜20文字
  CONSTRAINT username_length CHECK (char_length(username) BETWEEN 3 AND 20),
  CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9]+$'),
  -- 表示名: 1〜30文字
  CONSTRAINT display_name_length CHECK (char_length(display_name) BETWEEN 1 AND 30)
);

-- 2. user_settings（非公開設定情報）
-- 自分だけが見える情報（メール・追加認証・通知設定）
CREATE TABLE user_settings (
  id                         UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  email                      TEXT UNIQUE,
  auth_type                  TEXT CHECK (auth_type IN ('pin', 'key')),
  auth_secret                TEXT, -- bcryptハッシュ済み
  push_notifications_enabled BOOLEAN NOT NULL DEFAULT true,

  -- auth_type と auth_secret はセットで設定・解除する必要がある
  CONSTRAINT auth_consistency CHECK (
    (auth_type IS NULL AND auth_secret IS NULL) OR
    (auth_type IS NOT NULL AND auth_secret IS NOT NULL)
  )
);

-- 3. rooms（チャットルーム）
CREATE TABLE rooms (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT,                          -- グループ名（1対1はNULL可）
  is_group     BOOLEAN NOT NULL DEFAULT false,
  is_temporary BOOLEAN NOT NULL DEFAULT false,
  expires_at   TIMESTAMPTZ,                   -- 一時チャットの有効期限（最大90日）
  lock_type    TEXT NOT NULL DEFAULT 'none',  -- チャットロック種別
  lock_secret  TEXT,                          -- bcryptハッシュ済み
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT lock_type_values CHECK (lock_type IN ('none', 'pin', 'key')),
  -- ロック設定と lock_secret はセット
  CONSTRAINT lock_consistency CHECK (
    (lock_type = 'none' AND lock_secret IS NULL) OR
    (lock_type != 'none' AND lock_secret IS NOT NULL)
  ),
  -- 一時チャットには必ず有効期限が必要
  CONSTRAINT temporary_consistency CHECK (
    (is_temporary = false AND expires_at IS NULL) OR
    (is_temporary = true  AND expires_at IS NOT NULL)
  ),
  -- 有効期限は作成日から90日以内
  CONSTRAINT expires_within_90_days CHECK (
    expires_at IS NULL OR expires_at <= (created_at + INTERVAL '90 days')
  )
);

-- 4. room_members（ルーム参加者）
CREATE TABLE room_members (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id   UUID NOT NULL REFERENCES rooms(id)    ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role      TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(room_id, user_id),
  CONSTRAINT role_values CHECK (role IN ('owner', 'member'))
);

-- 5. messages（メッセージ）
CREATE TABLE messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    UUID NOT NULL REFERENCES rooms(id)    ON DELETE CASCADE,
  sender_id  UUID          REFERENCES profiles(id) ON DELETE SET NULL, -- アカウント削除時NULLに
  content    TEXT,        -- テキスト本文（画像のみ送信時はNULL可）
  image_url  TEXT,        -- Cloudinary画像URL（テキストのみ時はNULL）
  deleted_at TIMESTAMPTZ, -- 論理削除日時（NULLなら未削除）
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- テキストか画像、少なくとも一方は必須
  CONSTRAINT content_or_image CHECK (content IS NOT NULL OR image_url IS NOT NULL)
);

-- 6. message_hidden（メッセージ非表示）
-- 自分の画面からのみメッセージを非表示にする。他者の画面には影響しない。
CREATE TABLE message_hidden (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  hidden_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(message_id, user_id)
);

-- 7. friendships（フレンド関係）
CREATE TABLE friendships (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending',
  is_read      BOOLEAN NOT NULL DEFAULT false, -- 受信者が申請を確認済みか
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(requester_id, addressee_id),
  CONSTRAINT status_values CHECK (status IN ('pending', 'accepted', 'rejected')),
  -- 自分自身へのフレンド申請を禁止
  CONSTRAINT no_self_friendship CHECK (requester_id != addressee_id)
);

-- 8. blocks（ブロック）
CREATE TABLE blocks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(blocker_id, blocked_id),
  -- 自分自身のブロックを禁止
  CONSTRAINT no_self_block CHECK (blocker_id != blocked_id)
);

-- 9. temp_chat_sessions（一時チャット・セッション管理）
-- 両者がチャットを閉じたタイミングを検知するためのテーブル
CREATE TABLE temp_chat_sessions (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id   UUID NOT NULL REFERENCES rooms(id)    ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  closed_at TIMESTAMPTZ, -- チャットを閉じた日時（NULLは未クローズ）

  UNIQUE(room_id, user_id)
);


-- ============================================================
-- インデックス（検索・取得の高速化）
-- ============================================================

-- メッセージのページング取得（最も重要・最も頻繁に使う）
CREATE INDEX idx_messages_room_created ON messages(room_id, created_at DESC);
-- 送信者でメッセージを検索
CREATE INDEX idx_messages_sender       ON messages(sender_id);
-- ユーザーが所属するルーム一覧を取得
CREATE INDEX idx_room_members_user     ON room_members(user_id);
-- 未読フレンド申請のバッジ表示
CREATE INDEX idx_friendships_addressee ON friendships(addressee_id, is_read);
-- 自分が送った申請の状態確認
CREATE INDEX idx_friendships_requester ON friendships(requester_id);
-- ブロックされているか確認（サーバーサイドで使用）
CREATE INDEX idx_blocks_blocked        ON blocks(blocked_id);
-- 期限切れ一時チャットの削除処理（is_temporary = true の行のみ対象）
CREATE INDEX idx_rooms_expires_at      ON rooms(expires_at) WHERE is_temporary = true;


-- ============================================================
-- RLS（Row Level Security）有効化
-- ============================================================

ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms              ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_hidden     ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships        ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE temp_chat_sessions ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- ヘルパー関数
-- ============================================================

-- 「自分が指定ルームのメンバーかどうか」を確認する関数。
-- 複数のRLSポリシーから呼び出すことで、同じロジックを一箇所にまとめる。
-- SECURITY DEFINER: この関数自身の権限でroom_membersを参照する。
--   これがないとRLSポリシーの中でroom_membersを参照する際に
--   再びRLSが発動して無限ループになる可能性があるため必要。
CREATE OR REPLACE FUNCTION is_room_member(room_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM room_members
    WHERE room_id = room_uuid
      AND user_id = auth.uid()
  );
$$;


-- ============================================================
-- RLS ポリシー
-- ============================================================

-- ----------
-- profiles
-- ----------
CREATE POLICY "profiles: 認証済みユーザーは全員読める"
  ON profiles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "profiles: 自分のプロフィールのみ更新可"
  ON profiles FOR UPDATE TO authenticated
  USING     (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- INSERT はトリガーが行うため、クライアントからは不可
-- DELETE はアカウント削除未実装のため、クライアントからは不可


-- ----------
-- user_settings
-- ----------
CREATE POLICY "user_settings: 自分の設定のみ読める"
  ON user_settings FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "user_settings: 自分の設定のみ更新可"
  ON user_settings FOR UPDATE TO authenticated
  USING     (id = auth.uid())
  WITH CHECK (id = auth.uid());


-- ----------
-- rooms
-- ----------
CREATE POLICY "rooms: 所属ルームのみ読める"
  ON rooms FOR SELECT TO authenticated
  USING (is_room_member(id));

CREATE POLICY "rooms: 認証済みユーザーはルームを作成可"
  ON rooms FOR INSERT TO authenticated
  WITH CHECK (true);
-- ※ roomsのINSERT後、Route Handlerがroom_membersにownerとして登録する

CREATE POLICY "rooms: オーナーのみルーム設定を更新可"
  ON rooms FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM room_members
      WHERE room_members.room_id = rooms.id
        AND room_members.user_id = auth.uid()
        AND room_members.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM room_members
      WHERE room_members.room_id = rooms.id
        AND room_members.user_id = auth.uid()
        AND room_members.role = 'owner'
    )
  );


-- ----------
-- room_members
-- ----------
-- INSERT・DELETE はサーバーサイド（service_role_key）のみ許可。
-- クライアントが勝手にルームへ参加・追放できないようにするため。
CREATE POLICY "room_members: 同じルームのメンバーのみ読める"
  ON room_members FOR SELECT TO authenticated
  USING (is_room_member(room_id));


-- ----------
-- messages
-- ----------
CREATE POLICY "messages: 所属ルームの未削除メッセージのみ読める"
  ON messages FOR SELECT TO authenticated
  USING (
    is_room_member(room_id)
    AND deleted_at IS NULL
  );

CREATE POLICY "messages: 所属ルームへのメッセージ送信可"
  ON messages FOR INSERT TO authenticated
  WITH CHECK (
    is_room_member(room_id)
    AND sender_id = auth.uid()
  );

CREATE POLICY "messages: 自分のメッセージのみ論理削除可（deleted_at の設定）"
  ON messages FOR UPDATE TO authenticated
  USING     (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());


-- ----------
-- message_hidden
-- ----------
CREATE POLICY "message_hidden: 自分の非表示設定のみ読める"
  ON message_hidden FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "message_hidden: 自分のみ非表示設定可"
  ON message_hidden FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "message_hidden: 自分の非表示設定のみ解除可"
  ON message_hidden FOR DELETE TO authenticated
  USING (user_id = auth.uid());


-- ----------
-- friendships
-- ----------
CREATE POLICY "friendships: 自分が関係する申請のみ読める"
  ON friendships FOR SELECT TO authenticated
  USING (
    requester_id = auth.uid()
    OR addressee_id = auth.uid()
  );

CREATE POLICY "friendships: 自分からの申請のみ作成可"
  ON friendships FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "friendships: 受信者のみ承認・拒否可"
  ON friendships FOR UPDATE TO authenticated
  USING     (addressee_id = auth.uid())
  WITH CHECK (addressee_id = auth.uid());


-- ----------
-- blocks
-- ----------
CREATE POLICY "blocks: 自分のブロックリストのみ読める"
  ON blocks FOR SELECT TO authenticated
  USING (blocker_id = auth.uid());

CREATE POLICY "blocks: 自分のみブロック登録可"
  ON blocks FOR INSERT TO authenticated
  WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "blocks: 自分のみブロック解除可"
  ON blocks FOR DELETE TO authenticated
  USING (blocker_id = auth.uid());


-- ----------
-- temp_chat_sessions
-- ----------
CREATE POLICY "temp_chat_sessions: 所属ルームのセッションのみ読める"
  ON temp_chat_sessions FOR SELECT TO authenticated
  USING (is_room_member(room_id));

CREATE POLICY "temp_chat_sessions: 所属ルームへのセッション作成可"
  ON temp_chat_sessions FOR INSERT TO authenticated
  WITH CHECK (
    is_room_member(room_id)
    AND user_id = auth.uid()
  );

CREATE POLICY "temp_chat_sessions: 自分のセッションのみ更新可（チャットを閉じる操作）"
  ON temp_chat_sessions FOR UPDATE TO authenticated
  USING     (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- ============================================================
-- トリガー
-- ============================================================

-- トリガー1: ユーザー登録時に profiles と user_settings を自動作成
-- Supabase Auth（auth.users）に新しいユーザーが登録されると自動で実行される。
-- username・display_name は、サインアップ時に options.data として渡すメタデータから取得する。
-- （Next.js の認証フロー実装時に、このメタデータを渡す必要がある）
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- auth.users テーブルにアクセスするために必要
AS $$
BEGIN
  INSERT INTO profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',      -- サインアップ時に渡すメタデータから取得
    NEW.raw_user_meta_data->>'display_name',  -- サインアップ時に渡すメタデータから取得
    NEW.raw_user_meta_data->>'avatar_url'     -- アイコンURL（任意・なければNULL）
  );

  INSERT INTO user_settings (id, email)
  VALUES (
    NEW.id,
    NEW.email  -- auth.users のメールアドレスを引き継ぐ（未設定ならNULL）
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();


-- トリガー2: friendships の updated_at を自動更新
-- 承認・拒否などで行が更新されるたびに updated_at を現在時刻にセットする。
CREATE OR REPLACE FUNCTION update_friendship_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_friendship_updated
  BEFORE UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION update_friendship_updated_at();