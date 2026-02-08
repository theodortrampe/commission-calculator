/**
 * Notification helper for payout events.
 * Currently a stub - can be extended with email/Slack/etc.
 */

export interface NotificationPayload {
    userId: string;
    userEmail: string;
    userName: string;
    payoutId: string;
    payoutAmount: number;
    periodMonth: Date;
}

/**
 * Send notification when payout is published.
 * TODO: Integrate with email provider (Resend, SendGrid, etc.)
 */
export async function notifyPayoutPublished(payload: NotificationPayload): Promise<void> {
    // Stub implementation - log for now
    console.log(`[NOTIFICATION] Payout published for ${payload.userName} (${payload.userEmail})`);
    console.log(`  Payout ID: ${payload.payoutId}`);
    console.log(`  Amount: $${payload.payoutAmount.toLocaleString()}`);
    console.log(`  Period: ${payload.periodMonth.toISOString()}`);

    // TODO: Implement actual email sending
    // Example with Resend:
    // 
    // import { Resend } from 'resend';
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // 
    // await resend.emails.send({
    //     from: 'commissions@company.com',
    //     to: payload.userEmail,
    //     subject: `Your ${format(payload.periodMonth, 'MMMM yyyy')} payout is ready`,
    //     html: `
    //         <h1>Your Payout is Ready!</h1>
    //         <p>Hi ${payload.userName},</p>
    //         <p>Your payout for ${format(payload.periodMonth, 'MMMM yyyy')} has been finalized.</p>
    //         <p><strong>Amount: $${payload.payoutAmount.toLocaleString()}</strong></p>
    //         <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/payouts/${payload.payoutId}">View Details</a></p>
    //     `,
    // });
}
