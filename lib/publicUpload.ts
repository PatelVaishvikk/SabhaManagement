import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

const PUBLIC_DIR = path.join(process.cwd(), "public");
const UPLOAD_ROOT = path.join(PUBLIC_DIR, "uploads");
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const imageExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

export type PublicImageFolder = "idle" | "bhajans";

function slugify(value: string) {
  return value
    .replace(/\.[^.]+$/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function savePublicImage(file: File, folder: PublicImageFolder) {
  if (!file || file.size === 0) {
    throw new Error("Choose an image file first.");
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image must be 10MB or smaller.");
  }

  const extension = imageExtensions[file.type];
  if (!extension) {
    throw new Error("Only JPG, PNG, and WebP images are supported.");
  }

  const baseName = slugify(file.name) || folder;
  const filename = `${Date.now()}-${randomUUID()}-${baseName}.${extension}`;
  const relativePath = path.posix.join("uploads", folder, filename);
  const absolutePath = path.join(PUBLIC_DIR, relativePath);
  const bytes = Buffer.from(await file.arrayBuffer());

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, bytes);

  return {
    url: `/${relativePath}`,
    filePath: relativePath
  };
}

export async function deletePublicUpload(filePath?: string | null) {
  if (!filePath) return;

  const normalized = filePath.replace(/^\/+/, "");
  if (!normalized.startsWith("uploads/")) return;

  const target = path.resolve(PUBLIC_DIR, normalized);
  const root = path.resolve(UPLOAD_ROOT);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) return;

  try {
    await fs.unlink(target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}
