import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationService {
  async sendEmail(email: string, subject: string, body: string) {
    // TODO: integrate real email provider. For now log to console.
    console.log(`[Notification] Sending email to ${email}: ${subject} - ${body}`);
  }

  async sendSms(phone: string, body: string) {
    // TODO: integrate real SMS provider. For now log to console.
    console.log(`[Notification] Sending SMS to ${phone}: ${body}`);
  }
}
