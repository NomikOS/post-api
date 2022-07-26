/**
 * Idempotencia
 * Testeable: Funciones de proceso que devuelven estructuras de datos
 * listas para guardar en db o enviar a cola
 * Diagramas de fácil acceso: en docs autogenerados?
 *
 */
import Operation from '@/application/Operation'
const { Assertion } = require('@/infrastructure/lib/support')

class LikeEntry extends Operation {
  constructor(proxy) {
    super()
    this.coreRepo = proxy.coreRepo
    this.userId = proxy.userId
    this.logger = proxy.logger
    this.loggerRoot = proxy.loggerRoot
    this.updaterService = proxy.updaterService
  }

  /**
   * Maneja casos de like y unlike de comentarios   *
   * @param {*} input
   */
  async execute(input) {
    // Invariantes
    const userId = Assertion.isPositive(this.userId, 'Falta userId')
    const entryId = Assertion.isPositive(input.entryId, 'Falta entryId')
    // postId dado para evitar db call
    const postId = Assertion.isPositive(input.postId, 'Falta postId')

    const { SUCCESS, ERROR } = this.outputs

    try {
      const entry = await this.coreRepo.getEntry(entryId)
      Assertion.isObject(entry, `No existe entry dado entryId ${entryId}`)

      const myEntryLike = await this.coreRepo.getMyEntryLike(entryId, userId)

      const alreadyLiked = !!myEntryLike.length
      this.logger.info(`Comentario ${entryId} ya gustado?: ${alreadyLiked}`)

      await (alreadyLiked
        ? this.unlike(entryId, userId, postId)
        : this.like(entryId, userId, entry, postId))

      return this.emit(SUCCESS)
    } catch (error) {
      return this.emit(ERROR, error)
    }
  }

  /**
   * Like comments
   * @param {*} entryId
   * @param {*} userId
   * @param {*} entry
   * @param {*} postId
   */
  async like(entryId, userId, entry, postId) {
    const event = 'liked'
    const recipientIds = []

    const qlikes = await this.coreRepo.likeEntry(entryId, userId)
    this.logger.info(`Comentario ${entryId} gustado`)

    // Solo notificar likesy solo a autor del comentario si no soy yo mismo
    if (userId !== entry.author_id) {
      recipientIds.push(entry.author_id)
    }

    // Segundario (catch errors)
    await this.updaterService
      .sender(`event.entry-${event}.q`, {
        type: 'comment',
        event,
        postId,
        entryId,
        recipientIds,
        userId,
        metaData: { qlikes }
      })
      .catch((e) => this.loggerRoot.e(e, this.logger))

    return event
  }

  /**
   * Unlike comment
   * @param {*} entryId
   * @param {*} userId
   */
  async unlike(entryId, userId, postId) {
    const event = 'unliked'

    const qlikes = await this.coreRepo.unlikeEntry(entryId, userId)
    this.logger.info(`Comentario ${entryId} degustado`)

    // Segundario (catch errors)
    await this.updaterService
      .sender(`event.entry-${event}.q`, {
        type: 'comment',
        event,
        postId,
        entryId,
        userId,
        metaData: { qlikes }
      })
      .catch((e) => this.loggerRoot.e(e, this.logger))

    return event
  }
}

LikeEntry.setOutputs()
export default LikeEntry
