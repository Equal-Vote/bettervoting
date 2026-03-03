import { Ballot } from "@equal-vote/star-vote-shared/domain_model/Ballot"
import { Election } from "@equal-vote/star-vote-shared/domain_model/Election"
import { ElectionRoll } from "@equal-vote/star-vote-shared/domain_model/ElectionRoll"
import { Imsg } from "./IEmail"
import { DateTime } from 'luxon'
import { formatMarkdown, makeButton } from "@equal-vote/star-vote-shared/utils/formatMarkdown";

const emailSettings: Partial<Imsg> = {
    asm: process.env.SENDGRID_GROUP_ID ? {
        groupId: parseInt(process.env.SENDGRID_GROUP_ID)
    }  : undefined,
    mail_settings: process.env.EMAIL_TEST_MODE ? {
        "sandbox_mode": {
            "enable": true
        }
    } : undefined
}

const formatTime = (time: string | Date, tz: string) => DateTime.fromJSDate(new Date(time)).setZone(tz).toLocaleString(DateTime.DATETIME_FULL);


export function makeEmails(election: Election, voters: ElectionRoll[], url: string, email_subject: string, email_body: string, test_email: boolean): Imsg[] {
    const processEmailBody = (body: string, voter_id: string) => {
        return formatMarkdown(body, {
            allowButtons: true,
            buttonContext: {
                voteUrl: `${url}/${election.election_id}/${election.settings.voter_authentication.voter_id === true && 'id/' + voter_id}`,
                electionHomeUrl: `${url}/${election.election_id}`
            }
        });
    }
    return voters.map((voter) => <Imsg>{
        ...emailSettings,
        to: voter.email, // Change to your recipient
        from: process.env.FROM_EMAIL_ADDRESS ?? '',
        subject: `${test_email ? '[Test Email] ' : ''}${email_subject}`,
        text: `${election.state === 'draft' ? `[⚠️Test ${election.settings.term_type}]` : ''} You have received a message from election ${election.title}`,
        html: emailTemplate(`
            ${election.state === 'draft' ? `<h3>⚠️This ${election.settings.term_type} is still in test mode. All ballots during test mode will be removed once the election is finalized, and at that time you will need to vote again.⚠️</h3>` : ''}
            ${processEmailBody(email_body, voter.voter_id)}
        `)
    })
}

export function Invites(election: Election, voters: ElectionRoll[], url: string, email_subject?: string, email_body?: string): Imsg[] {
    return voters.map((voter) => <Imsg>{
        ...emailSettings,
        to: voter.email, // Change to your recipient
        from: process.env.FROM_EMAIL_ADDRESS ?? '',
        subject: email_subject ?? `Invitation to Vote In ${election.title}`,
        text: `${election.state === 'draft' ? `[⚠️Test ${election.settings.term_type}]` : ''} ${email_body ?? '' }  You have been invited to vote in ${election.title} ${url}/${election.election_id}`,
        html: emailTemplate(`
          ${election.state === 'draft' ? `<h3>⚠️This ${election.settings.term_type} is still in test mode. All ballots during test mode will be removed once the election is finalized, and at that time you will need to vote again.⚠️</h3>` : ''}
          ${email_body ? formatMarkdown(email_body) : '' }
          <p>You have been invited to vote in the \"${election.title}\" ${election.settings.term_type}.</p>
          ${election.description ?
            `<p>Election ${formatMarkdown(election.description)}<p>` : ''
          }
          ${(election.start_time && election.settings.time_zone) ?
            `<p>Voting will begin on ${formatTime(election.start_time, election.settings.time_zone)}.<p>` : ''
          }
          ${(election.end_time && election.settings.time_zone) ?
            `<p><b>Voting ends on ${formatTime(election.end_time, election.settings.time_zone)}!</b><p>` : ''
          }

          <p>Click the button to vote:</p>

          ${makeButton('Vote', `${url}/${election.election_id}/${election.settings.voter_authentication.voter_id === true && 'id/' + voter.voter_id}`)}

          <p>This link is unique to you, be careful not to share this email with others</p>
        `)
    })
}

export function Blank(election: Election, voters: ElectionRoll[], url: string, email_subject: string, email_body: string): Imsg[] {
  return voters.map((voter) => <Imsg>{
      ...emailSettings,
      to: voter.email, // Change to your recipient
      from: process.env.FROM_EMAIL_ADDRESS ?? '',
      subject: email_subject,
      text: `${email_body}`,
      html: emailTemplate(`
        ${formatMarkdown(email_body)}
        ${makeButton('View Election', `${url}/${election.election_id}`)}
      `)
  })
}

