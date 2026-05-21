import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    conversationFindFirst: vi.fn(),
    messageFindFirst: vi.fn(),
}));

vi.mock("~/lib/db.server", () => ({
    db: {
        query: {
            conversation: {
                findFirst: mocks.conversationFindFirst,
            },
            message: {
                findFirst: mocks.messageFindFirst,
            },
        },
    },
}));

import { findOwnedMessage, isOwnedConversation } from "../ownership.server";

describe("chat ownership helpers", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("allows an owned conversation", async () => {
        mocks.conversationFindFirst.mockResolvedValueOnce({ id: "conversation-1" });

        await expect(isOwnedConversation("conversation-1", "user-1")).resolves.toBe(true);
        expect(mocks.conversationFindFirst).toHaveBeenCalledTimes(1);
    });

    it("rejects a conversation that is not owned by the user", async () => {
        mocks.conversationFindFirst.mockResolvedValueOnce(null);

        await expect(isOwnedConversation("conversation-2", "user-1")).resolves.toBe(false);
    });

    it("returns null when the message does not exist", async () => {
        mocks.messageFindFirst.mockResolvedValueOnce(null);

        await expect(findOwnedMessage("message-1", "user-1")).resolves.toBeNull();
        expect(mocks.conversationFindFirst).not.toHaveBeenCalled();
    });

    it("returns null when the message belongs to another user's conversation", async () => {
        mocks.messageFindFirst.mockResolvedValueOnce({
            id: "message-1",
            conversationId: "conversation-2",
        });
        mocks.conversationFindFirst.mockResolvedValueOnce(null);

        await expect(findOwnedMessage("message-1", "user-1")).resolves.toBeNull();
    });

    it("returns the message and conversation when both are owned", async () => {
        const message = { id: "message-1", conversationId: "conversation-1" };
        const conversation = { id: "conversation-1", userId: "user-1", characterId: "choonsim" };
        mocks.messageFindFirst.mockResolvedValueOnce(message);
        mocks.conversationFindFirst.mockResolvedValueOnce(conversation);

        await expect(findOwnedMessage("message-1", "user-1")).resolves.toEqual({
            message,
            conversation,
        });
    });
});
