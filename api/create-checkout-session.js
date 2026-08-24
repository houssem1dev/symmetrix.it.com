/**
 * Vercel Serverless Function: Create Stripe Checkout Session
 * POST /api/create-checkout-session
 * Body: { courseId: string }
 * Returns: { url: string } ??? redirect user to this URL
 */
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

const COURSES = {
  'course1': { priceId: process.env.STRIPE_PRICE_COURSE1, amount: 4999 },
  'course2': { priceId: process.env.STRIPE_PRICE_COURSE2, amount: 7999 },
  'course3': { priceId: process.env.STRIPE_PRICE_COURSE3, amount: 8999 },
  'course4': { priceId: process.env.STRIPE_PRICE_COURSE4, amount: 12999 },
  'course5': { priceId: process.env.STRIPE_PRICE_COURSE5, amount: 5999 }
};

const ALLOWED_ORIGINS = new Set([
  'https://symmetrix.dev',
  'https://www.symmetrix.dev',
  'http://localhost:3000',
  'http://localhost:5173'
]);

module.exports = async (req, res) => {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY not configured');
    return res.status(500).json({ error: 'Payment system not configured' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const { courseId, email } = body;
  const course = COURSES[courseId];

  if (!course) {
    return res.status(400).json({ error: 'Invalid course ID' });
  }

  if (email !== undefined && (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email))) {
    return res.status(400).json({ error: 'Invalid customer email' });
  }

  try {
    const Stripe = require('stripe');
    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

    // Option A: Use pre-created Price IDs (recommended for production)
    // Option B: Create ad-hoc line items with amount
    const lineItems = course.priceId
      ? [{ price: course.priceId, quantity: 1 }]
      : [{
          price_data: {
            currency: 'usd',
            product_data: { name: courseId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) },
            unit_amount: course.amount
          },
          quantity: 1
        }];

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://symmetrix.dev'}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://symmetrix.dev'}/payment/cancel`,
      metadata: { courseId },
      billing_address_collection: 'required',
      customer_email: email || undefined,
      allow_promotion_codes: true,
      phone_number_collection: { enabled: false }
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err.message);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
};