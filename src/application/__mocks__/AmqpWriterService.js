export default class AmqpWriterService {
  constructor(proxy) {
    this.amqpSender = proxy.amqpSender
    this.tracers = proxy.tracers
    this.logger = proxy.logger
  }

  sender(queueName, payload) {
    const headers = {
      'x-tracer-session-id': this.tracers.sessionId,
      'x-tracer-user-id': this.tracers.userId,
      'x-tracer-systems': this.tracers.systems
    }
    return new Promise((resolve, reject) => {
      this.logger.info('(mock) Encolamiento AMQP OK', {
        queueName,
        data: { payload, headers }
      })
      return resolve()
    })
  }

  // const {appendFile} = require('fs').promises
  // sender (queueName, payload) {
  //   const headers = {
  //     'x-tracer-session-id': this.tracers.sessionId,
  //     'x-tracer-user-id': this.tracers.userId,
  //     'x-tracer-systems': this.tracers.systems
  //   }
  //   return new Promise((resolve, reject) => {
  //     const x = JSON.stringify({queueName, data: {payload, headers}})
  //     // Crea file para pruebas de workers a realizar despues de terminar
  //     // test con jest.
  //     return appendFile('./src/__tests__/queueData.json', x + '\n')
  //       .then(() => {
  //         this.logger.info('(mock) Encolamiento AMQP OK', {
  //           queueName, data: {payload, headers}
  //         })
  //         return resolve()
  //       })
  //   })
  // }
}
