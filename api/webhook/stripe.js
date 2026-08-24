/**
 * Vercel Serverless Function: Stripe Webhook Handler
 * POST /api/webhook/stripe
 * Handles: checkout.session.completed, payment_intent.succeeded, etc.
 *
 * IMPORTANT: Add STRIPE_WEBHOOK_SECRET to Vercel environment variables
 * Get it from: Stripe Dashboard > Developers > Webhooks > Signing secret
 */
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

module.exports.config = {
  api: { bodyParser: false }
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    console.error('Stripe keys not configured');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  const Stripe = require('stripe');
  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

  // Get the signature from headers
  const sig = req.headers['stripe-signature'];
  if (!sig) {
    console.error('Missing stripe-signature header');
    return res.status(400).json({ error: 'Missing signature' });
  }

  let event;
  try {
    // Stripe signs the exact request bytes; parsed JSON cannot be reconstructed safely.
    const rawBody = req.rawBody || req.body;
    if (!rawBody) {
      throw new Error('Raw webhook body is unavailable');
    }
    event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await handleCheckoutCompleted(session);
        break;
      }
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        console.log('Payment succeeded:', paymentIntent.id);
        break;
      }
      case 'checkout.session.expired': {
        const session = event.data.object;
        console.log('Checkout session expired:', session.id);
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err.message);
    return res.status(500).json({ error: 'Webhook handler failed' });
  }
};

async function handleCheckoutCompleted(session) {
  // session.metadata.courseId tells us which course was purchased
  // session.customer_details has email, name, address
  // session.amount_total is the total paid in cents
  // session.payment_intent is the PaymentIntent ID

  const courseId = session.metadata?.courseId;
  const customerEmail = session.customer_details?.email;
  const customerName = session.customer_details?.name;
  const amount = session.amount_total / 100; // convert from cents

  console.log('????????? Course purchase completed:', {
    courseId,
    customerEmail,
    customerName,
    amount,
    sessionId: session.id
  });

  // TODO: Implement your fulfillment logic here:
  // 1. Create user account / link to existing account
  // 2. Grant course access in your database
  // 3. Send welcome/access email
  // 4. Log for analytics

  // Example: Call your backend API to grant access
  /*
  await fetch(`${process.env.BACKEND_API_URL}/grant-course-access`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.BACKEND_API_KEY}`
    },
    body: JSON.stringify({
      email: customerEmail,
      courseId: courseId,
      stripeSessionId: session.id,
      amount: amount
    })
  });
  */
}