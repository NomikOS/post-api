import { createServer } from '@/infrastructure/lib/httpServer'
import { colas } from '@/infrastructure/lib/colas'
import { configureContainer } from '@/infrastructure/lib/container'
import { env } from '@/infrastructure/lib/env'
const {
  coreDb,
  unhandledRejectionHandler,
  signalsHandlers
} = require('@/infrastructure/lib/support')
const container = configureContainer()
const loggerRoot = container.resolve('loggerRoot')
const amqpSender = container.resolve('amqpSender')

unhandledRejectionHandler(container)

// Init
;(async () => {
  try {
    await coreDb.raw('SELECT 1').catch((err) => {
      loggerRoot.debug('Error first check of database')
      throw err
    })

    // Server http
    await createServer(container).then(async (server) => {
      // Iniciar antes de amqpReceiver
      await amqpSender.init(colas.sender, loggerRoot)
      loggerRoot.debug(
        `Amqp writing on ${env['amqp-host']} in ${env.NODE_ENV} mode`
      )

      let stopping = false

      // En cloudrun do a warm to maintain service alive
      process.on('SIGTERM', async () => {
        loggerRoot.debug(
          `Received SIGTERM, Execute warming (stopping:${stopping})`
        )
        if (stopping) return
        stopping = true
        try {
          await signalsHandlers.warmit(loggerRoot, env)
        } catch (error) {
          loggerRoot.debug(error?.message || error)
          await signalsHandlers.stopit(loggerRoot, server, coreDb)
        }
      })

      // En vm con pm2 do a graceful shutdown
      process.on('SIGINT', async () => {
        if (stopping) return
        stopping = true
        loggerRoot.debug(
          `Received SIGINT, Execute graceful shutdown (stopping:${stopping})`
        )
        await signalsHandlers.stopit(loggerRoot, server, coreDb)
      })

      server.listen(env.PORT)
      loggerRoot.debug(
        `HTTP server listening on ${env.PORT} in ${env.NODE_ENV} mode`
      )
    })
  } catch (err) {
    loggerRoot.debug('Error while starting up microservice', err.stack)
    process.exit(1)
  }
})()
