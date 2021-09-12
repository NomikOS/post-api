import Operation from '@/application/Operation'
const { Assertion } = require('@/infrastructure/lib/support')

class LikePost extends Operation {
  constructor(proxy) {
    super()
    this.coreRepo = proxy.coreRepo
    this.userId = proxy.userId
    this.logger = proxy.logger
    this.amqpWriterService = proxy.amqpWriterService
  }

  async execute(input) {
    // Invariantes
    const userId = Assertion.isPositive(this.userId, 'Falta userId')
    const postId = Assertion.isPositive(input.postId, 'Falta postId')

    const { SUCCESS, ERROR } = this.outputs

    try {
      const post = await this.coreRepo.getPost(postId)
      Assertion.isObject(post, `No existe post dado postId ${postId}`)

      const recipientIds = []
      let action
      let qlikes = 0

      const opt = await this.coreRepo.getMyPostOptions(postId, userId)
      const alreadyLiked = !!(opt && opt.liked)
      this.logger.info(`Post ${postId} alreadyLiked: ${alreadyLiked}`)

      if (alreadyLiked) {
        action = 'unlike'

        qlikes = await this.coreRepo.unlikePost(postId, userId)
        this.logger.info(`Post ${postId} degustado`)
      } else {
        action = 'like'

        qlikes = await this.coreRepo.likePost(postId, userId)
        this.logger.info(`Post ${postId} gustado`)

        // Solo notificar likes
        // Y solo a autor del post si no soy yo mismo
        if (userId !== post.author_id) {
          recipientIds.push(post.author_id)
        }
      }

      // Encolar evento
      await this.amqpWriterService.sender(`task.post.${action}WallPost.q`, {
        postId,
        userId,
        recipientIds,
        metaData: { qlikes }
      })

      return this.emit(SUCCESS)
    } catch (error) {
      return this.emit(ERROR, error)
    }
  }
}

LikePost.setOutputs()
export default LikePost
