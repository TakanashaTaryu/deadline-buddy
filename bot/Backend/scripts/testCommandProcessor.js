const path = require('path')
process.env.BOT_PREFIX = '!'
const wahaService = require('../src/services/wahaService')
const sent = []
wahaService.isInitialized = true
wahaService.sendMessage = async (chatId, text) => { sent.push({ chatId, text }) }
const commandProcessor = require('../src/middleware/commandProcessor')

function makeReq(commandText) {
  return { body: { event: 'message', payload: { from: '123@c.us', body: commandText } } }
}

function makeRes() {
  const res = { _status: 200, _json: null }
  res.status = (s) => { res._status = s; return res }
  res.json = (j) => { res._json = j; return res }
  return res
}

async function run() {
  sent.length = 0
  const tests = [
    '!timezone-edit WIB',
    '!timezone WIB',
    '!tz WITA',
    '!timezone–edit WIT',
    '!timezone—edit WIB',
  ]
  for (const t of tests) {
    const req = makeReq(t)
    const res = makeRes()
    await commandProcessor(req, res)
    console.log('status', res._status, 'json', res._json)
  }
  console.log('sent', sent.map(s => s.text))
}

run()
