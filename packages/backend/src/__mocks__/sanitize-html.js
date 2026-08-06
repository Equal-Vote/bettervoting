// Jest-only stand-in for `sanitize-html`. The real package pulls in htmlparser2@12,
// which dropped its CommonJS build (ESM-only) and can't be parsed by Jest's module
// system, even though Node itself handles it fine via native require(esm) support.
// See CLAUDE.md "Notes on dependencies" for the full story.
//
// No test in this repo asserts on actual sanitization output, so this passthrough
// is sufficient here. The real, security-patched sanitize-html is still what runs
// in dev/prod — this mock only takes effect under Jest.
function sanitizeHtml(html) {
  return html;
}

sanitizeHtml.defaults = {
  allowedTags: [],
  allowedAttributes: {},
};

module.exports = sanitizeHtml;
