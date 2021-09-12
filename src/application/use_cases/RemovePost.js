import Operation from '@/application/Operation'
const { Assertion } = require('@/infrastructure/lib/support')

class RemovePost extends Operation {
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
    const postId = Assertion.isPositive(+query.postId, 'Falta postId')

    const { SUCCESS, ERROR, FORBIDDEN, NOT_FOUND } = this.outputs

    try {
      // Get post
      const post = await this.coreRepo.getPost(postId)

      if (!post) {
        return this.emit(NOT_FOUND)
      }

      if (post.author_id !== userId) {
        this.logger.info(
          `El usuario ${userId} no es el autor del post ${postId}, Borrado abortado.`
        )
        return this.emit(FORBIDDEN)
      }

      await this.coreRepo.removePost(postId)
      this.logger.info(`Post ${postId} removido`)

      // Encolar evento
      await this.amqpWriterService.sender('task.post.removeWallPost.q', {
        postId,
        userId
      })

      return this.emit(SUCCESS)
    } catch (error) {
      return this.emit(ERROR, error)
    }
  }
}

RemovePost.setOutputs()
export default RemovePost
