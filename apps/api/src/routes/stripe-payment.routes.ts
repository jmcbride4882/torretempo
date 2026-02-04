import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { isPlatformAdmin } from '../middleware/authorize';
import { logger } from '../utils/logger';
import * as stripeService from '../services/stripe.service';

const router = Router();
const prisma = new PrismaClient();

const createCustomerSchema = z.object({
  tenantId: z.string().uuid(),
});

const createSubscriptionSchema = z.object({
  tenantId: z.string().uuid(),
  priceId: z.string(),
});

router.post('/customers', isPlatformAdmin, async (req, res) => {
  try {
    const { tenantId } = createCustomerSchema.parse(req.body);
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

    if (!tenant || tenant.deletedAt) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    if (tenant.stripeCustomerId) {
      res.status(400).json({ error: 'Stripe customer already exists' });
      return;
    }

    const customer = await stripeService.createStripeCustomer({
      email: tenant.email,
      name: tenant.legalName,
      tenantId: tenant.id,
    });

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { stripeCustomerId: customer.id },
    });

    res.json({ success: true, customer });
  } catch (error) {
    logger.error({ error }, 'Failed to create Stripe customer');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/subscriptions', isPlatformAdmin, async (req, res) => {
  try {
    const { tenantId, priceId } = createSubscriptionSchema.parse(req.body);
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

    if (!tenant || !tenant.stripeCustomerId) {
      res.status(400).json({ error: 'Invalid tenant or missing Stripe customer' });
      return;
    }

    const subscription = await stripeService.createSubscription({
      customerId: tenant.stripeCustomerId,
      priceId,
      tenantId: tenant.id,
    });

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { stripeSubscriptionId: subscription.id, subscriptionStatus: 'active' },
    });

    res.json({ success: true, subscription });
  } catch (error) {
    logger.error({ error }, 'Failed to create subscription');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/webhook', async (req, res) => {
  const signature = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    res.status(500).json({ error: 'Webhook secret not configured' });
    return;
  }

  try {
    const event = stripeService.constructWebhookEvent(req.body, signature, webhookSecret);
    logger.info({ eventType: event.type }, 'Stripe webhook received');
    res.json({ received: true });
  } catch (error) {
    logger.error({ error }, 'Webhook error');
    res.status(400).json({ error: 'Webhook error' });
  }
});

export default router;
