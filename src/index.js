// Force sentry DSN into environment variables
// In the future, will be set by the stack
process.env.SENTRY_DSN =
  process.env.SENTRY_DSN ||
  'https://f1c5b0de1fb04c17bd67c6f747465675:864038d84e5640efbb8ee73c24b44115@sentry.cozycloud.cc/18'

const {
  BaseKonnector,
  log,
  requestFactory,
  saveBills,
  errors,
  retry
} = require('cozy-konnector-libs')

const { parseRemboursements, tokenify } = require('./parsers')
const { baseUrl } = require('./common')

let request = requestFactory()
const j = request.jar()
request = requestFactory({
  // debug: true,
  jar: j,
  json: false
})

const getRequestOptions = () => ({
  jar: j
})

module.exports = new BaseKonnector(start)

function start(fields) {
  return retry(fetchLoginPage, {
    interval: 5000,
    throw_original: true
  })
    .then(resp =>
      retry(() => logIn(fields, resp), {
        interval: 5000,
        throw_original: true,
        // do not retry if we get the LOGIN_FAILED error code
        predicate: err =>
          ![errors.LOGIN_FAILED, errors.VENDOR_DOWN].includes(err.message)
      })
    )
    .then(fetchRemboursements)
    .then(res => parseRemboursements(res, getRequestOptions))
    .then(entries =>
      saveBills(entries, fields, {
        timeout: Date.now() + 60 * 1000,
        identifiers: ['Malakoff'],
        sourceAccount: this._account._id,
        sourceAccountIdentifier: fields.login
      })
    )
}

function fetchLoginPage() {
  return request({
    url: `${baseUrl}/espaceClient/LogonAccess.do`,
    resolveWithFullResponse: true
  }).catch(err => {
    log('info', 'fetchLoginPage Failed')
    log('info', err && err.message)
    throw new Error(errors.VENDOR_DOWN)
  })
}

function logIn(fields, resp) {
  log('info', 'Logging in')

  // Sometimes the login page is an error and does not give cookies then we retry later
  if (!Array.isArray(resp.headers['set-cookie']))
    throw new Error(errors.VENDOR_DOWN)

  // This id is stored in the cookie and used to check the log in
  request = request.defaults({ json: false })
  return request({
    method: 'POST',
    url: `${baseUrl}/dwr/call/plaincall/__System.generateId.dwr`,
    body: `callCount=1\nc0-scriptName=__System\nc0-methodName=generateId\nc0-id=0\nbatchId=0\ninstanceId=0\npage=%2FespaceClient%2FLogonAccess.do\nscriptSessionId=\n`
  })
    .then(body => {
      const regexp = /dwr.engine.remote.handleCallback\(.*\)/g
      const matches = body.match(regexp)
      const tokens = matches[0].split('"')
      tokens.pop()
      const scriptSessionId = tokens.pop()

      return scriptSessionId
    })
    .then(scriptSessionId => {
      let cookie = request.cookie(`DWRSESSIONID=${scriptSessionId}`)
      j.setCookie(
        cookie,
        `${baseUrl}/dwr/call/plaincall/InternauteValidator.checkConnexion.dwr`
      )
      return request({
        method: 'POST',
        url: `${baseUrl}/dwr/call/plaincall/InternauteValidator.checkConnexion.dwr`,
        body: `callCount=1\nnextReverseAjaxIndex=0\nc0-scriptName=InternauteValidator\nc0-methodName=checkConnexion\nc0-id=0\nc0-param0=string:${encodeURIComponent(
          fields.login
        )}\nc0-param1=string:${encodeURIComponent(
          fields.password
        )}\nc0-param2=string:\nbatchId=1\ninstanceId=0\npage=%2FespaceClient%2FLogonAccess.do\nscriptSessionId=${scriptSessionId}/${tokenify(
          new Date().getTime()
        )}-${tokenify(Math.random() * 1e16)}\n`
      })
    })
    .then(body => {
      if (body.match(/dwr\.engine\.remote\.handleCallback\(".",".","OK"\);/)) {
        log('info', 'LOGIN_OK')
      } else if (
        body.match(
          /dwr\.engine\.remote\.handleCallback\(".",".","ERREUR_TECHNIQUE"\);/
        )
      ) {
        log('error', body)
        throw new Error(errors.VENDOR_DOWN)
      } else {
        log('error', body, 'bad login response')
        throw new Error(errors.LOGIN_FAILED)
      }
    })
}

async function fetchRemboursements() {
  request = requestFactory({
    jar: j,
    cheerio: true
  })
  const $ = await request(
    `${baseUrl}/espaceClient/sante/tbs/redirectionAction.do`,
    {
      json: true
    }
  )

  if ($('input[name=questionSecrete]').length > 0) {
    throw new Error(errors.USER_ACTION_NEEDED)
  }
  return $
}

module.exports.parseRemboursements = parseRemboursements
