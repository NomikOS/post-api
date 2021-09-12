// /* eslint-disable promise/no-nesting */
// /* eslint-disable promise/always-return */
import likes from './likes'
import posts from './posts'
const moment = require('moment')

export default class CoreRepositoryPostgres {
  constructor({ coreDb }) {
    this.coreDb = coreDb
  }

  getMyPostOptions(postId, userId) {
    return likes.getMyPostOptions(postId, userId, this.coreDb)
  }

  likePost(postId, userId) {
    return likes.likePost(postId, userId, this.coreDb)
  }

  unlikePost(postId, userId) {
    return likes.unlikePost(postId, userId, this.coreDb)
  }

  optionsPost(postId, userId, options) {
    return posts.optionsPost(postId, userId, options, this.coreDb)
  }

  addPostWithEntries(post, entries, categories, cid) {
    return posts.addPostWithEntries(
      post,
      entries,
      categories,
      cid,
      this.coreDb
    )
  }

  addEntry(data, cid) {
    return this.coreDb
      .raw(
        `
    WITH cte_user_entries AS(
      INSERT INTO user_entries (
        author_id,
        cid,
        data,
        parent_id,
        post_id,
        type
        )
      VALUES (
        :author_id,
        :cid,
        :data,
        :parent_id,
        :post_id,
        :type
      )
      ON CONFLICT DO NOTHING
      RETURNING id
    )
    SELECT * FROM cte_user_entries
    UNION
      SELECT id FROM user_entries WHERE
      cid = :cid
     `,
        {
          author_id: data.author_id,
          cid: cid,
          data: data.data,
          parent_id: data.parent_id,
          post_id: data.post_id,
          type: data.type
        }
      )
      .then((r) => {
        return r.rows[0].id
      })
  }

  getEntry(entryId) {
    return this.coreDb('user_entries')
      .select([
        'id',
        'created_at',
        'deleted_at',
        'type',
        'data',
        'author_id',
        'post_id',
        'parent_id'
      ])
      .where({ id: entryId })
      .first()
  }

  removePost(postId) {
    const now = moment().format('YYYY-MM-DD HH:mm:ss')
    return this.coreDb.transaction(async (trx) => {
      await trx('user_entries')
        .where({ post_id: postId })
        .update('deleted_at', now)
        .then(() => {
          return trx('user_posts')
            .where({ id: postId })
            .update('deleted_at', now)
        })
    })
  }

  async removeWallPost(postId) {
    const trx = await this.coreDb.transaction()
    try {
      await trx('index')
        .where({ post_id: postId })
        .del()
        .then(() => {
          return trx('posts').where({ post_id: postId }).del()
        })
        .then(trx.commit)
    } catch (error) {
      trx.rollback()
      throw error
    }
  }

  async updateWallPostDelComment(postId, data) {
    const trx = await this.coreDb.transaction()
    let qcomments = 0
    try {
      return await trx('user_entries')
        .where({ post_id: postId })
        .where({ type: 'comment' })
        .where({ deleted_at: null })
        .count()
        .first()
        .then(async (c) => {
          qcomments = c.count
          await trx('index')
            .where({ post_id: postId })
            .update('qcomments', qcomments)
        })
        .then(() => {
          return (
            trx('posts')
              .where({ post_id: postId })
              // Update full por complicacion de users
              .update({
                comments: JSON.stringify(
                  data.entries.filter((v) => v.type === 'comment')
                ),
                users: JSON.stringify(data.users),
                updated_at: moment().format('YYYY-MM-DD HH:mm:ss')
              })
          )
        })
        .then(trx.commit)
        .then(() => {
          return qcomments
        })
    } catch (error) {
      trx.rollback()
      throw error
    }
  }

