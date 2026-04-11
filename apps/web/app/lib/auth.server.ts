import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db.server";
import * as schema from "../db/schema";
import { eq } from "drizzle-orm";
import { logger } from "./logger.server";

export const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL,
    basePath: "/auth",
    database: drizzleAdapter(db, {
        provider: "sqlite",
        schema: {
            user: schema.user,
            account: schema.account,
            session: schema.session,
            verification: schema.verification,
        },
    }),
    emailAndPassword: {
        enabled: true,
    },
    account: {
        accountLinking: {
            updateUserInfoOnLink: true, // 새로 연결된 소셜 계정의 정보로 사용자 정보 업데이트
        },
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
            overrideUserInfoOnSignIn: true, // 로그인할 때마다 사용자 정보 업데이트
            mapProfileToUser: (profile) => {
                return {
                    name: profile.name,
                    email: profile.email,
                    image: profile.picture,
                    emailVerified: (profile as any).verified_email || false,
                };
            },
        },
        twitter: {
            clientId: process.env.TWITTER_CLIENT_ID || "",
            clientSecret: process.env.TWITTER_CLIENT_SECRET || "",
            overrideUserInfoOnSignIn: true, // 로그인할 때마다 사용자 정보 업데이트
            // Twitter API v2를 사용하여 사용자 정보 직접 가져오기
            getUserInfo: async (token) => {
                try {
                    // Twitter API v2 /2/users/me 엔드포인트 사용
                    const response = await fetch("https://api.twitter.com/2/users/me?user.fields=profile_image_url,username,name", {
                        headers: {
                            Authorization: `Bearer ${token.accessToken}`,
                        },
                    });

                    if (!response.ok) {
                        throw new Error(`Twitter API error: ${response.status}`);
                    }

                    const data = await response.json();
                    const profile = data.data; // Twitter API v2는 data 필드에 사용자 정보를 반환

                    // Twitter는 이메일을 기본적으로 제공하지 않으므로, username 기반으로 생성
                    const email = profile.email || `${profile.username || profile.id}@twitter.local`;

                    // 프로필 이미지를 더 큰 해상도로 변환
                    const highResImageUrl = profile.profile_image_url
                        ? profile.profile_image_url.replace(/_normal|_bigger|_mini|_400x400/g, "_400x400")
                        : null;

                    return {
                        user: {
                            id: profile.id,
                            name: profile.name || profile.username || "Twitter User",
                            email: email,
                            image: highResImageUrl,
                            emailVerified: false,
                        },
                        data: profile,
                    };
                } catch (error) {
                    logger.error({ category: "AUTH", message: "Error fetching Twitter user info", stackTrace: (error as Error).stack });
                    // Fallback: 기본값 반환
                    return {
                        user: {
                            id: "unknown",
                            name: "Twitter User",
                            email: "unknown@twitter.local",
                            image: null,
                            emailVerified: false,
                        },
                        data: {},
                    };
                }
            },
            mapProfileToUser: (profile) => {
                // 프로필 이미지를 더 큰 해상도로 변환
                const profileImageUrl = (profile.profile_image_url as string | undefined);
                const highResImageUrl = profileImageUrl
                    ? profileImageUrl.replace(/_normal|_bigger|_mini|_400x400/g, "_400x400")
                    : undefined;

                // getUserInfo에서 이미 변환된 user 객체를 받지만,
                // 추가 필드(provider, avatarUrl, snsId)를 매핑
                const name = String(profile.name || profile.username || "Twitter User");
                const email = String(profile.email || `${profile.username || profile.id}@twitter.local`);

                return {
                    name,
                    email,
                    image: highResImageUrl,
                    emailVerified: false,
                };
            },
        },
        kakao: {
            clientId: process.env.KAKAO_CLIENT_ID || "",
            clientSecret: process.env.KAKAO_CLIENT_SECRET || "",
            overrideUserInfoOnSignIn: true, // 로그인할 때마다 사용자 정보 업데이트
            mapProfileToUser: (profile) => {
                return {
                    name: profile.kakao_account?.profile?.nickname || profile.kakao_account?.email || "Kakao User",
                    email: profile.kakao_account?.email || `${profile.id}@kakao.local`,
                    image: profile.kakao_account?.profile?.profile_image_url,
                    emailVerified: profile.kakao_account?.is_email_verified || false,
                    provider: "kakao",
                    avatarUrl: profile.kakao_account?.profile?.profile_image_url,
                    snsId: profile.id?.toString(),
                };
            },
        },
    },
    modelNames: {
        user: "User",
        account: "account",
        session: "session",
        verification: "verification",
    },
    // 테이블 매핑 (기존 스키마 기반)
    user: {
        additionalFields: {
            avatarUrl: { type: "string" },
            status: { type: "string" },
            bio: { type: "string" },
            snsId: { type: "string" },
            provider: { type: "string" },
            role: { type: "string" }, // "USER", "ADMIN"
        },
    },
    // Database hooks: account가 업데이트될 때 User 테이블도 업데이트
    databaseHooks: {
        user: {
            create: {
                after: async (user) => {
                    logger.info({ category: "AUTH", message: `New user created: ${user.id} (${user.email})` });
                    // 가입 보너스: 100 CHOCO 즉시 지급
                    try {
                        await db
                            .update(schema.user)
                            .set({ chocoBalance: "100", updatedAt: new Date() })
                            .where(eq(schema.user.id, user.id));
                        logger.info({ category: "AUTH", message: `Welcome bonus granted: 100 CHOCO → ${user.id}` });
                    } catch (e) {
                        logger.error({ category: "AUTH", message: `Failed to grant welcome bonus for ${user.id}:`, stackTrace: (e as Error).stack });
                    }
                }
            }
        },
        session: {
            create: {
                after: async (session) => {
                    logger.info({ category: "AUTH", message: `New session created for user: ${session.userId}` });
                }
            }
        },

        account: {
            create: {
                after: async (account) => {
                    // 새 account가 생성될 때 (소셜 로그인 시)
                    // 해당 provider의 정보로 User 테이블 업데이트
                    try {
                        const user = await db.query.user.findFirst({
                            where: eq(schema.user.id, account.userId),
                        });

                        if (user && account.providerId) {
                            // provider에 따라 다른 처리
                            const updateData: { provider: string; updatedAt: Date; avatarUrl?: string } = {
                                provider: account.providerId,
                                updatedAt: new Date(),
                            };

                            // image 필드가 있고, provider와 일치하는 경우에만 avatarUrl 업데이트
                            // Twitter인 경우 image가 Twitter 이미지여야 함
                            if (user.image && account.providerId === "twitter") {
                                // image가 Twitter 이미지인지 확인 (Twitter 이미지 URL 패턴)
                                if (user.image.includes("pbs.twimg.com") || user.image.includes("twitter.com")) {
                                    updateData.avatarUrl = user.image;
                                }
                            } else if (user.image && account.providerId === "google") {
                                // Google 이미지인 경우
                                if (user.image.includes("googleusercontent.com") || user.image.includes("google.com")) {
                                    updateData.avatarUrl = user.image;
                                }
                            } else if (user.image) {
                                // 다른 provider인 경우 그대로 사용
                                updateData.avatarUrl = user.image;
                            }

                            await db.update(schema.user)
                                .set(updateData)
                                .where(eq(schema.user.id, account.userId));
                        }
                    } catch (error) {
                        logger.error({ category: "AUTH", message: "Error updating user in account create hook", stackTrace: (error as Error).stack });
                    }
                },
            },
            update: {
                after: async (account) => {
                    // account가 업데이트될 때 (재로그인 시)
                    // 해당 provider의 정보로 User 테이블 업데이트
                    try {
                        const user = await db.query.user.findFirst({
                            where: eq(schema.user.id, account.userId),
                        });

                        if (user && account.providerId) {
                            // provider에 따라 다른 처리
                            const updateData: { provider: string; updatedAt: Date; avatarUrl?: string } = {
                                provider: account.providerId,
                                updatedAt: new Date(),
                            };

                            // image 필드가 있고, provider와 일치하는 경우에만 avatarUrl 업데이트
                            if (user.image && account.providerId === "twitter") {
                                // image가 Twitter 이미지인지 확인
                                if (user.image.includes("pbs.twimg.com") || user.image.includes("twitter.com")) {
                                    updateData.avatarUrl = user.image;
                                }
                            } else if (user.image && account.providerId === "google") {
                                // Google 이미지인 경우
                                if (user.image.includes("googleusercontent.com") || user.image.includes("google.com")) {
                                    updateData.avatarUrl = user.image;
                                }
                            } else if (user.image) {
                                // 다른 provider인 경우 그대로 사용
                                updateData.avatarUrl = user.image;
                            }

                            await db.update(schema.user)
                                .set(updateData)
                                .where(eq(schema.user.id, account.userId));
                        }
                    } catch (error) {
                        logger.error({ category: "AUTH", message: "Error updating user in account update hook", stackTrace: (error as Error).stack });
                    }
                },
            },
        },
    },
});

