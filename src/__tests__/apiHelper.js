import { Lifetime, asClass } from 'awilix'
import { createServer } from '../infrastructure/lib/httpServer'
import { memoize } from 'lodash'
import axios from 'axios'
import { coreDb } from '@/infrastructure/lib/support'
import { configureContainer } from '@/infrastructure/lib/container'
import AmqpWriterService from '@/application/__mocks__/AmqpWriterService'
import ApiService from '@/application/__mocks__/ApiService'
import { migrator } from '@nomikos/module-ia-support'
const { env } = require('@/infrastructure/lib/env')

const container = configureContainer()

// Sobreescribir algunas dependencias con simulaciones
container.register({
  amqpWriterService: asClass(AmqpWriterService, { lifetime: Lifetime.SCOPED }),
  apiService: asClass(ApiService, { lifetime: Lifetime.SINGLETON })
})

beforeAll(async () => {
  if (env.knexPg.connection.database !== 'ia-core-test') {
    process.exit('SOLO USAR BASE DE DATOS DE TEST')
  }
  try {
    await migrator.truncate()
    await migrator.addUser(migrator.aUser1)
    await migrator.addUser(migrator.aUser2)
  } catch (error) {
    console.warn({ 'BEFOREALL ERROR': error })
  }
})

// API helper to make it easier to test endpoints.
export async function apiHelper(verb, path, data, headers) {
  const server = await startServer()
  const baseURL = `http://127.0.0.1:${server.address().port}`
  let h = {}

  if (!headers) {
    h['x-tracer-user-id'] = migrator.aUser1.id
    h['x-tracer-session-id'] = 'test-session'
    h['x-tracer-request-id'] = 555
    h['x-tracer-systems'] = '@nomikos/ia-post-api'
    h.Authorization = 'usando env === test en middleware'
  } else {
    h = headers
  }

  // console.warn({ 'LOGGING h': h })

  const client = axios.create({
    baseURL,
    headers: {
      common: h
    }
  })

  switch (verb) {
    case 'get':
      return client.get(path, { params: data }).then((r) => r.data)
    case 'post':
      return client.post(path, data).then((r) => r.data)
    case 'delete':
      return client.delete(path, { params: data }).then((r) => r.data)
  }
}

const startServer = memoize(async () => {
  return (await createServer(container)).listen()
})

afterAll(async () => {
  // Server is memoized so it won't start a new one.
  // We need to close it.
  coreDb.destroy()
  const server = await startServer()
  return new Promise((resolve) => server.close(resolve))
})
