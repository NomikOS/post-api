module.exports = class Procedures {
  constructor({ coreRepo }) {
    this.coreRepo = coreRepo
  }

  /**
   * @param  {[type]}  post               [description]
   * @param  {Boolean} [isDeleting=false] Nulificar body
   * @return {[type]}                     [description]
   */
  buildWallRecord(post, isDeleting = false) {
    // Get entries del post
    const entries = post.entries

    // Dejar post sin entries, que ya los tenemos
    delete post.entries

    // Get todos los users implicados
    let users = []

    users.push(post.author_id) // post autor

    if (Array.isArray(post.readers)) {
      // post readers
      users = users.concat(post.readers)
    }

    if (Array.isArray(entries)) {
      // post users
      entries.forEach((v, i) => {
        users.push(v.author_id) // entry autor
        if (v.deleted_at !== null && isDeleting && v.data.body !== null) {
          entries[i].data.body = null
        }
      })
    }

    users = [...new Set(users)] // unicar

    const record = {
      post,
      entries,
      users
    }

    return record
  }

  async completeWallData(record, postId) {
    // Get all users involved
    const users = await this.coreRepo.getUsers(record.users)

    // Get getCategories
    const categories = await this.coreRepo.getCategories(postId)

    // Completar users full data
    record.users = users

    // Completar categories data
    record.categories = categories.map((item) => item.name)

    return record
  }
}
