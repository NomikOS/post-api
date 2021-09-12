import { env } from '@/infrastructure/lib/env'
export const { LoggerInstancer } = require('@nomikos/module-koa-common')
export const { NotFoundError } = require('@nomikos/module-koa-common')
export const { ValidationError } = require('@nomikos/module-koa-common')
export const { Assertion } = require('@nomikos/module-koa-common')

export const { UnauthorizedError } = require('@nomikos/module-koa-common')
export const { authMiddleware } = require('@nomikos/module-koa-common')
export const { loggerMiddleware } = require('@nomikos/module-koa-common')
export const {
  unhandledRejectionHandler
} = require('@nomikos/module-koa-common')
export const { errorHandlerMiddleware } = require('@nomikos/module-koa-common')
export const {
  notFoundHandlerMiddleware
} = require('@nomikos/module-koa-common')
export const { registerContextSimple } = require('@nomikos/module-koa-common')
export const { VerboseError } = require('@nomikos/module-koa-common')
export const { AmqpReceiver } = require('@nomikos/module-comm')
export const { AmqpSender } = require('@nomikos/module-comm')
export const { Emailer } = require('@nomikos/module-comm')
export const { retryPost } = require('@nomikos/module-google')
export const {
  authorizationMiddleware,
  GoogleService
} = require('@nomikos/module-google')
export const { signalsHandlers } = require('@nomikos/module-koa-common')
// Conectar a database con secret
if (!env.knexPg || !env.knexPg.connection || !env.knexPg.connection.host) {
  throw new Error('DB connection data missing')
}
export const coreDb = GoogleService.connectDatabase({
  knexPgConfig: env.knexPg,
  databaseSecret: `${env.NODE_ENV}-core-database-secret`
})
export const {
  ignoreFaviconMiddleware
} = require('@nomikos/module-koa-common')
