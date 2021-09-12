import Operation from '@/application/Operation'

class Healthcheck extends Operation {
  constructor(proxy) {
    super()
  }

  async execute() {
    const { SUCCESS } = this.outputs
    return this.emit(SUCCESS)
  }
}

Healthcheck.setOutputs(['SUCCESS'])
export default Healthcheck
