// /api/gpay-webhook.js
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GPAY_PUBLIC_KEY = process.env.GPAY_PUBLIC_KEY; // PEM or base64 format
const MERCHANT_ID = process.env.GPAY_MERCHANT_ID;
const MERCHANT_UPI = process.env.GPAY_UPI_ID;

function verifyGPaySignature(body, signature) {
  try {
    const verifier = crypto.createVerify("sha256");
    verifier.update(JSON.stringify(body));
    verifier.end();
    return verifier.verify(GPAY_PUBLIC_KEY, signature, "base64");
  } catch (err) {
    console.error("❌ Signature verification error:", err.message);
    return false;
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST")
    return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    const signature = req.headers["x-gpay-signature"];
    const body = req.body;

    // 1️⃣ Verify webhook authenticity
    const valid = verifyGPaySignature(body, signature);
    if (!valid)
      return res.status(400).json({ ok: false, error: "Invalid signature" });

    // 2️⃣ Validate payment data
    const {
      merchantTransactionId,
      upiTransactionId,
      amount,
      status,
      merchantId,
      payeeVpa,
      payerVpa,
    } = body;

    if (
      status === "SUCCESS" &&
      merchantId === MERCHANT_ID &&
      payeeVpa === MERCHANT_UPI
    ) {
      // 3️⃣ Update Supabase
      const { error } = await supabase
        .from("registrations")
        .update({
          status: "paid",
          txn_id: upiTransactionId,
          payer_vpa: payerVpa,
          verified_by: "gpay_webhook",
          gpay_payload: body,
        })
        .eq("order_id", merchantTransactionId);

      if (error) throw error;
      console.log("✅ Payment verified:", merchantTransactionId);
    } else {
      console.warn("⚠️ Payment data mismatch:", body);
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("❌ gpay-webhook error:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
}
