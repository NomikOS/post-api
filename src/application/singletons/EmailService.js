import { env } from '@/infrastructure/lib/env'
const NODE_ENV = env.NODE_ENV

export default class EmailService {
  constructor(proxy) {
    this.emailer = proxy.emailer
  }

  async sendtoMe(logger, postId) {
    let link = ''
    if (NODE_ENV === 'local' || NODE_ENV === 'test') {
      link = `http://localhost/post/${postId}`
    } else if (NODE_ENV === 'testing') {
      link = `https://testing.incidentesaislados.cl/post/${postId}`
    } else {
      link = `https://incidentesaislados.cl/post/${postId}`
    }
    await this.emailer.send(logger, {
      from: 'usuario3@gmail.com',
      to: 'usuario3@gmail.com',
      subject: `Nuevo post #${postId}`,
      text: `Nuevo post #${postId} en ${link}`
    })
  }
}
