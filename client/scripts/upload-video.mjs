/**
 * Uploads Kosme.mp4 to Supabase Storage.
 * Run once: node scripts/upload-video.mjs
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 * (the service role key is needed to write to storage — never expose it client-side)
 */

import { createClient } from "@supabase/supabase-js";
import { createReadStream, statSync } from "fs";
import { resolve } from "path";
import { config } from "dotenv";

config({ path: resolve(process.cwd(), ".env") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);
const BUCKET = "videos";
const FILE_PATH = resolve(process.cwd(), "public/Kosme.mp4");

async function main() {
  // Create bucket if it doesn't exist
  const { error: bucketErr } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 200 * 1024 * 1024, // 200 MB
  });
  if (bucketErr && !bucketErr.message.includes("already exists")) {
    throw bucketErr;
  }

  const fileSize = statSync(FILE_PATH).size;
  console.log(`Uploading ${(fileSize / 1024 / 1024).toFixed(1)} MB…`);

  const stream = createReadStream(FILE_PATH);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload("Kosme.mp4", stream, {
      contentType: "video/mp4",
      duplex: "half",
      upsert: true,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl("Kosme.mp4");
  console.log("Done. Public URL:");
  console.log(data.publicUrl);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
