import nodemailer from "nodemailer";

/**
 * Email sender. Uses SMTP when EMAIL_SERVER is configured; otherwise logs
 * the message to the console so renewal digests work with zero infra.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(msg: EmailMessage): Promise<void> {
  const from = process.env.EMAIL_FROM ?? "DomainPulse <no-reply@domainpulse.test>";

  if (!process.env.EMAIL_SERVER) {
    console.log("📧 [email:console]", { to: msg.to, subject: msg.subject });
    console.log(msg.text ?? msg.html);
    return;
  }

  const transport = nodemailer.createTransport(process.env.EMAIL_SERVER);
  await transport.sendMail({ from, ...msg });
}
