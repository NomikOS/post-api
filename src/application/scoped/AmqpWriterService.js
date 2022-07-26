export default class AmqpWriterService {
  constructor(proxy) {
    this.amqpSender = proxy.amqpSender
    this.tracers = proxy.tracers
    this.logger = proxy.logger
  }

  async sender(queueName, payload) {
    const headers = {
      'x-tracer-session-id': this.tracers.sessionId,
      'x-tracer-user-id': this.tracers.userId,
      'x-tracer-systems': this.tracers.systems
    }
    await this.amqpSender.sendToQueue(
      queueName,
      { payload, headers },
      this.logger
    )
  }
}
