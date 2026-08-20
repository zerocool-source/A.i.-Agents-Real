import { createFileRoute } from "@tanstack/react-router";

import { bindings } from "../lib/bindings.server";

// Serves Leslie's uploaded listing photos straight from the desk's R2
// bucket. Keys are flat ids minted by uploadListingPhoto, so a strict
// pattern check is enough to keep the route from reading anything else.
export const Route = createFileRoute("/photos/$photoId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const photoId = (params as { photoId: string }).photoId;
        if (!/^[A-Za-z0-9.-]+$/.test(photoId)) {
          return new Response("Not found", { status: 404 });
        }
        const { STORAGE } = bindings();
        if (!STORAGE) return new Response("Not found", { status: 404 });
        const obj = await STORAGE.get(`listing-photos/${photoId}`);
        if (!obj) return new Response("Not found", { status: 404 });
        return new Response(obj.body as ReadableStream, {
          headers: {
            "Content-Type":
              obj.httpMetadata?.contentType ?? "image/jpeg",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
