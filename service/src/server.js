import config from '../config'
import mongoose from 'mongoose'
import app from './app'


mongoose.connection.on('error', function (error) {
	console.error('mongo connection error on startup', error)
	setTimeout(() => process.exit(1), 1000)
})

mongoose.connect(config.mongoConnectionString, {
	useUnifiedTopology: true,
	useNewUrlParser: true,
	useCreateIndex: true,
	useFindAndModify: false,
	family: 4,
}, error => {
	if (error) {
		console.error(error)
		process.exit(1)
	}
})


app.listen(config.port, error => {
	if (error) {
		console.error(error)
		return process.exit(1)
	}

	console.info(`App listening on port ${config.port}`)
})