export function Receipt(election: Election, email: string, ballot: Ballot, url: string, roll?: ElectionRoll): Imsg {
    const ballotVerifyUrl = `${url}/${election.election_id}/ballot/${ballot.ballot_id}`;
    const ballotUpdateUrl = `${url}/${election.election_id}/id/${roll?.voter_id}`;
    return {
        ...emailSettings,
        to: email, // Change to your recipient
        from: process.env.FROM_EMAIL_ADDRESS ?? '',
        subject: `Ballot Receipt For ${election.title}`,
        text: `${election.state === 'draft' ? '[⚠️Test Ballot]' : ''} Thank you for voting in ${election.title}, you can view your ballot and ballot status at \
               ${ballotVerifyUrl}. ${election.settings.ballot_updates && roll ? `While the election is still open, you can update you ballot at ${ballotUpdateUrl}`: ''}`,
        html: emailTemplate(`
          <div> 
            ${election.state === 'draft' ? "<h3>⚠️This was cast as a test ballot. All test ballots will be removed once the election is finalized, and at that time you will need to vote again.⚠️</h3>" : ''}
            <p>Thank you for voting in ${election.title}!<p>
            <p>You can <a clicktracking="off" href="${ballotVerifyUrl}">verify your ballot and ballot status</a> at any time.</p>
            ${election.settings.ballot_updates && roll ? `<p>While the election is still open, you can <a clicktracking="off" href="${ballotUpdateUrl}">update your ballot</a></p>.` : ''}
          </div>    
        `),
    }
}


