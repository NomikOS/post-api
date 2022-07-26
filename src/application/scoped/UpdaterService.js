const { Assertion } = require('@/infrastructure/lib/support')

export default class UpdaterService {
  constructor(proxy) {
    this.apiService = proxy.apiService
    this.coreRepo = proxy.coreRepo
    this.logger = proxy.logger
  }

  async sender(queueName, input) {
    this.logger.info('Datos para updater:', { queueName, input })

    this.postId = Assertion.isPositive(input.postId, 'Falta postId')
    this.userId = Assertion.isPositive(input.userId, 'Falta userId')
    this.type = Assertion.isString(input.type, 'Falta type')
    this.event = Assertion.isString(input.event, 'Falta event')

    // Al crear comentario tiene los ids de autor del
    // post y del comentario siendo comentado
    this.recipientIds = Array.isArray(input.recipientIds)
      ? input.recipientIds
      : []

    this.entryId = input.entryId || null

    // Contenedor multiuso
    this.metaData = input.metaData || {}

    let moreData = null

    // My data
    const whoami = await this.coreRepo.getUser(this.userId)
    this.logger.info('whoami', whoami)

    switch (queueName) {
      case 'event.wall-post-liked.q':
      case 'event.wall-post-unliked.q': {
        // Set autor del like para mostrar my_like
        moreData = {
          authorData: {
            id: whoami.id,
            name: whoami.name,
            photo: whoami.photo
          }
        }
        break
      }
      case 'event.entry-liked.q':
      case 'event.entry-unliked.q':
      case 'event.wall-entry-removed.q':
        moreData = { entry_id: this.entryId }

        if (
          ['event.entry-liked.q', 'event.entry-unliked.q'].includes(queueName)
        ) {
          moreData.authorData = {
            id: whoami.id,
            name: whoami.name,
            photo: whoami.photo
          }
        }
        break
      case 'event.wall-entry-created.q':
        // Payload seteado en UpdateWallPostAddComment
        moreData = {
          entry_id: this.entryId,
          record: input.commentRecord,
          users: input.commentUsers
        }
        break
    }

    // Common data que siempre debe ir a pwa
    let data = {
      metaData: this.metaData,
      type: this.type,
      event: this.event,
      post_id: this.postId
    }

    if (moreData) {
      data = { ...data, ...moreData }
    }

    // Mensaje para pwa via sse
    // Actualiza stats (qLikes y qComments, myLike)
    // y add/del comentarios
    const message = {
      data: {
        target: 'updater',
        jsonData: JSON.stringify(data)
      },
      channel: 'users'
    }

    await this.apiService.sse(this.logger, message)

    if (!this.recipientIds.length) return

    // Enviar notificaciones a usuarios (campana o pn)
    if (
      [
        'event.entry-liked.q',
        'event.wall-post-liked.q',
        'event.wall-entry-created.q'
      ].includes(queueName)
    ) {
      try {
        await this.enviarNotificaciones(queueName, whoami)
      } catch (error) {
        throw new Error(error) // Me da track a este punto
      }
    }
  }

  /**
   * Seccion para enviar notificaciones a apps via sse
   * @param {*} queueName
   */
  async enviarNotificaciones(queueName, whoami) {
    var { postForHistory, commentForHistory } = await this.getData(
      this.postId,
      this.entryId
    )

    let title = ''
    let event = ''
    let postLocation = {}

    const colas = {
      'event.entry-liked.q': function () {
        event = 'entry-liked'
        title = commentForHistory.data.body
        if (title.length > 128) {
          title = title.substring(0, 128) + '...'
        }

        title = `A ${whoami.name} le gusta tu comentario "${title}"`
      },
      'event.wall-post-liked.q': function () {
        event = 'wall-post-liked'
        title = postForHistory.body
        postLocation = postForHistory.location
        if (title) {
          if (title.length > 128) {
            title = `${title.substring(0, 128)}...`
          }
        } else {
          if (postLocation.address && postLocation.address.length > 128) {
            title = postLocation.address.substring(0, 128) + '...'
          } else {
            title = postLocation.address
          }
        }
        title = `A ${whoami.name} le gusta tu post "${title}"`
      },
      'event.wall-entry-created.q': function () {
        event = 'wall-entry-created'
        title = commentForHistory.data.body
        if (title.length > 128) {
          title = title.substring(0, 128) + '...'
        }
        title = `${whoami.name} ha comentado "${title}"`
      }
    }

    colas[queueName]()

    // this.recipientIds = new Array(1000).fill(2) // To test
    const records = this.recipientIds.map((recipientId) => {
      return {
        type: this.type,
        event: this.event,
        recipient_id: recipientId,
        data: {
          title: title,
          event: event,
          authorData: {
            id: whoami.id,
            name: whoami.name,
            photo: whoami.photo
          },
          postData: {
            id: postForHistory.id,
            photo: postForHistory.photo
          },
          commentData: commentForHistory
            ? {
                id: commentForHistory.id
              }
            : null
        }
      }
    })

    const records2 = await this.coreRepo.saveNotifications(records)

    if (!records2.length) return

    this.logger.info(`records a cola y sse con Promise.all: ${records.length}`)

    let oks = 0
    await Promise.all(
      records2.map(async (record) => {
        const message = {
          data: {
            target: 'notifications',
            userId: record.recipient_id,
            jsonData: JSON.stringify({ record })
          },
          channel: 'users'
        }
        try {
          await this.apiService.sse(this.logger, message)
          oks++
          // Loguea y evita reject fast-fail
        } catch (error) {
          this.logger.info(error.message)
        }
      })
    )

    // Controlar todos ok
    if (oks < records.length) {
      const delta = records.length - oks
      throw new Error(`Fallaron ${delta} de ${records.length} notificaciones.`)
    }
  }

  async getData(postId, entryId = null) {
    let authorId
    let comment = null

    const post = await this.coreRepo.getPostForHistory(postId)

    if (entryId) {
      comment = await this.coreRepo.getCommentForHistory(entryId)
      authorId = comment.author_id
    } else {
      authorId = post.author_id
    }

    const author = await this.coreRepo.getUser(authorId)

    return {
      authorForHistory: author,
      postForHistory: post,
      commentForHistory: comment
    }
  }
}
