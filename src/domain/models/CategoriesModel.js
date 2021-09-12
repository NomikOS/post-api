import BaseModel from './BaseModel'
import { categoriesIds } from '@nomikos/module-ia-support'
const Joi = require('joi')

const catids = Object.keys(categoriesIds).map((item) => {
  return categoriesIds[item]
})

const schema = {
  categories: Joi.array()
    .items(
      Joi.object().keys({
        category_id: Joi.number().valid(catids),
        // Se llena una vez  se inserta post
        post_id: Joi.number().allow(null)
      })
    )
    .required()
}

export default class CategoriesModel extends BaseModel {
  validate() {
    return super.validate(schema)
  }
}
