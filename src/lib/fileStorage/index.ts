/**
 * MuggedMoments — File Storage Adapter Boundary
 *
 * Same provider-selection pattern as src/lib/whatsapp/index.ts and
 * src/lib/vendorOtp/index.ts: a module-scope singleton chosen at import time
 * based on which environment variables are actually present, with a clear
 * console warning on fallback — never a silent behavior change.
 *
 * Local disk (the original, still-default behavior — see portfolio/document
 * upload routes' own header comments): writes under public/uploads/..., which
 * IS servable directly by Next's static file handling, but does NOT survive
 * a Vercel deploy or even a cold serverless start — Vercel's filesystem is
 * read-only outside /tmp at runtime. Confirmed live in production: a real
 * vendor's portfolio/document upload failed with a generic 500 the moment
 * this app actually ran on Vercel instead of a local dev server.
 *
 * Vercel Blob: the production fix. Used automatically once BLOB_READ_WRITE_TOKEN
 * is set (Vercel injects this itself when you connect a Blob store to the
 * project — same zero-config pattern as DATABASE_URL from connecting Postgres).
 * Returns a real https://*.public.blob.vercel-storage.com/... URL, which every
 * existing <img src={imagePath}> / <a href={filePath}> in this codebase already
 * renders correctly without any change — browsers handle an absolute URL in
 * those attributes exactly like a relative one.
 */

import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { put, del } from "@vercel/blob";
import { logger } from "@/lib/logger";

export interface FileStorageProvider {
  /**
   * `relativePath` is the servable path this file should live at, always
   * starting with "/" (e.g. "/uploads/vendor-portfolio/<vendorId>/<uuid>.jpg")
   * — the same shape buildPortfolioImagePath()/buildDocumentPath() already
   * produce. Returns the actual URL to store in the DB and render to users.
   */
  upload(params: { buffer: Buffer; relativePath: string; contentType: string }): Promise<string>;
  /** Takes whatever URL/path was stored in the DB by upload() above. */
  delete(storedPath: string): Promise<void>;
}

class LocalDiskStorageProvider implements FileStorageProvider {
  async upload({
    buffer,
    relativePath,
    contentType: _contentType,
  }: {
    buffer: Buffer;
    relativePath: string;
    contentType: string;
  }): Promise<string> {
    const absolutePath = path.join(process.cwd(), "public", relativePath.replace(/^\//, ""));
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, buffer);
    return relativePath;
  }

  async delete(storedPath: string): Promise<void> {
    const absolutePath = path.join(process.cwd(), "public", storedPath.replace(/^\//, ""));
    await unlink(absolutePath);
  }
}

class VercelBlobStorageProvider implements FileStorageProvider {
  async upload({
    buffer,
    relativePath,
    contentType,
  }: {
    buffer: Buffer;
    relativePath: string;
    contentType: string;
  }): Promise<string> {
    // addRandomSuffix: false — the path already ends in a server-generated
    // UUID filename (see buildPortfolioImagePath()/buildDocumentPath()), so a
    // second random suffix would just make the stored URL diverge from what
    // was actually requested for no benefit.
    const blob = await put(relativePath.replace(/^\//, ""), buffer, {
      access: "public",
      contentType,
      addRandomSuffix: false,
    });
    return blob.url;
  }

  async delete(storedPath: string): Promise<void> {
    await del(storedPath);
  }
}

function createFileStorageProvider(): FileStorageProvider {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return new VercelBlobStorageProvider();
  }

  logger.warn(
    "BLOB_READ_WRITE_TOKEN not set — falling back to local disk storage, which does not " +
      "persist across a Vercel deploy or serverless cold start. Connect a Blob store to " +
      "this Vercel project to fix uploads in production.",
    { operation: "createFileStorageProvider", errorCode: "BLOB_TOKEN_MISSING" }
  );
  return new LocalDiskStorageProvider();
}

export const fileStorage: FileStorageProvider = createFileStorageProvider();
