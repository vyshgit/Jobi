
// /api/create-registration.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // --- Basic CORS setup ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  // --- Only accept POST ---
  if (req.method !== "POST")
    return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    const data = req.body;
    const orderId = "ORDER_" + Date.now();

    const { error } = await supabase.from("registrations").insert([
      {
        full_name: data.personal.fullName,
        email: data.personal.email,
        phone: data.personal.phone,
        institution: data.personal.institution,
        competitions: data.competitions,
        total_amount: data.totalPrice,
        currency: "INR",
        order_id: orderId,
        status: "pending",
      },
    ]);

    if (error) throw error;
    res.status(200).json({ ok: true, orderId });
  } catch (err) {
    console.error("❌ create-registration error:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
}
