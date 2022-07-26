import BaseModel from './BaseModel'
const Joi = require('joi')

const schema = {
  options: Joi.object()
    .keys({
      bookmarked: Joi.boolean().required(),
      notify: Joi.string().required().valid(['none', 'thread', 'all'])
    })
    .required()
}

export default class OptionsPostModel extends BaseModel {
  validate() {
    return super.validate(schema)
  }
}
