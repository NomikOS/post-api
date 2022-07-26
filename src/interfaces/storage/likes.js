/**
 * @see https://brandur.org/idempotency-keys
 * Implementing Stripe-like Idempotency Keys in Postgres
 * para super implementacion
 */
export default {
  getMyPostOptions(postId, userId, coreDb) {
    return coreDb('post_options')
      .where({ post_id: postId, user_id: userId })
      .first()
  },

  likePost: (postId, userId, coreDb) => {
    const sql = `
    INSERT INTO post_options (post_id, user_id, liked)
    VALUES (:postId, :userId, true)
    ON CONFLICT (post_id, user_id) DO UPDATE SET liked = true
   `
    return coreDb
      .raw(sql, {
        postId: postId,
        userId: userId
      })
      .then(() => {
        return coreDb('post_options')
          .where({ post_id: postId })
          .where({ liked: true })
          .count()
          .first()
          .then((c) => {
            return c.count
          })
      })
  },

  unlikePost: (postId, userId, coreDb) => {
    return coreDb('post_options')
      .where({ post_id: postId, user_id: userId })
      .update({ liked: false })
      .then(() => {
        return coreDb('post_options')
          .where({ post_id: postId })
          .where({ liked: true })
          .count()
          .first()
          .then((c) => {
            return c.count
          })
      })
  },

  getMyEntryLike(entryId, userId, coreDb) {
    return coreDb('entry_likes').where({ entry_id: entryId, user_id: userId })
  },

  likeEntry: (entryId, userId, coreDb) => {
    const sql = `
    INSERT INTO entry_likes (post_id, entry_id, user_id) VALUES (
    (SELECT post_id FROM user_entries WHERE id = :entryId), :entryId, :userId)
    ON CONFLICT DO NOTHING
    `
    return coreDb
      .raw(sql, {
        entryId: entryId,
        userId: userId
      })
      .then(() => {
        return coreDb('entry_likes')
          .where({ entry_id: entryId })
          .count()
          .first()
          .then((c) => {
            return c.count
          })
      })
  },

  unlikeEntry: (entryId, userId, coreDb) => {
    return coreDb('entry_likes')
      .where({ entry_id: entryId, user_id: userId })
      .del()
      .then(() => {
        return coreDb('entry_likes')
          .where({ entry_id: entryId })
          .count()
          .first()
          .then((c) => {
            return c.count
          })
      })
  }

  // FIX: trx rn index es caro
  // likeWallPost: async (postId, coreDb) => {
  //   const trx = await coreDb.transaction()
  //   try {
  //     await trx('index')
  //       .where({ post_id: postId })
  //       .update({
  //         qlikes: trx.raw('?? + 1', ['qlikes'])
  //       })
  //       .then(() => {
  //         return trx('posts')
  //           .where({ post_id: postId })
  //           .update({
  //             qlikes: trx.raw('?? + 1', ['qlikes'])
  //           })
  //       })
  //       .then(trx.commit)
  //   } catch (error) {
  //     trx.rollback()
  //     throw error
  //   }
  // },

  // unlikeWallPost: async (postId, coreDb) => {
  //   const trx = await coreDb.transaction()
  //   try {
  //     await trx('index')
  //       .where({ post_id: postId })
  //       .update({
  //         qlikes: trx.raw('?? - 1', ['qlikes'])
  //       })
  //       .then(() => {
  //         return trx('posts')
  //           .where({ post_id: postId })
  //           .update({
  //             qlikes: trx.raw('?? - 1', ['qlikes'])
  //           })
  //       })
  //       .then(trx.commit)
  //   } catch (error) {
  //     trx.rollback()
  //     throw error
  //   }
  // }
}
