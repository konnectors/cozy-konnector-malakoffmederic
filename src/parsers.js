
const moment = require('moment')
const { baseUrl } = require('./common')
const { scrape } = require('cozy-konnector-libs')


function parseRemboursements($, getRequestOptions) {
  const result = []

  // get the list of reimbursements rows
  const rowGroups = $('#tableauxRemboursements > .body > .toggle')
  rowGroups.each(function(i) {
    const $this = $(this)
    const $header = $this.find('.headerRemboursements')

    const { amount, date, isThirdPartyPayer, fileurl, idReimbursement } = scrape($header, {
      amount: {
        sel: '.montant',
        parse: convertAmount
      },
      date: {
        sel: '#datePaiement',
        fn: node => moment(node.val(), 'x')
      },
      isThirdPartyPayer: {
        sel: '.dateEmission',
        parse: x => x.indexOf('professionnels de santé') !== -1
      },
      idReimbursement: {
        sel: '#idDecompte',
        fn: node => node.val()
      },
      fileurl: {
        sel: '#tbsRembExportPdf',
        attr: 'href',
        parse: fileurl => `${baseUrl}${fileurl}`
      }
    })

    let beneficiary = null
    const $subrows = $this.find('> .body tbody tr')
    $subrows.each(function() {
      const $this = $(this)
      const data = $this
        .find('td, th')
        .map(function() {
          return $(this)
            .text()
            .trim()
        })
        .get()

      if (data.length === 1) {
        // Beneficiary line
        beneficiary = data[0]
      } else {
        // Line with data
        const originalAmount = convertAmount(data[data.length - 2])
        const originalDate = moment(
          $(this)
            .find('#datePrestation')
            .val(),
          'x'
        ).toDate()
        // unique id for the prestation line. May be useful
        const idPrestation = $this
          .find('#idPrestation')
          .val()
        const subtype = data[1]
        const socialSecurityRefund = convertAmount(data[3])
        result.push({
          type: 'health_costs',
          isThirdPartyPayer,
          subtype,
          vendor: 'Malakoff Mederic',
          date: date.toDate(),
          fileurl,
          filename: getFileName(date, idReimbursement),
          requestOptions: getRequestOptions(),
          amount,
          idReimbursement,
          idPrestation,
          beneficiary,
          socialSecurityRefund,
          originalAmount,
          originalDate,
          isRefund: true
        })
      }
  })

  return result
}


function getFileName(date, idDecompte) {
  // you can have multiple reimbursements for the same day
  return `${date.format('YYYYMMDD')}_${idDecompte}_malakoff_mederic.pdf`
}

function convertAmount(amount) {
  if (!amount) { return amount }
  amount = amount.replace(' €', '').replace(',', '.')
  return parseFloat(amount)
}

function tokenify(number) {
  var tokenbuf = []
  var charmap =
    '1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ*$'
  var remainder = number
  while (remainder > 0) {
    tokenbuf.push(charmap.charAt(remainder & 0x3f))
    remainder = Math.floor(remainder / 64)
  }
  return tokenbuf.join('')
}

module.exports = {
  tokenify,
  parseRemboursements
}
