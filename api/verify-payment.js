import https from "https";
import PaytmChecksum from "paytmchecksum";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MID = process.env.PAYTM_MID;
const MKEY = process.env.PAYTM_MKEY;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { ORDERID, TXNAMOUNT, STATUS } = req.body;

    if (STATUS === "TXN_SUCCESS") {
      // Verify checksum to ensure authenticity
      const paytmChecksum = req.body.CHECKSUMHASH;
      delete req.body.CHECKSUMHASH;

      const isValid = PaytmChecksum.verifySignature(req.body, MKEY, paytmChecksum);
      if (isValid) {
        await supabase
          .from("registrations")
          .update({
            status: "paid",
            txn_id: req.body.TXNID,
            payer_vpa: req.body.BANKNAME || null,
            verified_by: "paytm_webhook",
            gpay_payload: req.body,
          })
          .eq("order_id", ORDERID);

        return res.status(200).send("OK");
      } else {
        console.warn("Invalid checksum for:", ORDERID);
        return res.status(400).send("Invalid checksum");
      }
    } else {
      console.warn("Payment failed:", ORDERID);
      return res.status(200).send("Payment not successful");
    }
  } catch (err) {
    console.error("Paytm verify error:", err);
    res.status(500).send("Server error");
  }
}