  getPost(postId) {
    const sql = `
    SELECT
    user_posts.*,
    (CASE WHEN COUNT(user_entries) = 0 THEN NULL
      ELSE
        JSON_AGG(user_entries)
      END) AS entries
    FROM user_posts
    LEFT JOIN user_entries ON user_posts.id = user_entries.post_id
    WHERE user_posts.id = ?
    GROUP BY user_posts.id
    `
    return this.coreDb.raw(sql, [postId]).then((r) => {
      return r.rowCount ? r.rows[0] : null
    })
  }

  getCategories(postId) {
    const sql = `
    SELECT
    categories.name
    FROM categories
    LEFT JOIN posts_categories ON categories.id = posts_categories.category_id
    WHERE posts_categories.post_id = ?
    `
    return this.coreDb.raw(sql, [postId]).then((r) => {
      return r.rowCount ? r.rows : null
    })
  }

  async saveWallRecord(postId, data) {
    await this.coreDb.raw(
      `
      INSERT INTO index (
        post_id,
        post,
        photos,
        users,
        categories
        )
      VALUES (
        :post_id,
        :post,
        :photos,
        :users,
        :categories
      )
      ON CONFLICT DO NOTHING
     `,
      {
        post_id: postId,
        post: data.post,
        photos: JSON.stringify(data.entries),
        users: JSON.stringify(data.users),
        categories: JSON.stringify(data.categories)
      }
    )
    await this.coreDb.raw(
      `
      INSERT INTO posts (
        post_id,
        post,
        photos,
        users,
        categories,
        cid
        )
      VALUES (
        :post_id,
        :post,
        :photos,
        :users,
        :categories,
        :cid
      )
      ON CONFLICT DO NOTHING
     `,
      {
        post_id: postId,
        post: data.post,
        photos: JSON.stringify(data.entries),
        users: JSON.stringify(data.users),
        categories: JSON.stringify(data.categories),
        cid: data.post.cid
      }
    )
  }

  // TODO: hacer tabla solo write/read, no updates
  // seria leer ultimo post_id?
  // Creo que tabla index sí tiene ventajas.
  // Ademas está en una tarea de cola => no implica costo de tiempo de usuario
  async updateWallPostAddComment(postId, data) {
    const trx = await this.coreDb.transaction()
    let qcomments = 0
    try {
      return await trx('user_entries')
        .where({ post_id: postId })
        .where({ type: 'comment' })
        // deleted_at ya lo consideraba
        .where({ deleted_at: null })
        .count()
        .first()
        .then(async (c) => {
          qcomments = c.count
          await trx('index')
            .where({ post_id: postId })
            .update('qcomments', qcomments)
        })
        .then(() => {
          return (
            trx('posts')
              .where({ post_id: postId })
              // Update full por complicacion de users
              .update({
                comments: JSON.stringify(
                  data.entries.filter((v) => v.type === 'comment')
                ),
                users: JSON.stringify(data.users),
                updated_at: moment().format('YYYY-MM-DD HH:mm:ss')
              })
          )
        })
        .then(trx.commit)
        .then(() => {
          return qcomments
        })
    } catch (error) {
      trx.rollback()
      throw error
    }
    // return this.coreDb('posts')
    //   .where({ post_id: postId })
    //   .update({
    //     comments: JSON.stringify(data.entries.filter(v => v.type === 'comment')),
    //     users: JSON.stringify(data.users),
    //     updated_at: moment().format('YYYY-MM-DD HH:mm:ss')
    //   })
  }

  removeEntry(entryId) {
    const now = moment().format('YYYY-MM-DD HH:mm:ss')
    return this.coreDb.transaction(async (trx) => {
      await trx('user_entries')
        .where({ parent_id: entryId })
        .update('deleted_at', now)
        .then(() => {
          return trx('user_entries')
            .where({ id: entryId })
            .update('deleted_at', now)
        })
    })
  }

  getMyEntryLike(entryId, userId) {
    return likes.getMyEntryLike(entryId, userId, this.coreDb)
  }

  likeEntry(entryId, userId) {
    return likes.likeEntry(entryId, userId, this.coreDb)
  }

