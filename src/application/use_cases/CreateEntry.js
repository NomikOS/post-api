import Operation from '@/application/Operation'
import CreateEntryModel from '@/domain/models/CreateEntryModel'
import { uniq } from 'lodash'
import { ulid } from '@/infrastructure/lib/utils'
const { Assertion } = require('@/infrastructure/lib/support')

class CreateEntry extends Operation {
  constructor(proxy) {
    super()
    this.coreRepo = proxy.coreRepo
    this.userId = proxy.userId
    this.logger = proxy.logger
    this.amqpWriterService = proxy.amqpWriterService
  }

  async execute(input) {
    // Para prueba de stressing
    let stressing = input.stressing || false
    if (this.userId !== 22) {
      stressing = false
    }

    if (stressing) {
      input.cid = ulid()
      input.data.body = `test comentario ${input.cid}`
    }

    // Invariantes
    const userId = Assertion.isPositive(this.userId, 'Falta userId')
    const postId = Assertion.isPositive(input.postId, 'Falta postId')
    const parentId = Assertion.isPositiveOrNull(
      input.parentId,
      'Falta parentId'
    )
    const cid = Assertion.isString(input.cid, 'Falta cid')

    const { SUCCESS, ERROR, VALIDATION_ERROR, NOT_FOUND } = this.outputs

    try {
      // Get post
      const post = await this.coreRepo.getPostAuthor(postId)

      // TODO add soft delete a posts
      if (!post) {
        return this.emit(NOT_FOUND)
      }

      const commentModel = new CreateEntryModel({
        _action: 'create',
        type: input.type,
        data: input.data,
        author_id: userId,
        parent_id: parentId,
        post_id: postId
      })

      // Validar
      const errorValidation = commentModel.validate()

      // delete _action
      delete commentModel._action

      if (errorValidation) {
        return this.emit(VALIDATION_ERROR, errorValidation)
      }

      let parentEntry = null

      // Para array de autor de post (si no soy yo mismo)
      // y (posible) autor de comentario siendo comentado
      // que deberan ser notificados (segun options de cada usuario)
      let recipientIds = []

      if (userId !== post.author_id) {
        recipientIds.push(post.author_id)
      }

      // Averiguando sobre que esta siendo comentado
      // Y rechequear que comentario no esta borrado
      if (parentId) {
        parentEntry = await this.coreRepo.getEntry(parentId)
        if (parentEntry.deleted_at !== null) {
          return this.emit(
            NOT_FOUND,
            'El comentario siendo respondido ha sido borrado recientemente.'
          )
        }
        // Si no soy autor del parent (photo o comment)
        // El autor de la photo es siempre el autor del post
        if (userId !== parentEntry.author_id) {
          recipientIds.push(parentEntry.author_id)
        }
      }

      // Add a DB
      const entryId = await this.coreRepo.addEntry(commentModel, cid)
      this.logger.info(`Nuevo entry creado ${entryId}`)

      // Hacer option por defecto en el primer comentario de un usuario que no
      // es el autor del post
      if (userId !== post.author_id) {
        const postOptions = await this.coreRepo.getUserPostOptions(
          postId,
          userId
        )

        if (!postOptions) {
          const options = {
            bookmarked: false,
            notify: 'thread' // Solo a conversaciones y fotos que comento
          }

          // Guardar opciones del post
          await this.coreRepo.optionsPost(postId, userId, options)
        }
      }

      recipientIds = uniq(recipientIds)

      // Encolar evento
      await this.amqpWriterService.sender(
        'task.post.updateWallPostAddComment.q',
        { entryId, userId, recipientIds }
      )

      return this.emit(SUCCESS)
    } catch (error) {
      return this.emit(ERROR, error)
    }
  }
}

CreateEntry.setOutputs()
export default CreateEntry
