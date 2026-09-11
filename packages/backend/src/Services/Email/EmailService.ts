import { Imsg } from "./IEmail"
import sgMail from '@sendgrid/mail'
import 'dotenv/config'

export default class EmailService {

  // Untyped: @sendgrid/mail's declared return type for send() doesn't match its
  // actual runtime shape when passed an array of messages (see callers indexing
  // into the response as an array of responses), so callers rely on this being loose.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sgMail: any;

  constructor() {
    this.sgMail = sgMail
    this.sgMail.setApiKey(process.env.SENDGRID_API_KEY ?? '')
  }

  sendEmails = async (msg: Imsg[]) => {
    const responses = await this.sgMail.send(msg)
    return responses
  }
}
