import Razorpay from "razorpay";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { amount, orderId } = req.body;

  if (!amount || !orderId) {
    return res.status(400).json({ error: "Missing amount or orderId" });
  }

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  // ✅ SHORT receipt (<= 40 chars)
  const receipt = `reg_${Date.now()}`;

  try {
    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: receipt,
      notes: {
        registration_order_id: orderId // ✅ store full ID here
      }
    });

    return res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      key: process.env.RAZORPAY_KEY_ID
    });

  } catch (err) {
    console.error("❌ Razorpay Order Error");
    console.error("Status:", err.statusCode);
    console.error("Error:", err.error);

    return res.status(500).json({
      error: true,
      message: "Failed to create payment order",
      razorpay_error: err.error
    });
  }
}
