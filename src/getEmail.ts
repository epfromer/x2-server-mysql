import {
  dbName,
  defaultLimit,
  emailCollection,
  EmailTotal,
  getEnv,
  HTTPQuery,
  searchHistoryCollection,
  startupQuery,
} from './common'
import mysql from 'mysql2/promise'
import { v4 as uuidv4 } from 'uuid'

const createWhereClause = (httpQuery: HTTPQuery) => {
  // console.log(httpQuery)

  let { allText, from, to, subject, body } = httpQuery

  if (allText) allText = allText.toLowerCase()
  if (from) from = from.toLowerCase()
  if (to) to = to.toLowerCase()
  if (subject) subject = subject.toLowerCase()
  if (body) body = body.toLowerCase()
  const { id, sent } = httpQuery

  // get single email?
  if (id) return `email_id = '${id}'`

  let query = ''

  if (sent) {
    const start = new Date(sent)
    const end = new Date(start.getTime())
    end.setDate(end.getDate() + 1)
    query +=
      `(email_sent >= '${new Date(start).toISOString().slice(0, 10)}' and ` +
      `email_sent <= '${new Date(end).toISOString().slice(0, 10)}')`
  }

  if (allText) {
    // any text field?
    query +=
      (query ? ' and ' : '') +
      `(` +
      `email_from_lc like '%${allText}%' or ` +
      `email_from_custodian_lc like '%${allText}%' or ` +
      `email_to_lc like '%${allText}%' or ` +
      `email_to_custodians_lc like '%${allText}%' or ` +
      `email_cc_lc like '%${allText}%' or ` +
      `email_bcc_lc like '%${allText}%' or ` +
      `email_subject_lc like '%${allText}%' or ` +
      `email_body_lc like '%${allText}%'` +
      `)`
  } else {
    // Else, we have specific field searching.
    if (from) {
      query +=
        (query ? ' and ' : '') +
        `(` +
        `email_from_lc like '%${from}%' or ` +
        `email_from_custodian_lc like '%${from}%'` +
        `)`
    }
    if (to) {
      query +=
        (query ? ' and ' : '') +
        `(` +
        `email_to_lc like '%${to}%' or ` +
        `email_to_custodians_lc like '%${to}%' or ` +
        `email_cc_lc like '%${to}%' or ` +
        `email_bcc_lc like '%${to}%'` +
        `)`
    }
    if (subject) {
      query +=
        (query ? ' and ' : '') +
        `(` +
        `email_subject_lc like '%${subject}%'` +
        `)`
    }
    if (body) {
      query +=
        (query ? ' and ' : '') + `(` + `email_body_lc like '%${body}%'` + `)`
    }
  }

  // console.log(query)
  return query
}

const sort = (httpQuery: HTTPQuery) => {
  const { sort } = httpQuery
  if (!sort || sort === 'sent') return 'email_sent'
  return 'email_' + sort + '_sort'
}

export async function getEmail(httpQuery: HTTPQuery): Promise<EmailTotal> {
  try {
    const start = Date.now()
    let qTotal = `select count(*) as total from ${emailCollection}`
    let q = `select * from ${emailCollection}`

    const whereClause = createWhereClause(httpQuery)
    if (whereClause) {
      qTotal += ' where ' + whereClause
      q += ' where ' + whereClause
    }

    q +=
      ` order by ${sort(httpQuery)} ${httpQuery.order === 1 ? 'asc' : 'desc'}` +
      ` limit ${httpQuery.limit ? +httpQuery.limit : defaultLimit}` +
      ` offset ${httpQuery.skip ? +httpQuery.skip : 0} `

    const connection = await mysql.createConnection({
      host: getEnv('MYSQL_HOST'),
      user: getEnv('MYSQL_USER'),
      password: getEnv('MYSQL_ROOT_PASSWORD'),
      database: dbName,
    })
    const [rows] = await connection.execute(q)
    const [resultTotal] = await connection.execute(qTotal)
    // connection.end()

    delete httpQuery.skip
    delete httpQuery.limit
    const strQuery = JSON.stringify(httpQuery)
    // save query if not the initial
    if (strQuery !== startupQuery) {
      const q = `insert into ${searchHistoryCollection} (history_id, time_stamp, entry) values (?, ?, ?)`
      await connection.execute(q, [
        uuidv4(),
        new Date().toISOString(),
        strQuery,
      ])
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const total = +resultTotal[0].total
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const emails = rows.map((email) => ({
      id: email.email_id,
      sent: email.email_sent,
      sentShort: new Date(email.email_sent).toISOString().slice(0, 10),
      from: email.email_from,
      fromCustodian: email.email_from_custodian,
      to: email.email_to,
      toCustodians: email.email_to_custodians
        ? email.email_to_custodians.split(',')
        : [],
      cc: email.email_cc,
      bcc: email.email_bcc,
      subject: email.email_subject,
      body: email.email_body,
    }))

    console.log('mysql', httpQuery, total, Date.now() - start)
    return { total, emails }
  } catch (err) {
    console.error(err)
    return { total: 0, emails: [] }
  }
}
