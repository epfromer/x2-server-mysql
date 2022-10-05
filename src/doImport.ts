import mysql, { ConnectionOptions } from 'mysql2/promise'
import { v4 as uuidv4 } from 'uuid'
import {
  Custodian,
  custodianCollection,
  dbName,
  Email,
  emailCollection,
  EmailSentByDay,
  emailSentByDayCollection,
  getEnv,
  getNumPSTs,
  processCustodians,
  processEmailSentByDay,
  processWordCloud,
  searchHistoryCollection,
  walkFSfolder,
  wordCloudCollection,
  WordCloudTag,
} from './common'

const processSend = (msg: string) => {
  if (!process || !process.send) {
    console.error('no process object or process.end undefined')
    return
  }
  process.send(msg)
}

async function run() {
  if (!getNumPSTs(process.argv[2])) {
    processSend(`no PSTs found in ${process.argv[2]}`)
    return
  }

  processSend(`connect to ${getEnv('MYSQL_HOST')}`)
  let connection = await mysql.createConnection({
    host: getEnv('MYSQL_HOST'),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_ROOT_PASSWORD,
  } as ConnectionOptions)

  const insertEmails = async (emails: Email[]): Promise<void> => {
    const q = `insert into ${emailCollection} (
      email_id, 
      email_sent, 
      email_from, 
      email_from_sort, 
      email_from_lc, 
      email_from_custodian, 
      email_from_custodian_lc, 
      email_to, 
      email_to_sort, 
      email_to_lc, 
      email_to_custodians, 
      email_to_custodians_lc, 
      email_cc, 
      email_cc_lc, 
      email_bcc, 
      email_bcc_lc, 
      email_subject, 
      email_subject_sort, 
      email_subject_lc, 
      email_body, 
      email_body_lc) 
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    emails.forEach(async (email) => {
      await connection.execute(q, [
        uuidv4(), // email_id
        email.sent, // email_sent
        email.from, // email_from
        email.from.slice(0, 254), //email_from_sort
        email.from.toLowerCase(), // email_from_lc
        email.fromCustodian, // email_from_custodian
        email.fromCustodian.toLowerCase(), // email_from_custodian_lc
        email.to, // email_to
        email.to.slice(0, 254), // email_to_sort
        email.to.toLowerCase(), // email_to_lc
        email.toCustodians.toString(), // email_to_custodians
        email.toCustodians.toString().toLowerCase(), // email_to_custodians_lc
        email.cc, // email_cc
        email.cc.toLowerCase(), // email_cc_lc
        email.bcc, // email_bcc
        email.bcc.toLowerCase(), // email_bcc_lc
        email.subject, // email_subject
        email.subject.slice(0, 254), // email_subject_sort
        email.subject.toLowerCase(), // email_subject_lc
        email.body, // email_body
        email.body.toLowerCase(), // email_body_lc
      ])
    })
  }

  const insertWordCloud = async (wordCloud: WordCloudTag[]): Promise<void> => {
    const q = `insert into ${wordCloudCollection} (tag, weight) values (?, ?)`
    wordCloud.forEach(async (word) => {
      await connection.execute(q, [word.tag, word.weight])
    })
  }

  const insertEmailSentByDay = async (
    emailSentByDay: EmailSentByDay[]
  ): Promise<void> => {
    const q = `insert into ${emailSentByDayCollection} (day_sent, total) values (?, ?)`
    emailSentByDay.forEach(async (day) => {
      // TODO
      await connection.execute(q, [day.sent, day.total])
    })
  }

  const insertCustodians = async (custodians: Custodian[]): Promise<void> => {
    const q = `insert into ${custodianCollection} (custodian_id, custodian_name, title, color, sender_total, receiver_total, to_custodians) values (?, ?, ?, ?, ?, ?, ?)`
    custodians.forEach(async (custodian) => {
      await connection.execute(q, [
        custodian.id,
        custodian.name,
        custodian.title,
        custodian.color,
        custodian.senderTotal,
        custodian.receiverTotal,
        JSON.stringify(custodian.toCustodians),
      ])
    })
  }

  processSend(`drop database`)
  await connection.execute('drop database if exists ' + dbName)

  processSend(`create database`)
  await connection.execute('create database ' + dbName)

  connection.end()

  connection = await mysql.createConnection({
    host: getEnv('MYSQL_HOST'),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_ROOT_PASSWORD,
    database: dbName,
  } as ConnectionOptions)

  await connection.execute(
    `create table ${emailCollection} (email_id varchar(255), email_sent timestamp, email_from text, email_from_sort varchar(255), email_from_lc text, email_from_custodian text, email_from_custodian_lc text, email_to text, email_to_sort varchar(255), email_to_lc text, email_to_custodians text, email_to_custodians_lc text, email_cc text, email_cc_lc text, email_bcc text, email_bcc_lc text, email_subject text, email_subject_sort varchar(255), email_subject_lc text, email_body longtext, email_body_lc longtext)`
  )
  await connection.execute(
    `alter table ${emailCollection} add primary key email_pkey(email_id)`
  )
  await connection.execute(
    `alter table ${emailCollection} add index email_email_sent_index(email_sent)`
  )
  await connection.execute(
    `alter table ${emailCollection} add index email_email_from_sort_index(email_from_sort)`
  )
  await connection.execute(
    `alter table ${emailCollection} add index email_email_to_sort_index(email_to_sort)`
  )
  await connection.execute(
    `alter table ${emailCollection} add index email_email_subject_sort_index(email_subject_sort)`
  )
  await connection.execute(
    `create table ${wordCloudCollection} (tag varchar(255), weight integer)`
  )
  await connection.execute(
    `alter table ${wordCloudCollection} add primary key wordcloud_pkey(tag)`
  )
  await connection.execute(
    `create table ${emailSentByDayCollection} (day_sent varchar(25), total integer)`
  )
  await connection.execute(
    `alter table ${emailSentByDayCollection} add primary key emailsentbyday_pkey(day_sent)`
  )
  await connection.execute(
    `create table ${custodianCollection} (custodian_id varchar(25), custodian_name text, title text, color text, sender_total integer, receiver_total integer, to_custodians text)`
  )
  await connection.execute(
    `alter table ${custodianCollection} add primary key custodians_pkey(custodian_id)`
  )
  await connection.execute(
    `create table ${searchHistoryCollection} (history_id varchar(255), time_stamp varchar(25), entry varchar(255))`
  )
  await connection.execute(
    `alter table ${searchHistoryCollection} add primary key history_id_pkey(history_id)`
  )
  await connection.execute(
    `alter table ${searchHistoryCollection} add index time_stamp_index(time_stamp)`
  )

  processSend(`process emails`)
  const numEmails = await walkFSfolder(process.argv[2], insertEmails, (msg) =>
    processSend(msg)
  )

  processSend(`process word cloud`)
  await processWordCloud(insertWordCloud, (msg) => processSend(msg))

  processSend(`process email sent`)
  await processEmailSentByDay(insertEmailSentByDay, (msg) => processSend(msg))

  processSend(`create custodians`)
  await processCustodians(insertCustodians, (msg) => processSend(msg))

  processSend(`completed ${numEmails} emails in ${process.argv[2]}`)
  connection.end()
}

run().catch((err) => console.error(err))
