import { parse } from 'ofx-js'

async function readOfxData(ofxData) {
  try {
    const parsedData = await parse(ofxData)
    return parsedData
  } catch (error) {
    console.error('Error parsing OFX data:', error)
    throw error
  }
}

/**
 * @example {
 *   ACCTID: "4321",          // Last 4 digits of account number
 *   ACCTTYPE: "Checking",    // [Checking, Savings, Money Market, Credit Line]
 *   INTU_BID: "10898",       // Quicken specific Bank ID (null for standard OFX)
 *   ORG: "Chase"             // Institution Name (null for standard OFX)
 * }
 */
async function extractAccountData(ofxData) {
  const parsed = await readOfxData(ofxData)
  const OFX = parsed.OFX || parsed

  // Check for bank account info
  const bankMsgs = OFX.BANKMSGSRSV1 || {}
  const ccMsgs = OFX.CREDITCARDMSGSRSV1 || {}

  const stmtrs = (bankMsgs.STMTTRNRS || {}).STMTRS || {}
  const ccstmtrs = (ccMsgs.CCSTMTTRNRS || {}).CCSTMTRS || {}

  const bankAccount = stmtrs.BANKACCTFROM
  const bankCreditCardAccount = ccstmtrs.CCACCTFROM
  const ledgerBal = stmtrs.LEDGERBAL || ccstmtrs.LEDGERBAL || null

  if (!bankAccount && !bankCreditCardAccount) return null

  // Extract Quicken/institution specific data
  const signonMsgs = OFX.SIGNONMSGSRSV1 || {}
  const sonrs = signonMsgs.SONRS || {}
  const fi = sonrs.FI || {}

  return {
    ACCTID:
      (bankAccount && bankAccount.ACCTID) ||
      (bankCreditCardAccount && bankCreditCardAccount.ACCTID) ||
      '',
    ACCTTYPE:
      {
        CHECKING: 'Checking',
        SAVINGS: 'Savings',
        MONEYMRKT: 'Money Market',
        CREDITLINE: 'Credit Line'
      }[bankAccount && bankAccount.ACCTTYPE] || 'Credit Line',
    INTU_BID: sonrs['INTU.BID'] || fi['INTU.BID'] || null,
    ORG: fi.ORG || null,
    BALAMT: ledgerBal ? ledgerBal.BALAMT : null,
    DTASOF: ledgerBal ? ledgerBal.DTASOF : null
  }
}

/**
 * @example [
 *   {
 *     ACCTID: "4321",          // Last 4 digits of account number
 *     ACCTTYPE: "Checking",    // [Checking, Savings, Money Market, Credit Line]
 *     INTU_BID: "10898",       // Quicken specific Bank ID (null for standard OFX)
 *     ORG: "Chase",            // Institution Name (null for standard OFX)
 *     TRNTYPE: "DEBIT",        // e.g. DEBIT, CREDIT, XFER, FEE, etc.
 *     DTPOSTED: "20231015120000.000[-5:EST]",
 *     TRNAMT: "-50.00",
 *     FITID: "1234567890",
 *     NAME: "Grocery Store",
 *     MEMO: "Weekly Groceries",              // Optional
 *     DTUSER: "20231014120000.000[-5:EST]",  // Optional
 *     DTAVAIL: "20231016120000.000[-5:EST]", // Optional
 *     SRVRTID: "SRV-12345",                 // Optional
 *     PAYEEID: "PAYEE-987",                 // Optional
 *     EXTDNAME: "Grocery Store Inc.",       // Optional
 *     SIC: "5411"                           // Optional (Merchant Category Code)
 *   }
 * ]
 */
async function extractTransactionData(ofxData) {
  const parsed = await readOfxData(ofxData)
  const OFX = parsed.OFX || parsed

  const bankMsgs = OFX.BANKMSGSRSV1 || {}
  const ccMsgs = OFX.CREDITCARDMSGSRSV1 || {}

  const rawTransactions =
    (((bankMsgs.STMTTRNRS || {}).STMTRS || {}).BANKTRANLIST &&
      ((bankMsgs.STMTTRNRS || {}).STMTRS || {}).BANKTRANLIST.STMTTRN) ||
    (((ccMsgs.CCSTMTTRNRS || {}).CCSTMTRS || {}).BANKTRANLIST &&
      ((ccMsgs.CCSTMTTRNRS || {}).CCSTMTRS || {}).BANKTRANLIST.STMTTRN)

  if (!rawTransactions) return []

  // Extract account info inline
  const bankAccount = ((bankMsgs.STMTTRNRS || {}).STMTRS || {}).BANKACCTFROM
  const bankCreditCardAccount = ((ccMsgs.CCSTMTTRNRS || {}).CCSTMTRS || {}).CCACCTFROM

  const signonMsgs = OFX.SIGNONMSGSRSV1 || {}
  const sonrs = signonMsgs.SONRS || {}
  const fi = sonrs.FI || {}

  const accountData = {
    ACCTID:
      (bankAccount && bankAccount.ACCTID) ||
      (bankCreditCardAccount && bankCreditCardAccount.ACCTID) ||
      '',
    ACCTTYPE:
      {
        CHECKING: 'Checking',
        SAVINGS: 'Savings',
        MONEYMRKT: 'Money Market',
        CREDITLINE: 'Credit Line'
      }[bankAccount && bankAccount.ACCTTYPE] || 'Credit Line',
    INTU_BID: sonrs['INTU.BID'] || fi['INTU.BID'] || null,
    ORG: fi.ORG || null
  }

  // STMTTRN can be a single object or an array of objects
  return [].concat(rawTransactions).map(function ({
    TRNTYPE,
    DTPOSTED,
    TRNAMT,
    FITID,
    NAME,
    MEMO,
    CHECKNUM,
    REFNUM,
    DTUSER,
    DTAVAIL,
    SRVRTID,
    PAYEEID,
    EXTDNAME,
    SIC
  }) {
    return Object.assign({}, accountData, {
      TRNTYPE,
      DTPOSTED,
      TRNAMT,
      FITID,
      NAME,
      MEMO,
      CHECKNUM,
      REFNUM,
      DTUSER,
      DTAVAIL,
      SRVRTID,
      PAYEEID,
      EXTDNAME,
      SIC
    })
  })
}

export { readOfxData, extractAccountData, extractTransactionData }
