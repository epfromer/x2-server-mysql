import {
  Custodian,
  custodianCollection,
  dbName,
  EmailSentByDay,
  emailSentByDayCollection,
  EmailTotal,
  HTTPQuery,
  ImportLogEntry,
  SearchHistoryEntry,
  wordCloudCollection,
  WordCloudTag,
} from './common'
import mysql from 'mysql2/promise'
import { getEmail } from './getEmail'
import { getImportStatus, importPST } from './importPST'
import { clearSearchHistory, getSearchHistory } from './searchHistory'

const getWordCloud = async (): Promise<Array<WordCloudTag>> => {
  if (
    !process.env.MYSQL_HOST ||
    !process.env.MYSQL_USER ||
    !process.env.MYSQL_ROOT_PASSWORD
  ) {
    throw 'MYSQL_HOST or MYSQL_USER or MYSQL_ROOT_PASSWORD undefined'
  }

  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_ROOT_PASSWORD,
    database: dbName,
  })
  const [rows] = await connection.execute(
    `select * from ${wordCloudCollection}`
  )
  connection.end()
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return rows.map((word) => ({
    tag: word.tag,
    weight: word.weight,
  }))
}

const getEmailSentByDay = async (): Promise<Array<EmailSentByDay>> => {
  if (
    !process.env.MYSQL_HOST ||
    !process.env.MYSQL_USER ||
    !process.env.MYSQL_ROOT_PASSWORD
  ) {
    throw 'MYSQL_HOST or MYSQL_USER or MYSQL_ROOT_PASSWORD undefined'
  }

  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_ROOT_PASSWORD,
    database: dbName,
  })
  const [rows] = await connection.execute(
    `select * from ${emailSentByDayCollection} order by day_sent asc`
  )
  connection.end()
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return rows.map((day) => ({
    sent: day.day_sent,
    emailIds: day.total,
  }))
}

const getCustodians = async (): Promise<Array<Custodian>> => {
  if (
    !process.env.MYSQL_HOST ||
    !process.env.MYSQL_USER ||
    !process.env.MYSQL_ROOT_PASSWORD
  ) {
    throw 'MYSQL_HOST or MYSQL_USER or MYSQL_ROOT_PASSWORD undefined'
  }

  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_ROOT_PASSWORD,
    database: dbName,
  })
  const [rows] = await connection.execute(
    `select * from ${custodianCollection} order by custodian_id asc`
  )
  connection.end()
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return rows.map((custodian) => ({
    id: custodian.custodian_id,
    name: custodian.custodian_name,
    title: custodian.title,
    color: custodian.color,
    senderTotal: custodian.sender_total,
    receiverTotal: custodian.receiver_total,
    toCustodians: JSON.parse(custodian.to_custodians),
  }))
}

const setCustodianColor = async (
  httpQuery: HTTPQuery
): Promise<Array<Custodian>> => {
  if (
    !process.env.MYSQL_HOST ||
    !process.env.MYSQL_USER ||
    !process.env.MYSQL_ROOT_PASSWORD
  ) {
    throw 'MYSQL_HOST or MYSQL_USER or MYSQL_ROOT_PASSWORD undefined'
  }

  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_ROOT_PASSWORD,
    database: dbName,
  })
  await connection.execute(
    `update ${custodianCollection} set color = '${httpQuery.color}' where custodian_id = '${httpQuery.id}'`
  )
  const [rows] = await connection.execute(
    `select * from ${custodianCollection} order by custodian_id asc`
  )
  connection.end()
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return rows.map((custodian) => ({
    id: custodian.custodian_id,
    name: custodian.custodian_name,
    title: custodian.title,
    color: custodian.color,
    senderTotal: custodian.sender_total,
    receiverTotal: custodian.receiver_total,
    toCustodians: JSON.parse(custodian.to_custodians),
  }))
}

interface Root {
  clearSearchHistory: () => Promise<string>
  getCustodians: () => Promise<Array<Custodian>>
  getEmail: (httpQuery: HTTPQuery) => Promise<EmailTotal>
  getEmailSentByDay: () => Promise<Array<EmailSentByDay>>
  getImportStatus: () => Array<ImportLogEntry>
  getSearchHistory: () => Promise<Array<SearchHistoryEntry>>
  getWordCloud: () => Promise<Array<WordCloudTag>>
  importPST: (httpQuery: HTTPQuery) => string
  setCustodianColor: (httpQuery: HTTPQuery) => Promise<Array<Custodian>>
}
export const root: Root = {
  clearSearchHistory: () => clearSearchHistory(),
  getCustodians: () => getCustodians(),
  getEmail: (httpQuery) => getEmail(httpQuery),
  getEmailSentByDay: () => getEmailSentByDay(),
  getImportStatus: () => getImportStatus(),
  getSearchHistory: () => getSearchHistory(),
  getWordCloud: () => getWordCloud(),
  importPST: (httpQuery) => importPST(httpQuery),
  setCustodianColor: (httpQuery) => setCustodianColor(httpQuery),
}

export default root
