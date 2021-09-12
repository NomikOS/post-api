import { apiHelper } from './apiHelper'
import { migrator, helpers } from '@nomikos/module-ia-support'

describe('Api', () => {
  it.only('createPost', async () => {
    const data = migrator.inputPost
    data.cid = '0x0x0x0xx0x0x0'
    const result = await apiHelper('post', 'createPost', data)
    expect(typeof result.postId === 'number').toBe(true)
    expect(result.postId > 0).toBe(true)
  })

  it('likePost', async () => {
    const r1 = await migrator.addPostWithEntries()
    const data = { postId: r1.postId }
    const result = await apiHelper('post', 'likePost', data)
    expect(result === 'OK').toBe(true)
  })

  it('optionsPost', async () => {
    const r1 = await migrator.addPostWithEntries()
    const data = {
      postId: r1.postId,
      options: {
        bookmarked: false,
        notify: 'thread'
      }
    }
    const result = await apiHelper('post', 'optionsPost', data)
    expect(result === 'OK').toBe(true)
  })

  it('removePost', async () => {
    const r1 = await migrator.addPostWithEntries()
    const options = helpers.params({ postId: r1.postId })
    const data = options.params
    const result = await apiHelper('delete', 'removePost', data)
    expect(result === 'OK').toBe(true)
  })

  it('createEntry', async () => {
    const r1 = await migrator.addPostWithEntries()
    const data = {
      stressing: true,
      postId: r1.postId,
      parentId: null,
      cid: '0x0x0x0xx0x0x0',
      type: 'comment',
      data: {
        body: 'Corrupti esse voluptates numquam natus eum error numquam malevolumn.'
      }
    }
    const result = await apiHelper('post', 'createEntry', data)
    expect(result === 'OK').toBe(true)
  })

  it('removeEntry', async () => {
    const r1 = await migrator.addPostWithEntries()
    const r2 = await migrator.getPost(r1.postId)
    const entryId = r2.entries[0].id
    const options = helpers.params({ entryId })
    const data = options.params
    const result = await apiHelper('delete', 'removeEntry', data)
    expect(result === 'OK').toBe(true)
  })

  it('likeEntry (y unLike)', async () => {
    const r1 = await migrator.addPostWithEntries()
    const r2 = await migrator.addComment(r1.postId)
    const data = {
      postId: r1.postId,
      type: 'comment',
      entryId: r2[0]
    }
    await migrator.addPostWall(r1.postId)
    const result = await apiHelper('post', 'likeEntry', data)
    expect(result === 'OK').toBe(true)
  })
})
