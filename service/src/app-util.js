import { Validator } from 'jsonschema'
import { inherits } from 'util'


export function ValidationError(extra, data) {
	Error.captureStackTrace(this, ValidationError)
	this.message = 'ValidationError'
	this.extra = extra
	this.data = data
}
inherits(ValidationError, Error)
ValidationError.prototype.name = 'ValidationError'


const v = new Validator()
export function validateJSON(object, schema) {
	const validationResult = v.validate(object, schema)
	if (validationResult.errors.length > 0) {
		throw new ValidationError(validationResult.errors.join(', '))
	}
}
