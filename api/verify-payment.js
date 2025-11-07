// /api/verify-payment.js
import PaytmChecksum from "paytmchecksum";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const received_data = req.body;
    const paytmChecksum = received_data.CHECKSUMHASH;
    delete received_data.CHECKSUMHASH;

    const isValidChecksum = PaytmChecksum.verifySignature(
      received_data,
      process.env.PAYTM_MERCHANT_KEY,
      paytmChecksum
    );

    if (!isValidChecksum) {
      return res.status(400).json({ error: "Checksum mismatch" });
    }

    const { ORDERID, TXNAMOUNT, STATUS, TXNID } = received_data;

    if (STATUS !== "TXN_SUCCESS") {
      return res.status(400).json({ error: "Transaction not successful" });
    }

    // Save registration to Supabase
    await supabase.from("registrations").insert([
      {
        full_name: received_data.CUSTID,
        email: received_data.CUSTID,
        competitions: [],
        total_amount: TXNAMOUNT * 100,
        currency: "INR",
        razorpay_order_id: ORDERID,
        razorpay_payment_id: TXNID,
        status: "paid",
      },
    ]);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Paytm verify error:", error);
    res.status(500).json({ error: "Verification failed" });
  }
}
