/* eslint-disable no-case-declarations */

export default {
  addPostWithEntries: (post, rows, categories, cid, coreDb) => {
    let postId
    return coreDb.transaction(async (trx) => {
      return await trx
        .raw(
          `
          WITH cte_user_posts AS(
            INSERT INTO user_posts (
              author_id,
              cid,
              body,
              location
              )
            VALUES (
              :author_id,
              :cid,
              :body,
              :location
            )
            ON CONFLICT DO NOTHING
            RETURNING id
          )
          SELECT * FROM cte_user_posts
          UNION
            SELECT id FROM user_posts WHERE
            cid = :cid
          `,
          {
            author_id: post.author_id,
            cid: cid,
            body: post.body,
            location: post.location
          }
        )
        .then((r) => {
          postId = r.rows[0].id
          // Insertar sus entries
          return trx.raw(
            `
            INSERT INTO user_entries (
              post_id,
              type,
              data,
              author_id,
              parent_id
              )
            VALUES (
              :post_id,
              UNNEST(:type::text[]),
              UNNEST(:data::jsonb[]),
              UNNEST(:author_id::int[]),
              UNNEST(:parent_id::int[])
            )
            ON CONFLICT DO NOTHING
           `,
            {
              post_id: postId,
              type: rows.type,
              data: rows.data,
              author_id: rows.author_id,
              parent_id: rows.parent_id
            }
          )
        })
        .then(() => {
          // Insertar sus categories
          return trx.raw(
            `
            INSERT INTO posts_categories (
              post_id,
              category_id
              )
            VALUES (
              :post_id,
              UNNEST(:category_id::int[])
            )
            ON CONFLICT DO NOTHING
           `,
            {
              post_id: postId,
              category_id: categories.category_id
            }
          )
        })
        .then(() => {
          return { postId }
        })
    })
  },

  optionsPost: (postId, userId, options, coreDb) => {
    const notify = options.notify
    const bookmarked = options.bookmarked
    let sql

    switch (true) {
      case typeof notify !== 'undefined' && typeof bookmarked !== 'undefined':
        sql = `
      INSERT INTO post_options (post_id, user_id, bookmarked, notify)
      VALUES (:postId, :userId, :bookmarked, :notify)
      ON CONFLICT (post_id, user_id) DO UPDATE SET
      bookmarked = :bookmarked, notify = :notify
      `
        return coreDb
          .raw(sql, { postId, userId, bookmarked, notify })
          .then((r) => {
            return r.rowCount
          })

      case typeof notify !== 'undefined':
        sql = `
      INSERT INTO post_options (post_id, user_id, notify)
      VALUES (:postId, :userId, :notify)
      ON CONFLICT (post_id, user_id) DO UPDATE SET
      notify = :notify
      `
        return coreDb.raw(sql, { postId, userId, notify }).then((r) => {
          return r.rowCount
        })

      case typeof bookmarked !== 'undefined':
        sql = `
      INSERT INTO post_options (post_id, user_id, bookmarked)
      VALUES (:postId, :userId, :bookmarked)
      ON CONFLICT (post_id, user_id) DO UPDATE SET
      bookmarked = :bookmarked
      `
        return coreDb.raw(sql, { postId, userId, bookmarked }).then((r) => {
          return r.rowCount
        })
    }
  }
}
