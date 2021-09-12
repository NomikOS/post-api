import { coreDb } from '@/infrastructure/lib/support.js'
import CoreRepo from '@/interfaces/storage/CoreRepositoryPostgres'

const postId = 441
const userId = 77
let db

beforeAll(() => {
  db = new CoreRepo({ coreDb })
})

describe('Pruebas DB', () => {
  it('likePost', async () => {
    const r = await db.likePost(postId, userId)
    console.warn('r', r)
  })
})
