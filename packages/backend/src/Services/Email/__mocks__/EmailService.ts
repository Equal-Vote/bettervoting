import { Imsg } from "./../IEmail"

export default class EmailService {

  public sentEmails:Imsg[];

  constructor() {
    this.sentEmails = []
  }

  sendEmails = async (msg: Imsg[]) => {
    this.sentEmails.push(...msg)
    // Mirror the shape the real EmailService returns from @sendgrid/mail:
    // one [ClientResponse, body] pair per message (see how sendInvitesController
    // reads emailResponse[0][0].statusCode).
    return msg.map(() => [{ statusCode: 202, headers: {} }, {}])
  }

  clear = () => {
    this.sentEmails = []
  }

}