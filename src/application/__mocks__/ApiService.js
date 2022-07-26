const qs = require('qs')

export default class ApiService {
  sse(logger, payload) {
    return new Promise((resolve, reject) => {
      logger.info('(mock) Envio a sse service OK', payload)
      return resolve()
    })
  }
}

export function params(options) {
  return {
    params: options,
    paramsSerializer: (params) => {
      return qs.stringify(params)
    }
  }
}
