import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";

export const Route = createFileRoute("/api/product-image/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = params.id?.trim();
        if (!id) return new Response("Not found", { status: 404 });
        const sql = await getSql();
        const rows = await sql<{ mime: string; data_base64: string }>`
          select mime, data_base64 from product_photos where id = ${id}`;
        const row = rows[0];
        if (!row?.data_base64) return new Response("Not found", { status: 404 });
        const bytes = Buffer.from(row.data_base64, "base64");
        return new Response(bytes, {
          headers: {
            "Content-Type": row.mime || "image/jpeg",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
