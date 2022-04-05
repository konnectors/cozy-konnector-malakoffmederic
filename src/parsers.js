const moment = require('moment')
const { baseUrl } = require('./common')
const { scrape, log } = require('cozy-konnector-libs')
const sumBy = require('lodash/sumBy')
const groupBy = require('lodash/groupBy')

function parseRemboursements($, getRequestOptions) {
  const reimbursements = []

  // get the list of reimbursements rows
  const rowGroups = $('#tableauxRemboursements > .body > .toggle')
  rowGroups.each(function (i) {
    const $this = $(this)
    const $header = $this.find('.headerRemboursements')

    const scraped = scrape($header, {
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

    log('info', scraped, 'scraped from malakoff mederic')
    const { date, isThirdPartyPayer, fileurl, idReimbursement } = scraped

    let beneficiary = null
    const $subrows = $this.find('> .body tbody tr')

    $subrows
      .each(function () {
        const $this = $(this)
        const data = $this
          .find('td, th')
          .map(function () {
            return $(this).text().trim()
          })
          .get()

        const { amount } = scrape($this, {
          amount: {
            sel: 'td:nth-child(5),td:nth-child(6)',
            fn: nodes =>
              sumBy(nodes, node => convertAmount($(node).text().trim()))
          }
        })

        if (data.length === 1) {
          // Beneficiary line
          beneficiary = data[0]
        } else {
          // Line with data
          const originalAmount = convertAmount(data[2])
          const originalDate = moment(
            $(this).find('#datePrestation').val(),
            'x'
          )
          // unique id for the prestation line. May be useful
          const idPrestation = $this.find('#idPrestation').val()
          const subtype = data[1]
          const socialSecurityRefund = convertAmount(data[3])
          reimbursements.push({
            group: i, // is used for groupAmount
            type: 'health_costs',
            isThirdPartyPayer,
            subtype,
            vendor: 'Malakoff Mederic',
            date: date && date.toDate(),
            fileurl,
            filename: getFileName(date, idReimbursement),
            requestOptions: getRequestOptions(),
            amount,
            idReimbursement,
            idPrestation,
            beneficiary,
            socialSecurityRefund,
            originalAmount,
            originalDate: originalDate && originalDate.toDate(),
            isRefund: true
          })
        }
      })
      .filter(Boolean)
      .toArray() // must filter for beneficiary lines
    // that did not yield reimbursement
  })

  const groups = groupBy(reimbursements, 'group')
  for (let k in groups) {
    const group = groups[k]
    const groupAmount = sumBy(group, 'amount')
    group.forEach(r => {
      r.groupAmount = groupAmount
      delete r.group
    })
  }

  return reimbursements
}

function getFileName(date, idDecompte) {
  // you can have multiple reimbursements for the same day
  return `${date.format('YYYYMMDD')}_${idDecompte}_malakoff_mederic.pdf`
}

function convertAmount(amount) {
  if (!amount) {
    return amount
  }
  return parseFloat(amount.replace(' €', '').replace(',', '.'))
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
