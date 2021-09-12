import * as http from 'http'
import Koa from 'koa'
import respond from 'koa-respond'
import bodyParser from 'koa-bodyparser'
import { scopePerRequest, loadControllers } from 'awilix-koa'
const cors = require('@koa/cors')
const {
  loggerMiddleware,
  errorHandlerMiddleware,
  notFoundHandlerMiddleware,
  registerContextSimple,
  authorizationMiddleware,
  ignoreFaviconMiddleware
} = require('@/infrastructure/lib/support')

/* eslint-disable-next-line require-await */
export async function createServer(container) {
  const loggerRoot = container.resolve('loggerRoot')
  loggerRoot.debug('Creating server...')

  const app = new Koa()

  // Container is configured with our services and whatnot.
  app.container = container

  app

    .use(ignoreFaviconMiddleware)

    .use(cors())

    // Adds ctx.ok(), ctx.notFound(), etc..
    .use(respond())

    // Creates an Awilix scope per request. Check out the awilix-koa
    // docs for details: https://github.com/jeffijoe/awilix-koa
    .use(scopePerRequest(container))

    // Create a middleware to add request-specific data to the scope.
    .use(registerContextSimple)

    // Antes de loggerMiddleware
    .use(bodyParser())

    // Sobre loggerMiddleware para loguear con stage error
    .use(errorHandlerMiddleware)

    .use(loggerMiddleware)

    .use(authorizationMiddleware)

    // Load routes (API "controllers")
    .use(loadControllers('../routes/*.js', { cwd: __dirname }))

    // Default handler when nothing stopped the chain.
    .use(notFoundHandlerMiddleware)

  // Creates a http server ready to listen.
  const server = http.createServer(app.callback())

  // Add a `close` event listener so we can clean up resources.
  server.on('close', () => {
    // You should tear down database connections, TCP connections, etc
    // here to make sure Jest's watch-mode some process management
    // tool does not release resources.
    loggerRoot.debug('Server closing, bye!')
  })

  return server
}
