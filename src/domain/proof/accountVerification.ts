/**
 * AVS IS AN ADAPTER. AVS IS NOT THE PRODUCT.
 *
 * MukuruProof depends only on this interface. The hackathon ships a
 * simulated implementation; a real deployment would add, for example:
 *  - AVSAccountVerificationProvider   (bank Account Verification Service)
 *  - MukuruBankZeroVerificationProvider (Mukuru / Bank Zero internal checks)
 * without changing the proof, storage or verifier code.
 */
export interface AccountVerificationRequest {
  /** Opaque customer reference — never an ID or account number in this prototype. */
  customerRef: string;
}

export interface AccountVerificationResult {
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

/** Synthetic customer used in the demo. No real person or bank data. */
export const DEMO_CUSTOMER = {
  customerRef: 'demo-blessing-ndlovu',
  displayName: 'Blessing Ndlovu',
  accountHint: 'Mukuru wallet •••• 4821',
} as const;

/**
 * SIMULATED VERIFICATION FOR HACKATHON. Returns fixed, synthetic answers
 * for the demo customer only, and refuses everyone else.
 */
export class SimulatedAccountVerificationProvider implements AccountVerificationProvider {
  readonly name = 'SIMULATED_AVS';
  readonly simulated = true;

  constructor(private readonly now: () => Date = () => new Date()) {}

  async verifyAccount(request: AccountVerificationRequest): Promise<AccountVerificationResult> {
    if (request.customerRef !== DEMO_CUSTOMER.customerRef) throw new UnknownCustomerError();
    return {
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
