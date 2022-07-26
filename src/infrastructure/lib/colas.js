// const util = require('util')
const commonOptions = {
  options: {
    arguments: {},
    durable: true
  },
  prefetch: 1
}

// Down to earth
var colas = {
  receiver: {
    'task.post.saveWallPost.q': {
      ...commonOptions,
      options: {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': 'direct.dead-letter.exc',
          'x-dead-letter-routing-key': 'task.post.saveWallPost.q.dl'
        }
      },
      workerName: 'postWorker',
      method: 'saveWallPost'
    },
    'task.post.removeWallPost.q': {
      ...commonOptions,
      options: {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': 'direct.dead-letter.exc',
          'x-dead-letter-routing-key': 'task.post.removeWallPost.q.dl'
        }
      },
      workerName: 'postWorker',
      method: 'removeWallPost'
    },
    'task.post.likeWallPost.q': {
      ...commonOptions,
      options: {
        arguments: {
          durable: true,
          'x-dead-letter-exchange': 'direct.dead-letter.exc',
          'x-dead-letter-routing-key': 'task.post.likeWallPost.q.dl'
        }
      },
      workerName: 'postWorker',
      method: 'likeWallPost'
    },
    'task.post.unlikeWallPost.q': {
      ...commonOptions,
      options: {
        arguments: {
          durable: true,
          'x-dead-letter-exchange': 'direct.dead-letter.exc',
          'x-dead-letter-routing-key': 'task.post.unlikeWallPost.q.dl'
        }
      },
      workerName: 'postWorker',
      method: 'unlikeWallPost'
    },
    'task.post.updateWallPostAddComment.q': {
      ...commonOptions,
      options: {
        arguments: {
          durable: true,
          'x-dead-letter-exchange': 'direct.dead-letter.exc',
          'x-dead-letter-routing-key':
            'task.post.updateWallPostAddComment.q.dl'
        }
      },
      workerName: 'postWorker',
      method: 'updateWallPostAddComment'
    },
    'task.post.updateWallPostDelComment.q': {
      ...commonOptions,
      options: {
        arguments: {
          durable: true,
          'x-dead-letter-exchange': 'direct.dead-letter.exc',
          'x-dead-letter-routing-key':
            'task.post.updateWallPostDelComment.q.dl'
        }
      },
      workerName: 'postWorker',
      method: 'updateWallPostDelComment'
    },
    'task.post.buildLocationMap.q': {
      ...commonOptions,
      options: {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': 'direct.dead-letter.exc',
          'x-dead-letter-routing-key': 'task.post.buildLocationMap.q.dl'
        }
      },
      workerName: 'postWorker',
      method: 'buildLocationMap'
    }
  },
  // Ahora se usa apiService
  sender: {
    'task.sse.transmit.q': commonOptions
  }
}

// console.warn(util.inspect(colas, false, null, true))
export { colas }
