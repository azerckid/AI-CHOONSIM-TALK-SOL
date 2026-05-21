import { describe, expect, it } from "vitest";
import { hasAllowedImageSignature, validateImageUploadFile } from "../upload-policy";

describe("upload-policy", () => {
    it("accepts supported image metadata within size limit", () => {
        const result = validateImageUploadFile({
            name: "avatar.webp",
            size: 1024,
            type: "image/webp",
        });

        expect(result.ok).toBe(true);
    });

    it("rejects unsupported MIME types and extensions", () => {
        expect(validateImageUploadFile({ name: "avatar.svg", size: 1024, type: "image/svg+xml" })).toEqual({
            ok: false,
            message: "Only JPEG, PNG, WebP, and GIF images are supported.",
            status: 415,
        });

        expect(validateImageUploadFile({ name: "avatar.txt", size: 1024, type: "image/png" })).toEqual({
            ok: false,
            message: "Image file extension is not supported.",
            status: 415,
        });
    });

    it("rejects oversized files", () => {
        const result = validateImageUploadFile({
            name: "huge.png",
            size: 6 * 1024 * 1024,
            type: "image/png",
        });

        expect(result).toMatchObject({ ok: false, status: 413 });
    });

    it("checks image signatures", () => {
        expect(hasAllowedImageSignature("image/jpeg", new Uint8Array([0xff, 0xd8, 0xff, 0x00]))).toBe(true);
        expect(
            hasAllowedImageSignature(
                "image/png",
                new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
            )
        ).toBe(true);
        expect(hasAllowedImageSignature("image/gif", new TextEncoder().encode("GIF89a"))).toBe(true);
        expect(hasAllowedImageSignature("image/webp", new TextEncoder().encode("RIFFxxxxWEBP"))).toBe(true);
        expect(hasAllowedImageSignature("image/png", new TextEncoder().encode("not-png"))).toBe(false);
    });
});
