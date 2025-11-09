import https from "https";
import PaytmChecksum from "paytmchecksum";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MID = process.env.PAYTM_MID;
const MKEY = process.env.PAYTM_MKEY;
const WEBSITE = process.env.PAYTM_WEBSITE || "WEBSTAGING";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { amount, customer, orderId } = req.body;

    const paytmParams = {
      body: {
        requestType: "Payment",
        mid: MID,
        websiteName: WEBSITE,
        orderId: orderId,
        callbackUrl: `${process.env.BASE_URL}/api/verify-payment`,
        txnAmount: { value: amount, currency: "INR" },
        userInfo: { custId: customer.email },
      },
    };

    const checksum = await PaytmChecksum.generateSignature(
      JSON.stringify(paytmParams.body),
      MKEY
    );

    const post_data = JSON.stringify({ ...paytmParams, head: { signature: checksum } });

    const options = {
      hostname: "securegw-stage.paytm.in",
      port: 443,
      path: `/theia/api/v1/initiateTransaction?mid=${MID}&orderId=${orderId}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": post_data.length,
      },
    };

    const post_req = https.request(options, (post_res) => {
      let response = "";
      post_res.on("data", (chunk) => (response += chunk));
      post_res.on("end", () => res.status(200).json(JSON.parse(response)));
    });

    post_req.write(post_data);
    post_req.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
}
