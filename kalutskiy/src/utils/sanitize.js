const sanitizeHtml = require('sanitize-html')

function clean(text) {
  return sanitizeHtml(String(text || ''), {
    allowedTags: [],
    allowedAttributes: {},
  }).trim()
}

module.exports = { clean }
