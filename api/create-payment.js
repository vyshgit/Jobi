// /api/create-payment.js
import https from "https";
import PaytmChecksum from "paytmchecksum";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { amount, orderId, customer } = req.body;

    const paytmParams = {};
    paytmParams.body = {
      requestType: "Payment",
      mid: process.env.PAYTM_MID,
      websiteName: process.env.PAYTM_WEBSITE,
      orderId: orderId,
      callbackUrl: "https://your-vercel-project.vercel.app/api/verify-payment",
      txnAmount: {
        value: amount.toString(),
        currency: "INR",
      },
      userInfo: {
        custId: customer.email,
      },
    };

    const checksum = await PaytmChecksum.generateSignature(
      JSON.stringify(paytmParams.body),
      process.env.PAYTM_MERCHANT_KEY
    );

    paytmParams.head = {
      signature: checksum,
    };

    const post_data = JSON.stringify(paytmParams);

    const options = {
      hostname: process.env.PAYTM_ENVIRONMENT === "staging" ? "securegw-stage.paytm.in" : "securegw.paytm.in",
      port: 443,
      path: `/theia/api/v1/initiateTransaction?mid=${process.env.PAYTM_MID}&orderId=${orderId}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": post_data.length,
      },
    };

    const request = https.request(options, (response) => {
      let data = "";
      response.on("data", (chunk) => (data += chunk));
      response.on("end", () => {
        const result = JSON.parse(data);
        res.json(result);
      });
    });

    request.write(post_data);
    request.end();
  } catch (error) {
    console.error("Paytm init error:", error);
    res.status(500).json({ error: "Failed to create transaction" });
  }
}

