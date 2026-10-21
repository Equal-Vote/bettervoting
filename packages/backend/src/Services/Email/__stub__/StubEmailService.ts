import { Imsg } from "../IEmail"
import Logger from "../../Logging/Logger"

// Runtime stub used when SENDGRID_API_KEY is absent or still the sample.env
// placeholder. Mirrors the fallback ServiceLocator already does for BlobService.
//
// Unlike __mocks__/EmailService (jest-only, returns undefined), this returns the
// real SendGrid response shape -- [[{statusCode, headers, body}]] -- because
// callers read emailResponse[0][0].headers['x-message-id'] and .statusCode to
// write emailEventsDB rows. Returning undefined silently skips that write.
//
// NOT sandbox_mode: that is server-side at SendGrid and still needs a live key
// plus a network round trip per message.
let counter = 0;

export default class StubEmailService {
  sentCount = 0;

  sendEmails = async (msg: Imsg[]) => {
    this.sentCount += msg.length;
    if (this.sentCount % 1000 === 0) {
      Logger.info({}, `StubEmailService: ${this.sentCount} messages accepted`);
    }
    // Reproduces SendGrid's real response headers. Measured on prod, the headers
    // object is ~661 of the ~794 bytes each send appends to a roll's history.
    // A minimal stub understates history growth by ~6x and makes load tests lie.
    return msg.map(() => ([{
      statusCode: 202,
      headers: {
        'server': 'nginx',
        'date': new Date().toUTCString(),
        'content-length': '0',
        'connection': 'close',
        'x-message-id': `stub-${Date.now().toString(36)}-${(counter++).toString(36)}`,
        'access-control-allow-origin': 'https://sendgrid.api-docs.io',
        'access-control-allow-methods': 'POST',
        'access-control-allow-headers':
          'Authorization, Content-Type, On-behalf-of, x-sg-elas-acl',
        'access-control-max-age': '600',
        'x-no-cors-reason':
          'https://sendgrid.com/docs/Classroom/Basics/API/cors.html',
        'strict-transport-security': 'max-age=600; includeSubDomains',
        'content-security-policy':
          "default-src 'none'; frame-ancestors 'none'; base-uri 'none';",
        'cache-control': 'no-cache, no-store, must-revalidate',
        'referrer-policy': 'strict-origin-when-cross-origin',
        'x-content-type-options': 'nosniff',
      },
      body: '',
    }]));
  }
}
