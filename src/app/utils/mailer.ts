import nodemailer from "nodemailer";
import config from "../../config/index.js";

type MailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

/**
 * Sends transactional email through SMTP when configured. Without SMTP
 * credentials the message is logged instead, so development flows
 * (password reset) stay usable.
 */
export const sendMail = async ({ to, subject, text, html }: MailPayload): Promise<void> => {
  if (!config.smtp.host) {
    console.log(`[mailer:dev] to=${to} subject="${subject}"\n${text}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth:
      config.smtp.user && config.smtp.pass
        ? { user: config.smtp.user, pass: config.smtp.pass }
        : undefined,
  });

  await transporter.sendMail({
    from: config.smtp.from,
    to,
    subject,
    text,
    html,
  });
};
