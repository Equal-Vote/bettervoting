import { Imsg } from "./../IEmail"

export default class EmailService {

  public sentEmails:Imsg[];
  private nextMessageId = 1;
  // Set to make the next sendEmails call throw, as SendGrid does when it rejects a request.
  public failNextSend = false;

  constructor() {
    this.sentEmails = []
  }

  // Mirrors @sendgrid/mail: one [response, body] pair per message, where the response
  // carries the status code and SendGrid's X-Message-Id header.
  sendEmails = async (msg: Imsg[]) => {
    if (this.failNextSend) {
      this.failNextSend = false;
      throw new Error('Mock SendGrid failure');
    }
    this.sentEmails.push(...msg)
    return msg.map(() => [{ statusCode: 202, headers: { 'x-message-id': `mock-message-${this.nextMessageId++}` } }, {}]);
  }

  clear = () => {
    this.sentEmails = []
  }

}