/**
 * 환경 변수에서 Super Admin 이메일 목록 가져오기
 */
function getAdminEmails(): string[] {
    const emails = process.env.ADMIN_EMAILS || "";
    return emails.split(",").map(e => e.trim()).filter(Boolean);
}

/**
 * 이메일이 Super Admin인지 확인
 */
export function isAdminEmail(email: string | undefined): boolean {
    if (!email) return false;
    return getAdminEmails().includes(email);
}

/**
 * 사용자가 Admin 권한을 가지고 있는지 확인
 */
export async function isAdmin(userId: string): Promise<boolean> {
    const userResult = await db.query.user.findFirst({
        where: eq(schema.user.id, userId),
        columns: { email: true, role: true },
    });

    if (!userResult) return false;

    // Super Admin (환경 변수) 또는 DB Role Admin (대소문자 무시)
    const isAdminRole = userResult.role?.toUpperCase() === "ADMIN";
    return isAdminEmail(userResult.email) || isAdminRole;
}

/**
 * 인증된 사용자의 ID를 가져옴 (권한 없으면 null)
 */
export async function requireUserId(request: Request): Promise<string | null> {
    const session = await auth.api.getSession({
        headers: request.headers,
    });

    if (!session || !session.user) {
        return null;
    }

    return session.user.id;
}

/**
 * Admin 권한이 없으면 에러 반환 (Loader/Action에서 사용)
 * 접근 성공/실패 모두 구조화된 감사 로그를 남긴다.
 */
export async function requireAdmin(request: Request): Promise<string> {
    const session = await auth.api.getSession({
        headers: request.headers,
    });

    const url = new URL(request.url);
    const logBase = {
        url: url.pathname,
        method: request.method,
        ts: new Date().toISOString(),
    };

    if (!session || !session.user) {
        console.warn(JSON.stringify({
            event: "admin_access_denied",
            reason: "unauthenticated",
            ...logBase,
        }));
        throw new Response("Unauthorized", { status: 401 });
    }

    const hasAdminAccess = await isAdmin(session.user.id);

    if (!hasAdminAccess) {
        console.warn(JSON.stringify({
            event: "admin_access_denied",
            reason: "forbidden",
            userId: session.user.id,
            email: session.user.email,
            ...logBase,
        }));
        throw new Response("Forbidden", { status: 403 });
    }

    console.info(JSON.stringify({
        event: "admin_access_granted",
        userId: session.user.id,
        email: session.user.email,
        ...logBase,
    }));

    return session.user.id;
}