function emailTemplate(content: string) {
  // How to generate this
  // 1. Edit template within the STAR Voting mailchimp account
  // 2. Export template as html
  // 3. substitute EMAIL_CONTENT with ${content}
  // 4. substitute UNSUBSCRIBE_LINK with <%asm_group_unsubscribe_url%>
  // 5. delete MC_PREVIEW_TEXT block (3 lines)
  return `<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head>
<!--[if gte mso 15]>
<xml>
<o:OfficeDocumentSettings>
<o:AllowPNG/>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
<![endif]-->
<meta charset="UTF-8"/>
<meta http-equiv="X-UA-Compatible" content="IE=edge"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>*|MC:SUBJECT|*</title>
<style>          img{-ms-interpolation-mode:bicubic;} 
          table, td{mso-table-lspace:0pt; mso-table-rspace:0pt;} 
          .mceStandardButton, .mceStandardButton td, .mceStandardButton td a{mso-hide:all !important;} 
          p, a, li, td, blockquote{mso-line-height-rule:exactly;} 
          p, a, li, td, body, table, blockquote{-ms-text-size-adjust:100%; -webkit-text-size-adjust:100%;} 
          @media only screen and (max-width: 480px){
            body, table, td, p, a, li, blockquote{-webkit-text-size-adjust:none !important;} 
          }
          .mcnPreviewText{display: none !important;} 
          .bodyCell{margin:0 auto; padding:0; width:100%;}
          .ExternalClass, .ExternalClass p, .ExternalClass td, .ExternalClass div, .ExternalClass span, .ExternalClass font{line-height:100%;} 
          .ReadMsgBody{width:100%;} .ExternalClass{width:100%;} 
          a[x-apple-data-detectors]{color:inherit !important; text-decoration:none !important; font-size:inherit !important; font-family:inherit !important; font-weight:inherit !important; line-height:inherit !important;} 
            body{height:100%; margin:0; padding:0; width:100%; background: #ffffff;}
            p{margin:0; padding:0;} 
            table{border-collapse:collapse;} 
            td, p, a{word-break:break-word;} 
            h1, h2, h3, h4, h5, h6{display:block; margin:0; padding:0;} 
            img, a img{border:0; height:auto; outline:none; text-decoration:none;} 
            a[href^="tel"], a[href^="sms"]{color:inherit; cursor:default; text-decoration:none;} 
            li p {margin: 0 !important;}
            .ProseMirror a {
                pointer-events: none;
            }
            @media only screen and (max-width: 640px){
                .mceClusterLayout td{padding: 4px !important;} 
            }
            @media only screen and (max-width: 480px){
                body{width:100% !important; min-width:100% !important; } 
                body.mobile-native {
                    -webkit-user-select: none; user-select: none; transition: transform 0.2s ease-in; transform-origin: top center;
                }
                body.mobile-native.selection-allowed a, body.mobile-native.selection-allowed .ProseMirror {
                    user-select: auto;
                    -webkit-user-select: auto;
                }
                colgroup{display: none;}
                img{height: auto !important;}
                .mceWidthContainer{max-width: 660px !important;}
                .mceColumn{display: block !important; width: 100% !important;}
                .mceColumn-forceSpan{display: table-cell !important; width: auto !important;}
                .mceColumn-forceSpan .mceButton a{min-width:0 !important;}
                .mceBlockContainer{padding-right:16px !important; padding-left:16px !important;} 
                .mceTextBlockContainer{padding-right:16px !important; padding-left:16px !important;} 
                .mceBlockContainerE2E{padding-right:0px; padding-left:0px;} 
                .mceSpacing-24{padding-right:16px !important; padding-left:16px !important;}
                .mceImage, .mceLogo{width: 100% !important; height: auto !important;} 
                .mceFooterSection .mceText, .mceFooterSection .mceText p{font-size: 16px !important; line-height: 140% !important;}
            }
            div[contenteditable="true"] {outline: 0;}
            .ProseMirror h1.empty-node:only-child::before,
            .ProseMirror h2.empty-node:only-child::before,
            .ProseMirror h3.empty-node:only-child::before,
            .ProseMirror h4.empty-node:only-child::before {
                content: 'Heading';
            }
            .ProseMirror p.empty-node:only-child::before, .ProseMirror:empty::before {
                content: 'Start typing...';
            }
            .mceImageBorder {display: inline-block;}
            .mceImageBorder img {border: 0 !important;}
body, #bodyTable { background-color: rgb(244, 244, 244); }.mceText, .mcnTextContent, .mceLabel { font-family: "Helvetica Neue", Helvetica, Arial, Verdana, sans-serif; }.mceText, .mcnTextContent, .mceLabel { color: rgb(0, 0, 0); }.mceText p { margin-bottom: 0px; }.mceText label { margin-bottom: 0px; }.mceText input { margin-bottom: 0px; }.mceSpacing-24 .mceInput + .mceErrorMessage { margin-top: -12px; }.mceText p { margin-bottom: 0px; }.mceText label { margin-bottom: 0px; }.mceText input { margin-bottom: 0px; }.mceSpacing-12 .mceInput + .mceErrorMessage { margin-top: -6px; }.mceInput { background-color: transparent; border: 2px solid rgb(208, 208, 208); width: 60%; color: rgb(77, 77, 77); display: block; }.mceInput[type="radio"], .mceInput[type="checkbox"] { float: left; margin-right: 12px; display: inline; width: auto !important; }.mceLabel > .mceInput { margin-bottom: 0px; margin-top: 2px; }.mceLabel { display: block; }.mceText p, .mcnTextContent p { color: rgb(0, 0, 0); font-family: "Helvetica Neue", Helvetica, Arial, Verdana, sans-serif; font-size: 16px; font-weight: normal; line-height: 150%; text-align: left; direction: ltr; margin: 10px 0px; }.mceSectionHeader .mceText p, .mceSectionHeader .mcnTextContent p { }.mceSectionFooter .mceText p, .mceSectionFooter .mcnTextContent p { }
@media only screen and (max-width: 480px) {
            .mceText p { margin: 0px; font-size: 16px !important; line-height: 150% !important; }
          }
@media only screen and (max-width: 480px) {
            .mceBlockContainer { padding-left: 16px !important; padding-right: 16px !important; }
          }
#dataBlockId-8 p, #dataBlockId-8 h1, #dataBlockId-8 h2, #dataBlockId-8 h3, #dataBlockId-8 h4, #dataBlockId-8 ul { text-align: center; }</style></head>
<body>
<center>
<table border="0" cellpadding="0" cellspacing="0" height="100%" width="100%" id="bodyTable" style="background-color: rgb(244, 244, 244);">
<tbody><tr>
<td class="bodyCell" align="center" valign="top">
<table id="root" border="0" cellpadding="0" cellspacing="0" width="100%"><tbody data-block-id="4" class="mceWrapper"><tr><td style="background-color:#f4f4f4" align="center" valign="top" class="mceSectionHeader"><!--[if (gte mso 9)|(IE)]><table align="center" border="0" cellspacing="0" cellpadding="0" width="660" style="width:660px;"><tr><td><![endif]--><table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:660px" role="presentation"><tbody><tr><td style="background-color:#ffffff" class="mceWrapperInner" valign="top"><table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" data-block-id="3"><tbody><tr class="mceRow"><td style="background-position:center;background-repeat:no-repeat;background-size:cover" valign="top"><table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation"><tbody><tr><td style="padding-top:0;padding-bottom:0" class="mceColumn" data-block-id="-4" valign="top" colspan="12" width="100%"><table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation"><tbody><tr><td style="padding-top:12px;padding-bottom:12px;padding-right:0;padding-left:0" class="mceBlockContainer" align="center" valign="top"><span class="mceImageBorder" style="border:0;border-radius:0;vertical-align:top;margin:0"><img data-block-id="1" width="561" height="auto" style="width:561px;height:auto;max-width:660px !important;border-radius:0;display:block" alt="" src="https://mcusercontent.com/c2dbbc77bc1870468d52b840d/images/de572541-4db8-f2f6-cd39-aaa8c59ddcd7.png" role="presentation" class="imageDropZone mceImage"/></span></td></tr><tr><td style="padding-top:0;padding-bottom:0;padding-right:0;padding-left:0" valign="top"><table width="100%" style="border:0;border-radius:0;border-collapse:separate"><tbody><tr><td style="padding-left:24px;padding-right:24px;padding-top:12px;padding-bottom:12px" class="mceTextBlockContainer"><div data-block-id="2" class="mceText" id="dataBlockId-2" style="width:100%"><p style="text-align: left;" class="last-child">${content}</p></div></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table><!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]--></td></tr></tbody><tbody data-block-id="6" class="mceWrapper"><tr><td style="background-color:#f4f4f4" align="center" valign="top" class="mceSectionBody"><!--[if (gte mso 9)|(IE)]><table align="center" border="0" cellspacing="0" cellpadding="0" width="660" style="width:660px;"><tr><td><![endif]--><table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:660px" role="presentation"><tbody><tr><td style="background-color:#ffffff" class="mceWrapperInner" valign="top"><table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" data-block-id="5"><tbody><tr class="mceRow"><td style="background-position:center;background-repeat:no-repeat;background-size:cover" valign="top"><table border="0" cellpadding="0" cellspacing="24" width="100%" role="presentation"><tbody></tbody></table></td></tr></tbody></table></td></tr></tbody></table><!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]--></td></tr></tbody><tbody data-block-id="12" class="mceWrapper"><tr><td style="background-color:#f4f4f4" align="center" valign="top" class="mceSectionFooter"><!--[if (gte mso 9)|(IE)]><table align="center" border="0" cellspacing="0" cellpadding="0" width="660" style="width:660px;"><tr><td><![endif]--><table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:660px" role="presentation"><tbody><tr><td style="background-color:#ffffff" class="mceWrapperInner" valign="top"><table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" data-block-id="11"><tbody><tr class="mceRow"><td style="background-position:center;background-repeat:no-repeat;background-size:cover" valign="top"><table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation"><tbody><tr><td style="padding-top:0;padding-bottom:0" class="mceColumn" data-block-id="-5" valign="top" colspan="12" width="100%"><table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation"><tbody><tr><td style="background-color:#f4f4f4;padding-top:8px;padding-bottom:8px;padding-right:8px;padding-left:8px" valign="top"><table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" data-block-id="10" id="section_1a2e6bce26f530a3c9fe296adb44c259" class="mceFooterSection"><tbody><tr class="mceRow"><td style="background-color:#f4f4f4;background-position:center;background-repeat:no-repeat;background-size:cover;padding-top:0px;padding-bottom:0px" valign="top"><table border="0" cellpadding="0" cellspacing="12" width="100%" role="presentation"><tbody><tr><td style="padding-top:0;padding-bottom:0" class="mceColumn" data-block-id="-3" valign="top" colspan="12" width="100%"><table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation"><tbody><tr><td style="padding-top:0;padding-bottom:0;padding-right:0;padding-left:0" align="center" valign="top"><table width="100%" style="border:0;border-radius:0;border-collapse:separate"><tbody><tr><td style="padding-left:16px;padding-right:16px;padding-top:12px;padding-bottom:12px" class="mceTextBlockContainer"><div data-block-id="8" class="mceText" id="dataBlockId-8" style="display:inline-block;width:100%"><p class="last-child"><%asm_group_unsubscribe_url%></p></div></td></tr></tbody></table></td></tr><tr><td class="mceLayoutContainer" align="center" valign="top"><table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" data-block-id="-2"><tbody><tr class="mceRow"><td style="background-position:center;background-repeat:no-repeat;background-size:cover;padding-top:0px;padding-bottom:0px" valign="top"><table border="0" cellpadding="0" cellspacing="24" width="100%" role="presentation"><tbody></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table><!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]--></td></tr></tbody></table>
</td>
</tr>
</tbody></table>
</center>
<script type="text/javascript"  src="/XFnNUNdUj4/qmx7sudU1C/YmESG8LzfG2r3E/biVUdhwB/OnA/rNCsKeUkB"></script></body></html>`
}
