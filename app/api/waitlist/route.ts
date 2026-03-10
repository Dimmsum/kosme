import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const WAITLIST_FILE = path.join(process.cwd(), "waitlist.json");

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    // Read existing emails
    let emails: string[] = [];
    try {
      const data = await fs.readFile(WAITLIST_FILE, "utf-8");
      emails = JSON.parse(data);
    } catch {
      // File doesn't exist yet — that's fine
    }

    // Avoid duplicates
    if (!emails.includes(email.toLowerCase().trim())) {
      emails.push(email.toLowerCase().trim());
      await fs.writeFile(WAITLIST_FILE, JSON.stringify(emails, null, 2));
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
