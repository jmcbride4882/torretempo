import Stripe from 'stripe';
import { logger } from '../utils/logger';

/**
 * Stripe Service
 * 
 * Handles all Stripe payment operations:
 * - Customer creation
 * - Subscription management
 * - Payment intent creation
 * - Webhook handling
 */

// Initialize Stripe with API key from environment
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-01-28.clover',
  typescript: true,
});

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

export interface CreatePaymentIntentInput {
  amount: number;
  currency: string;
  customerId: string;
  tenantId: string;
  description?: string;
  metadata?: Record<string, string>;
}

/**
 * Create a Stripe customer
 */
export async function createStripeCustomer(input: CreateCustomerInput): Promise<Stripe.Customer> {
  try {
    const customer = await stripe.customers.create({
      email: input.email,
      name: input.name,
      metadata: {
        tenantId: input.tenantId,
        ...input.metadata,
      },
    });

    logger.info({ customerId: customer.id, tenantId: input.tenantId }, 'Stripe customer created');
    return customer;
  } catch (error) {
    logger.error({ error, input }, 'Failed to create Stripe customer');
    throw error;
  }
}

/**
 * Get Stripe customer by ID
 */
export async function getStripeCustomer(customerId: string): Promise<Stripe.Customer> {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) {
      throw new Error('Customer has been deleted');
    }
    return customer as Stripe.Customer;
  } catch (error) {
    logger.error({ error, customerId }, 'Failed to retrieve Stripe customer');
    throw error;
  }
}

/**
 * Update Stripe customer
 */
export async function updateStripeCustomer(
  customerId: string,
  updates: Partial<Stripe.CustomerUpdateParams>
): Promise<Stripe.Customer> {
  try {
    const customer = await stripe.customers.update(customerId, updates);
    logger.info({ customerId }, 'Stripe customer updated');
    return customer;
  } catch (error) {
    logger.error({ error, customerId }, 'Failed to update Stripe customer');
    throw error;
  }
}

/**
 * Create a subscription
 */
export async function createSubscription(input: CreateSubscriptionInput): Promise<Stripe.Subscription> {
  try {
    const subscription = await stripe.subscriptions.create({
      customer: input.customerId,
      items: [{ price: input.priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        tenantId: input.tenantId,
        ...input.metadata,
      },
    });

    logger.info({ subscriptionId: subscription.id, tenantId: input.tenantId }, 'Stripe subscription created');
    return subscription;
  } catch (error) {
    logger.error({ error, input }, 'Failed to create Stripe subscription');
    throw error;
  }
}

/**
 * Get subscription by ID
 */
export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch (error) {
    logger.error({ error, subscriptionId }, 'Failed to retrieve subscription');
    throw error;
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  try {
    const subscription = await stripe.subscriptions.cancel(subscriptionId);
    logger.info({ subscriptionId }, 'Stripe subscription cancelled');
    return subscription;
  } catch (error) {
    logger.error({ error, subscriptionId }, 'Failed to cancel subscription');
    throw error;
  }
}

/**
 * Create payment intent
 */
export async function createPaymentIntent(input: CreatePaymentIntentInput): Promise<Stripe.PaymentIntent> {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: input.amount,
      currency: input.currency,
      customer: input.customerId,
      description: input.description,
      metadata: {
        tenantId: input.tenantId,
        ...input.metadata,
      },
    });

    logger.info({ paymentIntentId: paymentIntent.id, tenantId: input.tenantId }, 'Payment intent created');
    return paymentIntent;
  } catch (error) {
    logger.error({ error, input }, 'Failed to create payment intent');
    throw error;
  }
}

/**
 * Construct webhook event from request
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  try {
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    logger.error({ error }, 'Failed to construct webhook event');
    throw error;
  }
}

/**
 * List all prices (for subscription tiers)
 */
export async function listPrices(): Promise<Stripe.Price[]> {
  try {
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

export { stripe };
