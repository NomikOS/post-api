const Joi = require('joi')

export default class BaseModel {
  constructor(data) {
    Object.keys(data).map((key) => {
      this[key] = data[key]
    })
  }

  // TODO Pasar options por defecto, Tal vez meter en container.
  // la validacion podria ser segun caso
  // y solo coresponde a una tabla si es una entidad de DB?
  validate(schema) {
    return Joi.validate(this, schema, { abortEarly: false }, function (
      err,
      data
    ) {
      if (err) {
        return err.details
      }
      return null
    })
  }
}
