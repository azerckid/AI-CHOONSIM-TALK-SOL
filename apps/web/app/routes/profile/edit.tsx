import { useState, useRef } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, useActionData, useNavigation, Form, redirect, useNavigate } from "react-router";
import type { ProfileEditLoaderData } from "~/lib/types/routes";
import { auth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { eq } from "drizzle-orm";
import { deleteImage } from "~/lib/cloudinary.server";
import { z } from "zod";
import { toast } from "sonner";

const profileSchema = z.object({
  name: z.string().min(1, "닉네임을 입력해주세요").max(20, "닉네임은 20자 이내로 입력해주세요"),
  bio: z.string().max(100, "상태메시지는 100자 이내로 입력해주세요").optional(),
  avatarUrl: z.string().url().optional().or(z.literal("")),
});

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return redirect("/login");

  const user = await db.query.user.findFirst({
    where: eq(schema.user.id, session.user.id),
    columns: {
      id: true,
      name: true,
      bio: true,
      avatarUrl: true,
      image: true,
      email: true,
    },
  });

  return Response.json({ user });
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return redirect("/login");

  const formData = await request.formData();

  const raw = {
    name: formData.get("name") as string,
    bio: (formData.get("bio") as string) || undefined,
    avatarUrl: (formData.get("avatarUrl") as string) || undefined,
  };

  const result = profileSchema.safeParse(raw);
  if (!result.success) {
    return Response.json({ errors: result.error.flatten().fieldErrors }, { status: 400 });
  }

  const { name, bio, avatarUrl } = result.data;

  const currentUser = await db.query.user.findFirst({
    where: eq(schema.user.id, session.user.id),
    columns: { avatarUrl: true },
  });

  // Delete old Cloudinary image if it changed
  if (
    currentUser?.avatarUrl &&
    avatarUrl !== currentUser.avatarUrl &&
    currentUser.avatarUrl.includes("res.cloudinary.com")
  ) {
    await deleteImage(currentUser.avatarUrl);
  }

  await db
    .update(schema.user)
    .set({ name, bio: bio || null, avatarUrl: avatarUrl || null, updatedAt: new Date() })
    .where(eq(schema.user.id, session.user.id));

  return redirect("/profile");
}

const DEFAULT_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCutVt4neD3mw-fGim_WdODfouQz3b0aaqpPfx1sNTt8N75jfKec3kNioEoZugl2D0eqVP5833PF21_hTqlDz38aVNUICprwHAM45vTdJeUPcA0mj_wzSgkMVSzYiv-RCJhNyAAZ0RlWSJQxzSa8Mi-yYPu-czB9WEbQsDFEjcAQwezmcZqtAbSB5bwyRhTTfr1y2rrxDHIFNN2G2fVmkHcCWo7uvVNjtAehxS8fgGKMbJgQ59q1ClGgD--3EuZR6f_esg0NbdGCao";

export default function ProfileEditScreen() {
  const { user } = useLoaderData<typeof loader>() as ProfileEditLoaderData;
  const actionData = useActionData() as { errors?: Record<string, string[]> } | undefined;
  const navigation = useNavigation();
  const navigate = useNavigate();

  const [previewUrl, setPreviewUrl] = useState<string>(user?.avatarUrl || user?.image || "");
  const [isUploading, setIsUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>(user?.avatarUrl || "");
  const [bioLength, setBioLength] = useState((user?.bio || "").length);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSubmitting = navigation.state === "submitting";

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    const reader = new FileReader();
    reader.onloadend = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);

    // Upload to Cloudinary via /api/upload
    setIsUploading(true);
    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setAvatarUrl(data.url);
      setPreviewUrl(data.url);
    } catch {
      toast.error("이미지 업로드에 실패했습니다");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto shadow-2xl overflow-hidden bg-background-light dark:bg-background-dark">
      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-primary/20 via-primary/5 to-transparent pointer-events-none z-0" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background-dark/70 backdrop-blur-md border-b border-white/5 px-4 h-14 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center text-white/80 hover:text-primary transition-colors size-10 rounded-full hover:bg-white/5"
        >
          <span className="material-symbols-outlined text-[24px]">arrow_back_ios_new</span>
        </button>
        <h1 className="text-base font-bold tracking-tight text-white/90">프로필 수정</h1>
        {/* Spacer to center the title */}
        <div className="size-10" />
      </header>

      <main className="flex-1 flex flex-col z-10 pb-10">
        <Form method="post" className="flex flex-col gap-6 px-6 pt-8">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-tr from-primary to-purple-600 rounded-full blur opacity-75" />
              <div className="relative w-28 h-28 rounded-full p-[3px] bg-background-dark">
                <div
                  className="w-full h-full rounded-full bg-cover bg-center overflow-hidden border-2 border-surface-highlight"
                  style={{ backgroundImage: `url(${previewUrl || DEFAULT_AVATAR})` }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute bottom-0 right-0 p-2 bg-surface-highlight border-4 border-background-dark rounded-full text-white hover:bg-primary transition-colors shadow-lg disabled:opacity-50"
                >
                  {isUploading ? (
                    <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-[16px] block">photo_camera</span>
                  )}
                </button>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <input type="hidden" name="avatarUrl" value={avatarUrl} />
            <p className="text-xs text-white/40">탭하여 프로필 사진 변경</p>
          </div>

          {/* Form Fields */}
          <div className="bg-surface-dark/50 border border-white/5 rounded-2xl p-5 backdrop-blur-sm space-y-5">
            {/* Name */}
            <div className="space-y-2">
              <label
                htmlFor="name"
                className="text-xs font-semibold text-white/50 uppercase tracking-widest"
              >
                닉네임
              </label>
              <input
                id="name"
                name="name"
                type="text"
                defaultValue={user?.name || ""}
                maxLength={20}
                placeholder="닉네임을 입력하세요"
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:border-primary/50 focus:outline-none transition-colors"
              />
              {actionData?.errors?.name && (
                <p className="text-xs text-red-400">{actionData.errors.name[0]}</p>
              )}
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="bio"
                  className="text-xs font-semibold text-white/50 uppercase tracking-widest"
                >
                  상태메시지
                </label>
                <span className="text-xs text-white/30">{bioLength}/100</span>
              </div>
              <textarea
                id="bio"
                name="bio"
                defaultValue={user?.bio || ""}
                maxLength={100}
                rows={3}
                placeholder="상태메시지를 입력하세요"
                onChange={(e) => setBioLength(e.target.value.length)}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:border-primary/50 focus:outline-none transition-colors resize-none"
              />
              {actionData?.errors?.bio && (
                <p className="text-xs text-red-400">{actionData.errors.bio[0]}</p>
              )}
            </div>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            disabled={isSubmitting || isUploading}
            className="w-full py-4 rounded-2xl bg-primary text-black font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "저장 중..." : "저장"}
          </button>
        </Form>
      </main>
    </div>
  );
}