  unlikeEntry(entryId, userId) {
    return likes.unlikeEntry(entryId, userId, this.coreDb)
  }

  async likeWallPost(postId, qlikes) {
    const trx = await this.coreDb.transaction()
    try {
      await trx('index')
        .where({ post_id: postId })
        .update({ qlikes })
        .then(() => {
          return trx('posts')
            .where({
              post_id: postId
            })
            .update({ qlikes })
        })
        .then(trx.commit)
    } catch (error) {
      trx.rollback()
      throw error
    }
  }

  async unlikeWallPost(postId, qlikes) {
    const trx = await this.coreDb.transaction()
    try {
      await trx('index')
        .where({ post_id: postId })
        .update({ qlikes })
        .then(() => {
          return trx('posts')
            .where({
              post_id: postId
            })
            .update({ qlikes })
        })
        .then(trx.commit)
    } catch (error) {
      trx.rollback()
      throw error
    }
  }

  async getPostByEntry(entryId) {
    let postId = null
    // Get postId dado entryId
    const r = await this.coreDb('user_entries')
      .where({ id: entryId })
      .first()
      .select('post_id')
    if (r) {
      postId = r.post_id
      // Devolver post dado postId
      return this.getPost(postId)
    }
    return null
  }

  async getPostIdByEntryId(entryId) {
    const r = await this.coreDb('user_entries')
      .where({ id: entryId })
      .first()
      .select('post_id')
    if (r) {
      return r.post_id
    }
    return null
  }

  getUsers(users) {
    return this.coreDb('users').whereIn('id', users).select(
      this.coreDb.raw(`
      id,
      name,
      photo->'min' AS photo
      `)
    )
  }

  getUser(userId) {
    return this.coreDb('users')
      .where('id', userId)
      .select(
        this.coreDb.raw(`
      id,
      name,
      photo->'min' AS photo,
      options
      `)
      )
      .first()
  }

  getNotificationToken(userId) {
    return this.coreDb('users')
      .where('id', userId)
      .select(['notification_token'])
      .first()
      .then((r) => {
        return r ? r.notification_token : ''
      })
  }

  getUserEntries(postId) {
    return (
      this.coreDb('user_entries')
        .where('post_id', postId)
        // .where('type', postId)
        .select(['id', 'type', 'parent_id', 'author_id'])
    )
  }

  getUserPostOptions(postId, userId) {
    return this.coreDb('post_options')
      .where('post_id', postId)
      .where('user_id', userId)
      .first()
  }

  getPostAuthor(postId) {
    return this.coreDb('user_posts')
      .select(['id', 'author_id'])
      .where({ id: postId })
      .first()
  }

  // Copia de saveOptions (options, userId) en user-account-api
  // TODO: encolar a ese service
  saveOptionsAuthor(options, userId) {
    return this.coreDb('users').where({ id: userId }).update({ options })
  }

  getPostForHistory(postId) {
    return this.coreDb
      .where('post_id', postId)
      .select(
        this.coreDb.raw(`
      post->'id' AS id,
      post->'author_id' AS author_id,
      post->'body' AS body,
      post->'location' AS location,
      posts.photos->0->'data'->'med' AS photo
      `)
      )
      .from('posts')
      .first()
      .then((r) => {
        return r
      })
  }

  getCommentForHistory(entryId) {
    return this.coreDb('user_entries')
      .where('id', entryId)
      .select(['id', 'author_id', 'data'])
      .first()
  }

  getPostRemoved(postId) {
    return this.coreDb('user_posts')
      .where('id', postId)
      .select([
        'id',
        'created_at',
        'deleted_at',
        'body',
        'author_id',
        'location'
      ])
      .first()
  }

  saveHistory(data) {
    return this.coreDb('history').insert(data).returning('*')
  }

  saveNotifications(data) {
    return this.coreDb('notifications')
      .insert(data)
      .returning('*')
      .then((r) => {
        return Array.isArray(r) ? r : []
      })
  }
}
