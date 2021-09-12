const { ValidationError } = require('@/infrastructure/lib/support')
const { NotFoundError } = require('@/infrastructure/lib/support')
const { UnauthorizedError } = require('@/infrastructure/lib/support')
const { VerboseError } = require('@/infrastructure/lib/support')
const cases = [
  'createPost',
  'removePost',
  'likePost',
  'optionsPost',
  'createEntry',
  'removeEntry',
  'likeEntry',
  'ping',
  'healthcheck'
]

export default class PostController {
  constructor(proxy) {
    this.logger = proxy.logger
    // Inyectar cases
    cases.forEach((v) => {
      this[v] = proxy[v]
    })
  }

  get(useCase, query) {
    return this.default(useCase, query)
  }

  post(useCase, body) {
    return this.default(useCase, body)
  }

  delete(useCase, query) {
    return this.default(useCase, query)
  }

  default(aUseCase, input) {
    if (!cases.includes(aUseCase)) {
      this.logger.info(`El aUseCase: "${aUseCase}" no implementado.`)
      return
    }

    return new Promise((resolve, reject) => {
      const useCase = this[aUseCase]

      const {
        SUCCESS,
        ERROR,
        VALIDATION_ERROR,
        NOT_FOUND,
        UNAUTHORIZED,
        ERROR_VERBOSE
      } = useCase.outputs

      useCase
        .on(SUCCESS, (data) => {
          return resolve(data)
        })
        .on(UNAUTHORIZED, () => {
          reject(new UnauthorizedError())
        })
        .on(NOT_FOUND, () => {
          reject(new NotFoundError())
        })
        .on(VALIDATION_ERROR, (messages) => {
          reject(new ValidationError(messages))
        })
        .on(ERROR_VERBOSE, (error) => {
          reject(new VerboseError(error))
        })
        .on(ERROR, (e) => reject(e))

      useCase.execute(input).catch((e) => reject(e)) // catch todo lo no emitted
    })
  }
}

// const { ValidationError } = require('@/infrastructure/lib/support')
// const { NotFoundError } = require('@/infrastructure/lib/support')
// const { ForbiddenError } = require('@/infrastructure/lib/support')
//
// export default class PostController {
//
//   constructor ({
//     caseCreatePost,
//     caseRemovePost,
//     caseLikePost,
//     caseOptionsPost
//   }) {
//     this.caseCreatePost = caseCreatePost
//     this.caseRemovePost = caseRemovePost
//     this.caseLikePost = caseLikePost
//     this.caseOptionsPost = caseOptionsPost
//   }
//
//   /**
//    * Api post
//    */
//   createPost (body) {
//     return this.default('createPost', body)
//   }
//
//   removePost (body) {
//     return this.default('removePost', body)
//   }
//
//   likePost (body) {
//     return this.default('likePost', body)
//   }
//
//   optionsPost (body) {
//     return this.default('optionsPost', body)
//   }
//
//   default (aUseCase, input, auxObj = {}) {
//
//     const useCase = this['case' + aUseCase
//       .replace(/^./, str => str.toUpperCase())]
//
//     return new Promise((resolve, reject) => {
//       const { SUCCESS, ERROR, VALIDATION_ERROR, NOT_FOUND, FORBIDDEN } = useCase.outputs
//
//       useCase
//         .on(SUCCESS, data => {
//           return resolve(data)
//         })
//         .on(FORBIDDEN, () => {
//           reject(new ForbiddenError())
//         })
//         .on(NOT_FOUND, () => {
//           reject(new NotFoundError())
//         })
//         .on(VALIDATION_ERROR, messages => {
//           reject(new ValidationError(messages))
//         })
//         .on(ERROR, e => reject(e))
//
//       useCase.execute(input, auxObj).catch(e => reject(e)) // catch todo lo no emitted
//     })
//   }
// }
