import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { isPlatformAdmin } from '../middleware/authorize';
import { logger } from '../utils/logger';
import * as gocardlessService from '../services/gocardless.service';

const router = Router();
const prisma = new PrismaClient();

const createCustomerSchema = z.object({
  tenantId: z.string().uuid(),
  givenName: z.string(),
  familyName: z.string(),
});

const createMandateSchema = z.object({
  tenantId: z.string().uuid(),
});

const createPaymentSchema = z.object({
  tenantId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().default('EUR'),
  description: z.string().optional(),
});

router.post('/customers', isPlatformAdmin, async (req, res) => {
  try {
    const { tenantId, givenName, familyName } = createCustomerSchema.parse(req.body);
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant || tenant.deletedAt) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }
    if (tenant.gocardlessCustomerId) {
      res.status(400).json({ error: 'GoCardless customer already exists' });
      return;
    }
    const customer = await gocardlessService.createGoCardlessCustomer({
      email: tenant.email,
      givenName,
      familyName,
      tenantId: tenant.id,
    });
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { gocardlessCustomerId: customer.id },
    });
    logger.info({ userId: (req as any).user?.userId, tenantId, customerId: customer.id }, 'GoCardless customer created');
    res.json({ success: true, customer });
  } catch (error) {
    logger.error({ error }, 'Failed to create GoCardless customer');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/mandates', isPlatformAdmin, async (req, res) => {
  try {
    const { tenantId } = createMandateSchema.parse(req.body);
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant || !tenant.gocardlessCustomerId) {
      res.status(400).json({ error: 'Invalid tenant or missing customer' });
      return;
    }
    const mandate = await gocardlessService.createMandate({
      customerId: tenant.gocardlessCustomerId,
      tenantId: tenant.id,
      reference: 'MANDATE-' + tenant.slug.toUpperCase(),
    });
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { gocardlessMandateId: mandate.id },
    });
    logger.warn({ userId: (req as any).user?.userId, tenantId, mandateId: mandate.id }, 'GoCardless mandate created');
    res.json({ success: true, mandate });
  } catch (error) {
    logger.error({ error }, 'Failed to create mandate');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/payments', isPlatformAdmin, async (req, res) => {
  try {
    const { tenantId, amount, currency, description } = createPaymentSchema.parse(req.body);
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant || !tenant.gocardlessMandateId) {
      res.status(400).json({ error: 'Invalid tenant or missing mandate' });
      return;
    }
    const payment = await gocardlessService.createPayment({
      amount: Math.round(amount * 100),
      currency,
      mandateId: tenant.gocardlessMandateId,
      tenantId: tenant.id,
      description: description || 'Payment for ' + tenant.legalName,
    });
    await prisma.payment.create({
      data: {
        tenantId: tenant.id,
        amount: Math.round(amount * 100),
        currency,
        status: 'pending',
        paymentMethod: 'gocardless',
        gocardlessPaymentId: payment.id,
        description,
      },
    });
    logger.info({ tenantId, paymentId: payment.id }, 'GoCardless payment created');
    res.json({ success: true, payment });
  } catch (error) {
    logger.error({ error }, 'Failed to create payment');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/webhook', async (req, res) => {
  const signature = req.headers['webhook-signature'] as string;
  const webhookSecret = process.env.GOCARDLESS_WEBHOOK_SECRET;
  if (!webhookSecret) {
    res.status(500).json({ error: 'Webhook not configured' });
    return;
  }
  try {
    const isValid = gocardlessService.verifyWebhookSignature(JSON.stringify(req.body), signature, webhookSecret);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }
    const { events } = req.body;
    for (const event of events) {
      logger.info({ eventType: event.resource_type }, 'GoCardless webhook');
      if (event.resource_type === 'payments') {
        const paymentId = event.links.payment;
        const payment = await gocardlessService.getPayment(paymentId);
        await prisma.payment.updateMany({
          where: { gocardlessPaymentId: paymentId },
          data: {
            status: payment.status === 'confirmed' ? 'succeeded' : payment.status === 'failed' ? 'failed' : 'pending',
            paidAt: payment.status === 'confirmed' ? new Date() : null,
            failedAt: payment.status === 'failed' ? new Date() : null,
          },
        });
      }
    }
    res.json({ received: true });
  } catch (error) {
    logger.error({ error }, 'Webhook error');
    res.status(400).json({ error: 'Webhook error' });
  }
});

export default router;
