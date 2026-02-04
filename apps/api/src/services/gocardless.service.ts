const gocardless = require('gocardless-nodejs');
import { logger } from '../utils/logger';

let gocardlessClient: any = null;

function getGoCardless() {
  if (!gocardlessClient) {
    const accessToken = process.env.GOCARDLESS_ACCESS_TOKEN;
    const environment = process.env.GOCARDLESS_ENVIRONMENT || 'sandbox';
    
    if (!accessToken || accessToken === 'your_gocardless_access_token_here') {
      throw new Error('GOCARDLESS_ACCESS_TOKEN not configured');
    }
    
    gocardlessClient = gocardless(accessToken, environment);
  }
  return gocardlessClient;
}

export interface CreateCustomerInput {
  email: string;
  givenName: string;
  familyName: string;
  tenantId: string;
}

export interface CreateMandateInput {
  customerId: string;
  tenantId: string;
  reference?: string;
}

export interface CreatePaymentInput {
  amount: number;
  currency: string;
  mandateId: string;
  tenantId: string;
  description?: string;
}

export async function createGoCardlessCustomer(input: CreateCustomerInput) {
  try {
    const client = getGoCardless();
    const customer = await client.customers.create({
      email: input.email,
      given_name: input.givenName,
      family_name: input.familyName,
      country_code: 'ES',
      metadata: { tenantId: input.tenantId },
    });
    logger.info({ customerId: customer.id, tenantId: input.tenantId }, 'GoCardless customer created');
    return customer;
  } catch (error) {
    logger.error({ error }, 'Failed to create GoCardless customer');
    throw error;
  }
}

export async function createMandate(input: CreateMandateInput) {
  try {
    const client = getGoCardless();
    const bankAccount = await client.customer_bank_accounts.create({
      account_holder_name: 'Placeholder Account',
      account_number: '55779911',
      branch_code: '200000',
      country_code: 'ES',
      links: { customer: input.customerId },
    });
    const mandate = await client.mandates.create({
      links: { customer_bank_account: bankAccount.id },
      scheme: 'sepa_core',
      reference: input.reference,
      metadata: { tenantId: input.tenantId },
    });
    logger.info({ mandateId: mandate.id }, 'GoCardless mandate created');
    return mandate;
  } catch (error) {
    logger.error({ error }, 'Failed to create mandate');
    throw error;
  }
}

export async function createPayment(input: CreatePaymentInput) {
  try {
    const client = getGoCardless();
    const payment = await client.payments.create({
      amount: input.amount,
      currency: input.currency,
      links: { mandate: input.mandateId },
      description: input.description,
      metadata: { tenantId: input.tenantId },
    });
    logger.info({ paymentId: payment.id }, 'GoCardless payment created');
    return payment;
  } catch (error) {
    logger.error({ error }, 'Failed to create payment');
    throw error;
  }
}

export async function cancelMandate(mandateId: string) {
  try {
    const client = getGoCardless();
    const mandate = await client.mandates.cancel(mandateId);
    logger.info({ mandateId }, 'Mandate cancelled');
    return mandate;
  } catch (error) {
    logger.error({ error }, 'Failed to cancel mandate');
    throw error;
  }
}

export async function getPayment(paymentId: string) {
  try {
    const client = getGoCardless();
    return await client.payments.find(paymentId);
  } catch (error) {
    logger.error({ error }, 'Failed to get payment');
    throw error;
  }
}

export function verifyWebhookSignature(requestBody: string, signature: string, webhookSecret: string): boolean {
  const crypto = require('crypto');
  const computed = crypto.createHmac('sha256', webhookSecret).update(requestBody).digest('hex');
  return computed === signature;
}
