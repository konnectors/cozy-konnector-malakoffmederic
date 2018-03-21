const fs = require('fs')
const cheerio = require('cheerio')

const page = fs.readFileSync(require.resolve('./reimbursements.html'))
const { parseRemboursements } = require('../src/parsers')

describe('parse reimbursements', () => {
    const $ = cheerio.load(page)

  it('should parse reimbursements correctly', () => {
    const reimbursements = parseRemboursements($, () => {})
    expect(reimbursements.length).toBe(92)
    expect(reimbursements[70].amount).toBe(34.5)
    expect(reimbursements[70].groupAmount).toBe(111)
    expect(reimbursements[0]).toEqual({
      "amount": 0.36,
      "groupAmount": 2.19,
      "beneficiary": "Raphael THIRIOT",
      "date": new Date("2018-03-07T23:00:00.000Z"),
      "filename": "20180308_528117465_R18065200942444511_malakoff_mederic.pdf",
      "fileurl": "https://extranet.malakoffmederic.com/espaceClient/sante/tbs/tbsGenererPDF.do?remb=0",
      "idPrestation": "528117465_R18065200942444511_484552093",
      "idReimbursement": "528117465_R18065200942444511",
      "isRefund": true,
      "isThirdPartyPayer": true,
      "originalAmount": 1.02,
      "originalDate": new Date("2018-02-27T23:00:00.000Z"),
      "requestOptions": undefined,
      "socialSecurityRefund": 0.66,
      "subtype": "Honoraires de dispensation conditionnement normal pharmacie 65%",
      "type": "health_costs",
      "vendor": "Malakoff Mederic"
    })
    expect(reimbursements[10]).toEqual({
      "groupAmount": 3.54,
      "amount": 0.81,
      "beneficiary": "Raphael THIRIOT",
      "date": new Date("2018-02-06T23:00:00.000Z"),
      "filename": "20180207_528117465_R18037202299646947_malakoff_mederic.pdf",
      "fileurl": "https://extranet.malakoffmederic.com/espaceClient/sante/tbs/tbsGenererPDF.do?remb=3",
      "idPrestation": "528117465_R18037202299646947_477450086",
      "idReimbursement": "528117465_R18037202299646947",
      "isRefund": true,
      "isThirdPartyPayer": true,
      "originalAmount": 2.32,
      "originalDate": new Date("2018-02-02T23:00:00.000Z"),
      "requestOptions": undefined,
      "socialSecurityRefund": 1.51,
      "subtype": "Pharmacie",
      "type": "health_costs",
      "vendor": "Malakoff Mederic",
    })

  })
})
