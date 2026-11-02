// Client-side mirror of the service photo rules in
// server/src/routes/services.ts, so a bad file is caught when it's picked
// rather than after the upload. The server still enforces them.

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const MAX_PHOTOS_PER_UPLOAD = 20;
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/** Shown under the photo pickers. */
export const PHOTO_LIMITS_HINT = "JPG, PNG, WebP or HEIC · up to 10 MB each, 50 MB per upload";

const PHOTO_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "heic", "heif"];
const PHOTO_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

/** `accept` for photo inputs: the file picker only offers allowed types. */
export const PHOTO_ACCEPT = [...PHOTO_MIME_TYPES, ...PHOTO_EXTENSIONS.map((e) => `.${e}`)].join(",");

// Some browsers report no type for HEIC (iPhone) photos, so the extension
// counts too.
export function photoFileError(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!PHOTO_MIME_TYPES.includes(file.type) && !PHOTO_EXTENSIONS.includes(ext)) {
    return "Unsupported type. Use JPG, PNG, WebP or HEIC.";
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return "Larger than 10 MB.";
  }
  return null;
}

// One message for the whole set, or null if it can be uploaded.
export function photoSetError(files: { file: File }[]): string | null {
  if (files.length > MAX_PHOTOS_PER_UPLOAD) {
    return `You can upload up to ${MAX_PHOTOS_PER_UPLOAD} photos at a time. Remove ${
      files.length - MAX_PHOTOS_PER_UPLOAD
    } to continue.`;
  }
  const invalid = files.filter((f) => photoFileError(f.file));
  if (invalid.length > 0) {
    return invalid.length === 1
      ? `"${invalid[0].file.name}" can't be uploaded: ${photoFileError(invalid[0].file)} Remove it to continue.`
      : `${invalid.length} photos can't be uploaded (marked in red). Remove them to continue.`;
  }
  const total = files.reduce((sum, f) => sum + f.file.size, 0);
  if (total > MAX_UPLOAD_BYTES) {
    return `These photos add up to ${(total / 1024 / 1024).toFixed(1)} MB, over the 50 MB limit per upload. Remove some and upload them separately.`;
  }
  return null;
}
