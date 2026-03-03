import sanitizeHtml from 'sanitize-html';

const rLink = /\[(.*?)\]\((.*?)\)/;
const rBold = /\*\*(.*?)\*\*/;

export interface FormatMarkdownOptions {
  allowButtons?: boolean;
  buttonContext?: {
    voteUrl?: string;
    electionHomeUrl?: string;
  };
}

/**
 * Format markdown-like syntax into HTML
 * Supports:
 * - **bold** → <b>bold</b>
 * - [text](url) → <a href="url">text</a>
 * - \n\n → paragraph breaks
 * - __VOTE_BUTTON__ and __ELECTION_HOME_BUTTON__ (when allowButtons is true)
 *
 * Always sanitizes HTML first for security.
 */
export function formatMarkdown(text: string, options: FormatMarkdownOptions = {}): string {
  if (!text) return '';

  let body = text;

  // Sanitize first
  body = sanitizeHtml(body);

  // Links first: [text](url) → <a href="url">text</a>
  let linkParts = body.split(rLink);
  body = linkParts.map((str, i) => {
    if (i % 3 === 0) return str;
    if (i % 3 === 2) return '';
    // Process bold within link text
    const linkText = str.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    return `<a href="${linkParts[i + 1]}" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
  }).join('');

  // Bold on remaining text: **text** → <b>text</b>
  body = body.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

  // Paragraph breaks: \n\n → </p><p>
  body = `<p>${body.replaceAll('\n\n', '</p><p>')}</p>`;

  // Buttons (for email templates only)
  if (options.allowButtons) {
    if (options.buttonContext?.voteUrl) {
      body = body.replaceAll('__VOTE_BUTTON__', makeButton('Vote', options.buttonContext.voteUrl));
    }
    if (options.buttonContext?.electionHomeUrl) {
      body = body.replaceAll('__ELECTION_HOME_BUTTON__', makeButton('View Election', options.buttonContext.electionHomeUrl));
    }
  }

  return body;
}

export function makeButton(text: string, link: string): string {
  // https://stackoverflow.com/questions/2857765/whats-the-best-way-to-center-your-html-email-content-in-the-browser-window-or
  // adding ? at the end of link to ensure that trailing spaces are respected
  return `<table width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td align="center">
      <a clicktracking="off" href="${link}?" target="_blank" style="border: solid 1px #3498db; border-radius: 5px; box-sizing: border-box; cursor: pointer; display: inline-block; font-size: 14px; font-weight: bold; padding: 12px 25px; text-decoration: none; text-transform: capitalize; background-color: #3498db; border-color: #3498db; color: #ffffff;">${text}</a>
  </td></tr></table>`;
}
