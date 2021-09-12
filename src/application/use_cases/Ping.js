import Operation from '@/application/Operation'

class Ping extends Operation {
  constructor(proxy) {
    super()
  }

  async execute(query) {
    const { SUCCESS } = this.outputs
    return this.emit(SUCCESS)
  }
}

Ping.setOutputs()
export default Ping
