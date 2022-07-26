import BaseModel from './BaseModel'
const Joi = require('joi')

const schema = {
  body: Joi.string().optional().allow('').max(512),
  location: Joi.object()
    .keys({
      coords: Joi.string().required(),
      address: Joi.string().required(),
      street: Joi.string().required(),
      city: Joi.string().required(),
      commune: Joi.string().allow('').optional(),
      mapName: Joi.string().required()
    })
    .required(),
  author_id: Joi.number().positive().required()
}

export default class CreatePostModel extends BaseModel {
  validate() {
    return super.validate(schema)
  }
}
