function parse(text, prefix='!') {
  const messageText = text.trim()
  if (!messageText.startsWith(prefix)) return null
  const commandText = messageText.substring(prefix.length).trim()
  const normalizedText = commandText.replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, '-')
  const parts = normalizedText.split(' ')
  const raw = parts[0].toLowerCase()
  const args = parts.slice(1)
  const resolved = (raw === 'timezone' || raw === 'tz') ? 'timezone-edit' : raw
  return { resolved, args }
}

const inputs = [
  '!timezone-edit WIB',
  '!timezone WIB',
  '!tz WITA',
  '!timezone–edit WIT',
  '!timezone—edit WIB'
]

for (const i of inputs) {
  const out = parse(i)
  console.log(i, '=>', out)
}

console.log('\n!commands should show Indonesian help message')
