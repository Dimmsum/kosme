import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";

const router = Router();

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

const VALID_GENDERS = ["male", "female"];
const VALID_PARISHES = [
  "Kingston", "St. Andrew", "St. Thomas", "Portland", "St. Mary",
  "St. Ann", "Trelawny", "St. James", "Hanover", "Westmoreland",
  "St. Elizabeth", "Manchester", "Clarendon", "St. Catherine",
];
const VALID_SERVICES = ["hair", "makeup", "nails", "brows", "barbering", "skincare", "open_to_any"];
const VALID_AVAILABILITY = ["weekday", "saturday", "sunday", "flexible"];
const VALID_TIMES = ["morning", "afternoon", "evening", "flexible"];

router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      full_name,
      gender,
      whatsapp,
      email,
      parish,
      service_preferences,
      availability,
      preferred_time,
      willing_to_travel,
      photo_consent,
      trainee_acknowledgement,
    } = req.body;

    if (!full_name || typeof full_name !== "string" || full_name.trim().length < 2) {
      return res.status(400).json({ error: "Full name is required" });
    }
    if (!VALID_GENDERS.includes(gender)) {
      return res.status(400).json({ error: "Gender must be male or female" });
    }
    if (!whatsapp || typeof whatsapp !== "string" || whatsapp.trim().length < 7) {
      return res.status(400).json({ error: "WhatsApp number is required" });
    }
    if (!email || typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
      return res.status(400).json({ error: "Invalid email address" });
    }
    if (!VALID_PARISHES.includes(parish)) {
      return res.status(400).json({ error: "Invalid parish" });
    }
    if (!Array.isArray(service_preferences) || service_preferences.length === 0 ||
        !service_preferences.every((s: string) => VALID_SERVICES.includes(s))) {
      return res.status(400).json({ error: "Select at least one service preference" });
    }
    if (!Array.isArray(availability) || availability.length === 0 ||
        !availability.every((a: string) => VALID_AVAILABILITY.includes(a))) {
      return res.status(400).json({ error: "Select at least one availability option" });
    }
    if (!Array.isArray(preferred_time) || preferred_time.length === 0 ||
        !preferred_time.every((t: string) => VALID_TIMES.includes(t))) {
      return res.status(400).json({ error: "Select at least one preferred time" });
    }
    if (typeof willing_to_travel !== "boolean") {
      return res.status(400).json({ error: "Willingness to travel is required" });
    }
    if (photo_consent !== true) {
      return res.status(400).json({ error: "Photo/video consent is required" });
    }
    if (trainee_acknowledgement !== true) {
      return res.status(400).json({ error: "Trainee acknowledgement is required" });
    }

    const { error } = await supabaseAdmin.from("client_signups").insert({
      full_name: full_name.trim(),
      gender,
      whatsapp: whatsapp.trim(),
      email: email.toLowerCase().trim(),
      parish,
      service_preferences,
      availability,
      preferred_time,
      willing_to_travel,
      photo_consent,
      trainee_acknowledgement,
    });

    if (error) {
      console.error("client_signups insert error:", error);
      return res.status(500).json({ error: "Failed to save your sign-up. Please try again." });
    }

    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
