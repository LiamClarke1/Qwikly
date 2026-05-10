/**
 * Sample payload helpers for cadence preview and QA in Mission Control.
 * Not a real test file. No test runner imports here.
 */

export interface SampleCadenceVars {
  firstName: string;
  businessName: string;
  icebreaker: string;
  painPoint: string;
  softCTA: string;
  senderFirstName: string;
  leadName: string;
  leadSummary: string;
  bookingLink: string;
}

/**
 * Returns a fully-populated set of vars suitable for previewing the cadence
 * and the instant-reply templates side by side. South African flavour.
 */
export function buildSamplePayload(): SampleCadenceVars {
  return {
    firstName: 'Thandi',
    businessName: 'Cape Coast Dental',
    icebreaker:
      'Saw the new Sea Point clinic photos on your site, the front desk setup looks great.',
    painPoint:
      'your contact form sends to one inbox and there is no after-hours reply path',
    softCTA: 'Worth a quick look? Happy to send a 90 second walkthrough if that is easier than a call.',
    senderFirstName: 'Liam',
    leadName: 'Sipho Nkosi',
    leadSummary: 'asked about Saturday cleaning slots at 14h00',
    bookingLink: 'https://qwikly.co.za/book/cape-coast-dental',
  };
}
