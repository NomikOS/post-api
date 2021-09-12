import Operation from '@/application/Operation'
import OptionsPostModel from '@/domain/models/OptionsPostModel'
const { Assertion } = require('@/infrastructure/lib/support')

class OptionsPost extends Operation {
  constructor(proxy) {
    super()
    this.coreRepo = proxy.coreRepo
    this.userId = proxy.userId
    this.logger = proxy.logger
    this.loggerRoot = proxy.loggerRoot
    this.apiService = proxy.apiService
  }

  async execute(input) {
    // Invariantes
    const userId = Assertion.isPositive(this.userId, 'Falta userId')
    const postId = Assertion.isPositive(input.postId, 'Falta postId')
    const options = Assertion.isObject(input.options, 'Falta options')

    const { SUCCESS, ERROR, VALIDATION_ERROR } = this.outputs

    const model = new OptionsPostModel({ options })

    const errorValidation = model.validate()
    if (errorValidation) {
      return this.emit(VALIDATION_ERROR, errorValidation)
    }

    try {
      const post = await this.coreRepo.getPost(postId)
      Assertion.isObject(post, `No existe post dado postId ${postId}`)

      // Guardar opciones del post
      await this.coreRepo.optionsPost(postId, userId, options)

      this.logger.info(
        `Post ${postId} opciones guardadas por usuario ${userId}`
      )

      const message = {
        data: {
          target: 'tasks',
          userId: userId,
          jsonData: JSON.stringify({
            type: 'post',
            event: 'options-updated',
            task_data: {
              input: { postId, options }
            }
          })
        },
        channel: 'users'
      }

      // Segundario (catch errors)
      // No need updaterService, pq target: 'tasks'
      await this.apiService
        .sse(this.logger, message)
        .catch((e) => this.loggerRoot.e(e, this.logger))

      return this.emit(SUCCESS)
    } catch (error) {
      return this.emit(ERROR, error)
    }
  }
}

OptionsPost.setOutputs()
export default OptionsPost
