import Razorpay from "razorpay";

const razor = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { amount, orderId } = req.body;

  try {
    const order = await razor.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: orderId,
    });

    return res.json({
      id: order.id,
      amount: order.amount,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("Razorpay error:", err);
    return res.status(500).json({ error: true });
  }
}
