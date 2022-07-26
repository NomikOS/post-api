import Operation from '@/application/Operation'
import CreatePostModel from '@/domain/models/CreatePostModel'
import CategoriesModel from '@/domain/models/CategoriesModel'
import CreateEntryModel from '@/domain/models/CreateEntryModel'
import { categoriesIds } from '@nomikos/module-ia-support'
const { Assertion } = require('@/infrastructure/lib/support')

class CreatePost extends Operation {
  constructor(proxy) {
    super()
    this.coreRepo = proxy.coreRepo
    this.userId = proxy.userId
    this.logger = proxy.logger
    this.amqpWriterService = proxy.amqpWriterService
    this.emailService = proxy.emailService
  }

  async execute(input) {
    const post = Assertion.isObject(input.post, 'Falta post')
    const entries = Assertion.isArray(input.entries, 'Falta entries')
    const categories = Assertion.isArray(input.categories, 'Falta categories')
    const cid = Assertion.isString(input.cid, 'Falta cid')

    const userId = this.userId

    let result
    let errorValidation
    const { SUCCESS, ERROR, VALIDATION_ERROR } = this.outputs

    const postModel = new CreatePostModel({
      body: post.body.trim(),
      location: post.location,
      author_id: userId
    })

    errorValidation = postModel.validate()
    if (errorValidation) {
      return this.emit(VALIDATION_ERROR, errorValidation)
    }

    const categoriesModel = new CategoriesModel({
      categories: categories.map((category) => ({
        category_id: categoriesIds[category],
        post_id: null
      }))
    })

    errorValidation = categoriesModel.validate()
    if (errorValidation) {
      return this.emit(VALIDATION_ERROR, errorValidation)
    }

    try {
      let errorsEntries = null

      const rows = {}
      rows.type = []
      rows.data = []
      rows.author_id = []
      rows.parent_id = []

      // Recorrer entries y configurar para su validacion
      entries.forEach((entry) => {
        const model = new CreateEntryModel({
          _action: 'create',
          type: entry.type,
          data: entry.data,
          author_id: userId,
          parent_id: null
        })

        // Validar
        errorsEntries = model.validate()
        if (errorsEntries) {
          return
        }

        // Fill structura adecuada para usar unnest de pg
        rows.type.push(model.type)
        rows.data.push(model.data)
        rows.author_id.push(model.author_id)
        rows.parent_id.push(model.parent_id)
      })

      if (errorsEntries) {
        return this.emit(VALIDATION_ERROR, errorsEntries)
      }

      const categories = {}
      categories.post_id = []
      categories.category_id = []

      categoriesModel.categories.forEach((item) => {
        categories.post_id.push(item.post_id)
        categories.category_id.push(item.category_id)
      })

      this.logger.info({
        'Creando post:': {
          postModel,
          rows,
          categories: categories,
          cid: cid
        }
      })

      // Add a DB
      result = await this.coreRepo.addPostWithEntries(
        postModel,
        rows,
        categories,
        cid
      )

      const postId = result.postId

      this.logger.info(`Nuevo post ${postId} creado`)

      // Hacer option por defecto de nuevos posts de notify a all,
      // total para eso ahora se pueden configurar los intervalos pn en pwa
      const options = {
        bookmarked: false,
        notify: 'all'
      }

      this.logger.info({
        'Agregando options del post:': {
          postId,
          userId,
          options
        }
      })

      // Guardar opciones del post
      await this.coreRepo.optionsPost(postId, userId, options)

      // Guardar opciones del autor en tabla users
      const user = await this.coreRepo.getUser(userId)
      let userOptions = user.options

      // Guardar lastLocation para empezar ahi en los nuevos posts
      if (userOptions === null || !userOptions) {
        userOptions = {}
      }
      userOptions.lastLocation = postModel.location

      this.logger.info({
        'Actualizando opciones del autor:': {
          userOptions,
          userId: this.userId
        }
      })

      await this.coreRepo.saveOptionsAuthor(userOptions, this.userId)

      // Encolar evento
      await this.amqpWriterService.sender('task.post.saveWallPost.q', {
        postId,
        userId
      })

      // Encolar evento
      await this.amqpWriterService.sender('task.post.buildLocationMap.q', {
        mapName: postModel.location.mapName,
        coords: postModel.location.coords
      })

      await this.emailService.sendtoMe(this.logger, postId)

      return this.emit(SUCCESS, { postId, meta: { userOptions } })
    } catch (error) {
      return this.emit(ERROR, error)
    }
  }
}

CreatePost.setOutputs()
export default CreatePost
