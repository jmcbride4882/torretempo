import Stripe from 'stripe';
import { logger } from '../utils/logger';

let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey || apiKey === 'sk_test_your_stripe_secret_key_here') {
      throw new Error('STRIPE_SECRET_KEY not configured. Please configure Stripe API keys in platform settings.');
    }
    stripeInstance = new Stripe(apiKey, {
      apiVersion: '2026-01-28.clover',
      typescript: true,
    });
  }
  return stripeInstance;
}

export interface CreateCustomerInput {
  email: string;
  name: string;
  tenantId: string;
  metadata?: Record<string, string>;
}

export interface CreateSubscriptionInput {
  customerId: string;
  priceId: string;
  tenantId: string;
  metadata?: Record<string, string>;
}

export async function createStripeCustomer(input: CreateCustomerInput): Promise<Stripe.Customer> {
  try {
    const stripe = getStripe();
    const customer = await stripe.customers.create({
      email: input.email,
      name: input.name,
      metadata: { tenantId: input.tenantId, ...input.metadata },
    });
    logger.info({ customerId: customer.id, tenantId: input.tenantId }, 'Stripe customer created');
    return customer;
  } catch (error) {
    logger.error({ error, input }, 'Failed to create Stripe customer');
    throw error;
  }
}

export async function createSubscription(input: CreateSubscriptionInput): Promise<Stripe.Subscription> {
  try {
    const stripe = getStripe();
    const subscription = await stripe.subscriptions.create({
      customer: input.customerId,
      items: [{ price: input.priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: { tenantId: input.tenantId, ...input.metadata },
    });
    logger.info({ subscriptionId: subscription.id, tenantId: input.tenantId }, 'Stripe subscription created');
    return subscription;
  } catch (error) {
    logger.error({ error, input }, 'Failed to create subscription');
    throw error;
  }
}

export async function cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  try {
    const stripe = getStripe();
    const subscription = await stripe.subscriptions.cancel(subscriptionId);
    logger.info({ subscriptionId }, 'Stripe subscription cancelled');
    return subscription;
  } catch (error) {
    logger.error({ error, subscriptionId }, 'Failed to cancel subscription');
    throw error;
  }
}

export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  try {
    const stripe = getStripe();
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    logger.error({ error }, 'Failed to construct webhook event');
    throw error;
  }
}

export async function listPrices(): Promise<Stripe.Price[]> {
  try {
    const stripe = getStripe();
    const prices = await stripe.prices.list({
      active: true,
      expand: ['data.product'],
    });
    return prices.data;
  } catch (error) {
    logger.error({ error }, 'Failed to list prices');
    throw error;
  }
}
