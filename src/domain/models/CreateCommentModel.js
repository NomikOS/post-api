import BaseModel from './BaseModel'
const Joi = require('joi')

const schema = {
  _action: Joi.string().valid(['create']).required(), // helper
  type: Joi.string().valid(['comment', 'photo']).required(),
  data: Joi.alternatives()
    .when('type', {
      is: 'photo',
      then: Joi.object().keys({
        fileName: Joi.string().max(200).required(),
        date: Joi.date()
      })
    })
    .when('type', {
      is: 'comment',
      then: Joi.object().keys({
        body: Joi.string().max(1024).required()
      })
    }),
  author_id: Joi.number().positive().required(),
  parent_id: Joi.number().positive().required().allow(null),
  post_id: Joi.alternatives().when('_action', {
    is: 'create', // y caso create-entry? post_id is required
    then: Joi.allow(null)
  })
}

export default class CreateEntryModel extends BaseModel {
  validate() {
    return super.validate(schema)
  }
}
