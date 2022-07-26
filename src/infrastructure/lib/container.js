import {
  createContainer,
  Lifetime,
  InjectionMode,
  asValue,
  asClass
} from 'awilix'
import { coreDb } from '@/infrastructure/lib/support.js'
import {
  LoggerInstancer,
  AmqpReceiver,
  AmqpSender,
  Emailer
} from '@/infrastructure/lib/support'
import CoreRepositoryPostgres from '@/interfaces/storage/CoreRepositoryPostgres'
import Procedures from '@/application/Procedures'

/**
 * Using Awilix, the following files and folders (glob patterns)
 * will be loaded.
 */
const modulesToLoad = [
  // Services should be scoped to the request.
  // This means that each request gets a separate instance
  // of a service.
  ['application/singletons/*.js', Lifetime.SINGLETON],
  ['application/scoped/*.js', Lifetime.SCOPED],
  ['interfaces/controllers/*.js', Lifetime.SCOPED],
  ['application/use_cases/api/*.js', Lifetime.SCOPED],
  ['application/use_cases/*.js', Lifetime.SCOPED]
]

/**
 * Configures a new container.
 * @return {Object} The container.
 */
export function configureContainer() {
  const opts = {
    injectionMode: InjectionMode.PROXY
  }
  return createContainer(opts)
    .loadModules(modulesToLoad, {
      // modulesToLoad paths should be relative to this file's
      // parent directory.
      cwd: `${__dirname}/../..`,
      formatName: 'camelCase'
    })
    .register({
      procedures: asClass(Procedures, { lifetime: Lifetime.SINGLETON }),
      coreDb: asValue(coreDb),
      coreRepo: asClass(CoreRepositoryPostgres, {
        lifetime: Lifetime.SINGLETON
      }),
      amqpReceiver: asValue(AmqpReceiver),
      amqpSender: asValue(AmqpSender),
      emailer: asValue(Emailer),
      loggerRoot: asClass(LoggerInstancer, { lifetime: Lifetime.SINGLETON }),
      logger: asClass(LoggerInstancer, { lifetime: Lifetime.SCOPED })
    })
}
