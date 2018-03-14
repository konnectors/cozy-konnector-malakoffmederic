
const moment = require('moment')
const { baseUrl } = require('./common')


function parseRemboursements($, getRequestOptions) {
  const result = []

  // get the list of reimbursements rows
  $('#tableauxRemboursements > .body > .toggle').each(function() {
    const $header = $(this).find('.headerRemboursements')

    const amount = convertAmount($header.find('.montant').text())
    const date = moment($header.find('#datePaiement').val(), 'x')
    const isThirdPartyPayer =
      $(this)
        .find('.dateEmission')
        .text()
        .indexOf('professionnels de santé') !== -1

    // unique id for reimbursement
    const idReimbursement = $header.find('#idDecompte').val()

    let fileurl = $header.find('#tbsRembExportPdf').attr('href')
    fileurl = `${baseUrl}${fileurl}`

    const $subrows = $(this).find('> .body tbody tr')
    let beneficiary = null
    $subrows.each(function() {
      const data = $(this)
        .find('td, th')
        .map(function() {
          return $(this)
            .text()
            .trim()
        })
        .get()

      if (data.length === 1) {
        // we have a beneficiary line
        beneficiary = data[0]
      } else {
        // a normal line with data
        const originalAmount = convertAmount(data[data.length - 2])
        const originalDate = moment(
          $(this)
            .find('#datePrestation')
            .val(),
          'x'
        ).toDate()
        const subtype = data[1]
        // unique id for the prestation line. May be usefull
        const idPrestation = $(this)
          .find('#idPrestation')
          .val()
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
  })

  return result
}


function getFileName(date, idDecompte) {
  // you can have multiple reimbursements for the same day
  return `${date.format('YYYYMMDD')}_${idDecompte}_malakoff_mederic.pdf`
}

function convertAmount(amount) {
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
