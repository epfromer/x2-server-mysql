import cors from 'cors'
import * as dotenv from 'dotenv'
import express, { Application } from 'express'
import { graphqlHTTP } from 'express-graphql'
import { graphqlSchema } from './common'
import root from './root'
dotenv.config()

if (
  !process.env.MYSQL_HOST ||
  !process.env.MYSQL_USER ||
  !process.env.MYSQL_ROOT_PASSWORD
) {
  throw 'MYSQL_HOST or MYSQL_USER or MYSQL_ROOT_PASSWORD undefined'
}

const app = express()
app.use(cors())
app.use(
  '/graphql',
  graphqlHTTP({
    schema: graphqlSchema,
    rootValue: root,
    graphiql: true,
    customFormatErrorFn: (error) => ({
      message: error.message,
      locations: error.locations,
      stack: error.stack ? error.stack.split('\n') : [],
      path: error.path,
    }),
  }) as Application
)

const port = process.env.PORT || 3000
app.listen(port, () => console.log(`mysql running on PORT: ${port}`))
