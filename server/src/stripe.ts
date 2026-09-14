import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import logger from './logger';
import { env } from './env';

const prisma = new PrismaClient();

// Initialize Stripe
let stripe: Stripe;
try {
  stripe = new Stripe(env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2024-06-20' as any,
  });
} catch (error) {
  logger.warn('Stripe not initialized (missing STRIPE_SECRET_KEY), payment features will be disabled');
  stripe = null as any;
}

// Subscription plans configuration
const SUBSCRIPTION_PLANS = {
  hunter_pass: {
    name: 'Hunter Pass',
    description: 'Exclusive cosmetics, extra raid slots, streak freeze tokens',
    priceMonthly: 499, // $4.99 in cents
    priceYearly: 3999, // $39.99 in cents
    features: [
      'Exclusive avatar and gear cosmetics',
      'Seasonal Rank battle-pass track',
      'Extra Gate/Raid slots',
      'Streak freeze tokens',
      'Advanced stats and skill radar chart',
      'Priority AI quest generation',
    ],
  },
  guild: {
    name: 'Guild Plan',
    description: 'Team features for groups, gyms, and study circles',
    priceMonthly: 999, // $9.99 per seat/month
    priceYearly: 9999, // $99.99 per seat/year
    features: [
      'Shared leaderboards',
      'Cross-user gate raids',
      'Guild quest boards',
      'Team progress tracking',
      'Admin dashboard',
      'Priority support',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    description: 'Custom integrations and white-label solutions',
    priceMonthly: 0, // Custom pricing
    features: [
      'White-label customization',
      'API access',
      'Custom integrations',
      'Dedicated support',
      'SLA guarantees',
      'Advanced analytics',
    ],
  },
};

/**
 * Create a Stripe customer for a user
 */
export async function createStripeCustomer(userId: string, email: string, displayName: string) {
  if (!stripe) {
    throw new Error('Stripe not initialized');
  }

  try {
    const customer = await stripe.customers.create({
      email,
      name: displayName,
      metadata: {
        userId,
      },
    });

    // Update user with Stripe customer ID
    await prisma.subscription.update({
      where: { userId },
      data: { stripeCustomerId: customer.id },
    });

    logger.info(`Created Stripe customer for user ${userId}`);
    return customer;
  } catch (error) {
    logger.error('Error creating Stripe customer:', error);
    throw error;
  }
}

/**
 * Create a checkout session for subscription
 */
export async function createCheckoutSession(
  userId: string,
  plan: 'hunter_pass' | 'guild',
  billingCycle: 'monthly' | 'yearly'
) {
  if (!stripe) {
    throw new Error('Stripe not initialized');
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Create Stripe customer if doesn't exist
    let customerId = user.subscription?.stripeCustomerId;
    if (!customerId) {
      const customer = await createStripeCustomer(userId, user.email, user.displayName);
      customerId = customer.id;
    }

    const planConfig = SUBSCRIPTION_PLANS[plan];
    const price = billingCycle === 'monthly' ? planConfig.priceMonthly : planConfig.priceYearly;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: planConfig.name,
              description: planConfig.description,
              metadata: {
                plan,
                billingCycle,
              },
            },
            unit_amount: price,
            recurring: {
              interval: billingCycle,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.FRONTEND_URL}/subscription/canceled`,
      metadata: {
        userId,
        plan,
        billingCycle,
      },
    });

    logger.info(`Created checkout session for user ${userId}, plan ${plan}`);
    return session;
  } catch (error) {
    logger.error('Error creating checkout session:', error);
    throw error;
  }
}

/**
 * Handle Stripe webhook events
 */
export async function handleWebhook(event: Stripe.Event) {
  if (!stripe) {
    throw new Error('Stripe not initialized');
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }
      default:
        logger.warn(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    logger.error('Error handling webhook:', error);
    throw error;
  }
}

/**
 * Handle successful checkout
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const plan = session.metadata?.plan as 'hunter_pass' | 'guild';
  const billingCycle = session.metadata?.billingCycle;

  if (!userId || !plan) {
    throw new Error('Missing required metadata');
  }

  // Create payment record
  await prisma.payment.create({
    data: {
      userId,
      amount: session.amount_total || 0,
      currency: session.currency || 'usd',
      status: 'completed',
      paymentMethod: 'stripe',
      paymentIntentId: session.payment_intent as string,
      metadata: JSON.stringify({
        plan,
        billingCycle,
        sessionId: session.id,
      }),
    },
  });

  logger.info(`Checkout completed for user ${userId}, plan ${plan}`);
}

/**
 * Handle subscription updates
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  
  // Find user by Stripe customer ID
  const userSubscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
    include: { user: true },
  });

  if (!userSubscription) {
    logger.warn(`No user found for Stripe customer ${customerId}`);
    return;
  }

  const status = subscription.status;
  const plan = subscription.metadata?.plan || 'free';

  await prisma.subscription.update({
    where: { id: userSubscription.id },
    data: {
      status,
      plan,
      stripeSubscriptionId: subscription.id,
      endDate: subscription.cancel_at_period_end ? new Date((subscription as any).current_period_end * 1000) : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });

  logger.info(`Subscription updated for user ${userSubscription.userId}, status ${status}`);
}

/**
 * Handle subscription deletion
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  
  const userSubscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!userSubscription) {
    logger.warn(`No user found for Stripe customer ${customerId}`);
    return;
  }

  await prisma.subscription.update({
    where: { id: userSubscription.id },
    data: {
      status: 'canceled',
      plan: 'free',
      endDate: new Date(),
    },
  });

  logger.info(`Subscription canceled for user ${userSubscription.userId}`);
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  
  const userSubscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!userSubscription) {
    logger.warn(`No user found for Stripe customer ${customerId}`);
    return;
  }

  // Create payment record
  await prisma.payment.create({
    data: {
      userId: userSubscription.userId,
      amount: invoice.amount_paid,
      currency: invoice.currency || 'usd',
      status: 'completed',
      paymentMethod: 'stripe',
      paymentIntentId: (invoice as any).payment_intent as string,
      metadata: JSON.stringify({
        invoiceId: invoice.id,
        subscriptionId: (invoice as any).subscription,
      }),
    },
  });

  logger.info(`Payment succeeded for user ${userSubscription.userId}, amount ${invoice.amount_paid}`);
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  
  const userSubscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!userSubscription) {
    logger.warn(`No user found for Stripe customer ${customerId}`);
    return;
  }

  // Update subscription status
  await prisma.subscription.update({
    where: { id: userSubscription.id },
    data: {
      status: 'past_due',
    },
  });

  logger.warn(`Payment failed for user ${userSubscription.userId}`);
}

/**
 * Check user's subscription status
 */
export async function getUserSubscription(userId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) {
    return { plan: 'free', status: 'active' };
  }

  // Check if subscription is expired
  if (subscription.endDate && new Date() > subscription.endDate) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { plan: 'free', status: 'canceled' },
    });
    return { plan: 'free', status: 'canceled' };
  }

  return {
    plan: subscription.plan,
    status: subscription.status,
    endDate: subscription.endDate,
  };
}

/**
 * Cancel user's subscription
 */
export async function cancelSubscription(userId: string) {
  if (!stripe) {
    throw new Error('Stripe not initialized');
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription || !subscription.stripeSubscriptionId) {
    throw new Error('No active subscription found');
  }

  await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { cancelAtPeriodEnd: true },
  });

  logger.info(`Subscription cancellation scheduled for user ${userId}`);
}

export { SUBSCRIPTION_PLANS };