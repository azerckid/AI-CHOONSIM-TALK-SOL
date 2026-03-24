/**
 * User Context Tier Utilities
 *
 * 구독 등급 조회 및 5계층 관련 제한 정책
 * 명세서: docs/features/chat/user-context-layers-spec.md (Section 4.3)
 */

import { eq } from "drizzle-orm";
import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { SUBSCRIPTION_PLANS } from "~/lib/subscription-plans";

// =============================================================================
// Types
// =============================================================================

export type SubscriptionTier = "FREE" | "BASIC" | "PREMIUM" | "ULTIMATE";

export interface TierLimits {
    /** Memory 항목 최대 개수 (null = 무제한) */
    maxMemoryItems: number | null;
    /** Heartbeat 상세 정보 사용 가능 여부 */
    detailedHeartbeat: boolean;
    /** Soul 계층 저장 가능 여부 */
    soulEnabled: boolean;
    /** 고급 Tools 기능 사용 가능 여부 */
    advancedTools: boolean;
}

// =============================================================================
// Tier Limits Configuration
// =============================================================================

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
    FREE: {
        maxMemoryItems: 20,
        detailedHeartbeat: false,
        soulEnabled: false,
        advancedTools: false,
    },
    BASIC: {
        maxMemoryItems: 50,
        detailedHeartbeat: false,
        soulEnabled: false,
        advancedTools: false,
    },
    PREMIUM: {
        maxMemoryItems: 200,
        detailedHeartbeat: true,
        soulEnabled: true,
        advancedTools: true,
    },
    ULTIMATE: {
        maxMemoryItems: null, // Unlimited
        detailedHeartbeat: true,
        soulEnabled: true,
        advancedTools: true,
    },
};

// =============================================================================
// Tier Lookup Functions
// =============================================================================

/**
 * Get user's subscription tier from database
 */
export async function getUserTier(userId: string): Promise<SubscriptionTier> {
    const user = await db
        .select({ subscriptionTier: schema.user.subscriptionTier })
        .from(schema.user)
        .where(eq(schema.user.id, userId))
        .get();

    if (!user || !user.subscriptionTier) {
        return "FREE";
    }

    // Validate tier value
    if (isValidTier(user.subscriptionTier)) {
        return user.subscriptionTier;
    }

    return "FREE";
}

/**
 * Get tier limits for a user
 */
export async function getUserTierLimits(userId: string): Promise<TierLimits> {
    const tier = await getUserTier(userId);
    return TIER_LIMITS[tier];
}

/**
 * Get tier limits directly from tier value
 */
export function getTierLimits(tier: SubscriptionTier): TierLimits {
    return TIER_LIMITS[tier];
}

/**
 * Check if user can use Soul layer
 */
export async function canUseSoul(userId: string): Promise<boolean> {
    const tier = await getUserTier(userId);
    return TIER_LIMITS[tier].soulEnabled;
}

/**
 * Check if user has reached memory limit
 */
export async function hasReachedMemoryLimit(
    userId: string,
    currentCount: number
): Promise<boolean> {
    const tier = await getUserTier(userId);
    const limit = TIER_LIMITS[tier].maxMemoryItems;

    if (limit === null) {
        return false; // Unlimited
    }

    return currentCount >= limit;
}

/**
 * Get maximum memory items allowed for a tier
 */
export function getMaxMemoryItems(tier: SubscriptionTier): number | null {
    return TIER_LIMITS[tier].maxMemoryItems;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Validate if a string is a valid tier
 */
export function isValidTier(tier: string): tier is SubscriptionTier {
    return ["FREE", "BASIC", "PREMIUM", "ULTIMATE"].includes(tier);
}

/**
 * Get subscription plan details by tier
 */
export function getPlanByTier(tier: SubscriptionTier) {
    return SUBSCRIPTION_PLANS[tier];
}

/**
 * Check if tier A is higher or equal to tier B
 */
export function isTierAtLeast(
    userTier: SubscriptionTier,
    requiredTier: SubscriptionTier
): boolean {
    const tierOrder: SubscriptionTier[] = ["FREE", "BASIC", "PREMIUM", "ULTIMATE"];
    return tierOrder.indexOf(userTier) >= tierOrder.indexOf(requiredTier);
}
