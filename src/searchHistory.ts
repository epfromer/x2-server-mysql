import { dbName, searchHistoryCollection, SearchHistoryEntry } from './common'
import mysql from 'mysql2/promise'

export async function getSearchHistory(): Promise<Array<SearchHistoryEntry>> {
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
    `select * from ${searchHistoryCollection} order by time_stamp desc`
  )
  connection.end()
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return rows.map((entry) => ({
    id: entry.history_id,
    timestamp: entry.time_stamp,
    entry: entry.entry,
  }))
}

export async function clearSearchHistory(): Promise<string> {
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
  await connection.execute(`truncate table ${searchHistoryCollection}`)
  connection.end()
  return `Search history cleared`
}
