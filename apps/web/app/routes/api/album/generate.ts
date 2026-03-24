/**
 * Phase 4-1: 대화 앨범 PDF 생성 API
 * memory_album 티켓 차감 후 최근 30일 대화 PDF 반환
 */
import type { ActionFunctionArgs } from "react-router";
import React, { createElement } from "react";
import { auth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { renderToBuffer } from "@react-pdf/renderer";
import { selectAlbumMessages } from "~/lib/album-generator.server";
import { AlbumPdfDocument } from "~/lib/album-pdf-document";

const MEMORY_ALBUM_ITEM_ID = "memory_album";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const inventory = await db.query.userInventory.findFirst({
    where: and(
      eq(schema.userInventory.userId, session.user.id),
      eq(schema.userInventory.itemId, MEMORY_ALBUM_ITEM_ID),
      gt(schema.userInventory.quantity, 0)
    ),
    columns: { id: true, quantity: true },
  });

  if (!inventory) {
    return Response.json(
      { error: "대화 앨범 티켓이 없습니다. 상점에서 구매해 주세요." },
      { status: 400 }
    );
  }

  const messages = await selectAlbumMessages(session.user.id);
  if (messages.length === 0) {
    return Response.json(
      { error: "앨범에 담을 대화가 없습니다." },
      { status: 400 }
    );
  }

  const characterName = messages[0]?.characterName ?? "춘심";

  const doc = createElement(AlbumPdfDocument, { messages, characterName });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfBuffer = await renderToBuffer(doc as any);

  await db
    .update(schema.userInventory)
    .set({
      quantity: inventory.quantity - 1,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.userInventory.id, inventory.id),
        gt(schema.userInventory.quantity, 0)
      )
    );

  const filename = `album-${new Date().toISOString().slice(0, 10)}.pdf`;
  const buffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
