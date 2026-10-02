/**
 * AVS IS AN ADAPTER. AVS IS NOT THE PRODUCT.
 *
 * MukuruProof depends only on this interface. The hackathon ships a
 * simulated implementation; a real deployment would add, for example:
 *  - AVSAccountVerificationProvider
 *  - MukuruBankZeroVerificationProvider
 * without changing the payment/security policy.
 */
export interface AccountVerificationRequest {
  /** Opaque customer reference — never an ID or account number in this prototype. */
  customerRef: string;
}

export interface AccountVerificationResult {
  /** Whether the destination account exists in the authoritative provider. */
  accountExists: boolean;
  identityVerified: boolean;
  ownerMatch: boolean;
  accountActive: boolean;
  acceptsCredits: boolean;
  verifiedAt: string;
  /** Who answered, e.g. "SIMULATED_AVS". Shown to verifiers for honesty. */
  provider: string;
  simulated: boolean;
}

export interface AccountVerificationProvider {
  readonly name: string;
  readonly simulated: boolean;
  verifyAccount(request: AccountVerificationRequest): Promise<AccountVerificationResult>;
}

export class UnknownCustomerError extends Error {
  constructor() {
    super('UNKNOWN_CUSTOMER');
    this.name = 'UnknownCustomerError';
  }
}

/** Synthetic people used only by the hackathon demo. No real bank data. */
export const DEMO_CUSTOMER = {
  customerRef: 'demo-blessing-ndlovu',
  displayName: 'Blessing Ndlovu',
  accountHint: 'Mukuru wallet •••• 4821',
} as const;

export const DEMO_RECIPIENT = {
  customerRef: 'demo-tendai-moyo',
  displayName: 'Tendai Moyo',
  accountHint: 'Mukuru wallet •••• 7314',
} as const;

export const DEMO_MISMATCH_CUSTOMER = {
  customerRef: 'demo-simba-moyo',
  displayName: 'Simba Moyo',
  accountHint: 'Mukuru wallet •••• 9052',
} as const;

const DEMO_CUSTOMERS = [DEMO_CUSTOMER, DEMO_RECIPIENT, DEMO_MISMATCH_CUSTOMER] as const;

/**
 * SIMULATED VERIFICATION FOR HACKATHON.
 *
 * Production must replace this adapter with authorised Mukuru/Bank Zero/AVS
 * integrations. The payment path calls this provider again before a new
 * recipient can reach final confirmation, so the browser never becomes the
 * authority for verification.
 */
export class SimulatedAccountVerificationProvider implements AccountVerificationProvider {
  readonly name = 'SIMULATED_AVS';
  readonly simulated = true;

  constructor(private readonly now: () => Date = () => new Date()) {}

  async verifyAccount(request: AccountVerificationRequest): Promise<AccountVerificationResult> {
    if (!DEMO_CUSTOMERS.some((customer) => customer.customerRef === request.customerRef)) {
      throw new UnknownCustomerError();
    }
    return {
      accountExists: true,
      identityVerified: true,
      ownerMatch: true,
      accountActive: true,
      acceptsCredits: true,
      verifiedAt: this.now().toISOString(),
      provider: this.name,
      simulated: true,
    };
  }
}
