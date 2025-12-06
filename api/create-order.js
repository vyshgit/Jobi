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
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });

  try {
    const order = await razorpay.orders.create({
      amount: amount * 100, // paisa
      currency: "INR",
      receipt: orderId,
    });

    return res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      key: process.env.RAZORPAY_KEY_ID
    });

  } catch (err) {
    console.error("Razorpay order creation failed:", err);
    return res.status(500).json({ error: true, message: "Failed to create order" });
  }
}
