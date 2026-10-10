import config from "../../../config/index.js";
import { sendMail } from "../../utils/mailer.js";

interface ContactPayload {
  name: string;
  email: string;
  message: string;
}

/**
 * Receives a contact-form message and forwards it to the support inbox.
 * Email is best-effort (the mailer no-ops when SMTP is unconfigured), so the
 * endpoint always acknowledges receipt.
 */
const submitMessage = async (payload: ContactPayload) => {
  const inbox = config.smtp.from || "no-reply@go-together.local";

  await sendMail({
    to: inbox,
    subject: `New contact message from ${payload.name}`,
    text: `From: ${payload.name} <${payload.email}>\n\n${payload.message}`,
    html: `<p><strong>${payload.name}</strong> &lt;${payload.email}&gt;</p><p>${payload.message}</p>`,
  });

  return { received: true };
};

export const ContactService = {
  submitMessage,
};
