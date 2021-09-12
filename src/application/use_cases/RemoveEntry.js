import Operation from '@/application/Operation'
const { Assertion } = require('@/infrastructure/lib/support')

class RemoveEntry extends Operation {
  constructor(proxy) {
    super()
    this.coreRepo = proxy.coreRepo
    this.userId = proxy.userId
    this.logger = proxy.logger
    this.amqpWriterService = proxy.amqpWriterService
  }

  async execute(query) {
    // Invariantes
    const userId = Assertion.isPositive(this.userId, 'Falta userId')
    const entryId = Assertion.isPositive(+query.entryId, 'Falta entryId')

    const { SUCCESS, ERROR, FORBIDDEN, NOT_FOUND } = this.outputs

    try {
      // Get entry
      const entry = await this.coreRepo.getEntry(entryId)

      if (!entry) {
        return this.emit(NOT_FOUND)
      }

      if (entry.author_id !== userId) {
        this.logger.info(
          `El usuario ${userId} no es el autor del entry ${entryId}, Borrado abortado.`
        )
        return this.emit(FORBIDDEN)
      }

      const postId = await this.coreRepo.getPostIdByEntryId(entryId)
      Assertion.isPositive(postId, `No existe post dado entryId ${entryId}`)

      await this.coreRepo.removeEntry(entryId)
      this.logger.info(`Entry ${entryId} removido`)

      // Encolar evento
      await this.amqpWriterService.sender(
        'task.post.updateWallPostDelComment.q',
        {
          postId,
          entryId,
          userId
        }
      )

      return this.emit(SUCCESS)
    } catch (error) {
      return this.emit(ERROR, error)
    }
  }
}

RemoveEntry.setOutputs()
export default RemoveEntry
