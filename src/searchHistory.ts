import {
  dbName,
  getEnv,
  searchHistoryCollection,
  SearchHistoryEntry,
} from './common'
import mysql from 'mysql2/promise'

export async function getSearchHistory(): Promise<Array<SearchHistoryEntry>> {
  const connection = await mysql.createConnection({
    host: getEnv('MYSQL_HOST'),
    user: getEnv('MYSQL_USER'),
    password: getEnv('MYSQL_ROOT_PASSWORD'),
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
  const connection = await mysql.createConnection({
    host: getEnv('MYSQL_HOST'),
    user: getEnv('MYSQL_USER'),
    password: getEnv('MYSQL_ROOT_PASSWORD'),
    database: dbName,
  })
  await connection.execute(`truncate table ${searchHistoryCollection}`)
  connection.end()
  return `Search history cleared`
}
