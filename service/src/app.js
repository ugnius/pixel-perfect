import wrap from 'express-async-wrap'
import express from 'express'
import Test from './models/Test'
import Image from './models/Image'
import mongoose from 'mongoose'
import { getScreenshot } from './captureService'
import streams from 'stream-buffers'
import compression from 'compression'
import path from 'path'
import { validateJSON } from './app-util'
import sharp from 'sharp'


const app = express()
app.use(compression())

app.use(express.static(path.join(__dirname, 'public')))
app.use(express.json())

app.post('/tests', wrap(async (req, res) => {

	validateJSON(req.body, {
		type: 'object',
		properties: {
			parentTest: { type: 'string', pattern: '^[0-9a-f]{24}$' },
			configuration: { type: 'object', required: true, properties: {
				origin: { type: 'string', required: true },
				widths: { type: 'array', required: true, items: { type: 'number' } },
				header: { type: 'number' },
				mask: { type: 'array', items: { type: 'string' } },
				scenes: { type: 'array', required: true, minItems: 1, items: { type: 'object', properties: {
					title: { type: 'string', required: true },
					path: { type: 'string', required: true },
					mask: { type: 'array', items: { type: 'string' } },
				} } },
			} },
		},
	})

	const test = await Test.create({
		configuration: req.body.configuration,
		parentTest: req.body.parentTest,
		progress: {
			state: 'running',
		},
	})

	startTest(test).catch(error => console.error(error))

	res.send({ id: test._id })
}))


app.get('/tests/:id', wrap(async (req, res) => {
	const test = await Test.findById(req.params.id).lean()
	if (!test) {
		return res.sendStatus(404)
	}
	res.json(test)
}))


app.get('/tests/:id/progress', wrap(async (req, res) => {
	const test = await Test.findById(req.params.id).lean()
	if (!test) {
		return res.sendStatus(404)
	}
	res.json(test.progress)
}))


app.get('/tests/:id/report', wrap(async (req, res) => {
	res.sendFile(path.join(__dirname, 'public/report.html'))
}))


app.get('/images/:digest', wrap(async (req, res) => {
	const image = await Image.findOne({ 'metadata.digest': req.params.digest }).lean()
	if (!image) {
		return res.sendStatus(404)
	}

	const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'images' })
	const stream = bucket.openDownloadStream(new mongoose.Types.ObjectId(image._id))

	res.set('Cache-Control', 'max-age=31536000')
	res.set('Expires', new Date(Date.now() + 31708800000).toUTCString())
	res.set('Content-Type', image.contentType)
	stream.pipe(res)
}))


app.get('/images/:new/diff/:old', wrap(async (req, res) => {
	const newImage = await Image.findOne({ 'metadata.digest': req.params.new }).lean()
	if (!newImage) {
		return res.sendStatus(404)
	}
	const oldImage = await Image.findOne({ 'metadata.digest': req.params.old }).lean()
	if (!oldImage) {
		return res.sendStatus(404)
	}

	const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'images' })
	const newStream = bucket.openDownloadStream(new mongoose.Types.ObjectId(newImage._id))
	const oldStream = bucket.openDownloadStream(new mongoose.Types.ObjectId(oldImage._id))

	const newData = await new Promise(resolve => {
		const buffers = []
		newStream.on('data', d => buffers.push(d))
		newStream.on('end', () => {
			resolve(Buffer.concat(buffers))
		})
	})

	const oldData = await new Promise(resolve => {
		const buffers = []
		oldStream.on('data', d => buffers.push(d))
		oldStream.on('end', () => {
			resolve(Buffer.concat(buffers))
		})
	})

	const newRaw = await sharp(newData).raw().toBuffer()
	const oldRaw = await sharp(oldData).raw().toBuffer()

	// TODO: optimize with stream
	const diff = Buffer.allocUnsafe(newRaw.length)
	for (let i = 0; i < diff.length && i < newRaw.length && i < oldRaw.length; i += 4) {
		if (newRaw[i] === oldRaw[i]
			&& newRaw[i + 1] === oldRaw[i + 1]
			&& newRaw[i + 2] === oldRaw[i + 2])
		{
			diff[i] = newRaw[i]
			diff[i + 1] = newRaw[i + 1]
			diff[i + 2] = newRaw[i + 2]
		}
		else {
			diff[i] = 255
			diff[i + 1] = 0
			diff[i + 2] = 255
		}

		diff[i + 3] = 255
	}

	const stream = sharp(diff, {
		raw: {
			width: newImage.metadata.width,
			height: newImage.metadata.height,
			channels: 4,
		},
	}).png()

	res.set('Cache-Control', 'max-age=31536000')
	res.set('Expires', new Date(Date.now() + 31708800000).toUTCString())
	res.set('Content-Type', 'image/png')
	stream.pipe(res)
}))


app.use((error, req, res, next) => { // eslint-disable-line no-unused-vars
	if (error.message === 'NotFound') {
		return res.sendStatus(404)
	}

	if (error.message === 'ValidationError') {
		console.warn(error.extra, { error, req })
		return res
			.status(400)
			.json({ message: error.message, extra: error.extra })
	}

	console.error(error.message, { error, req })
	return res.sendStatus(500)
})


async function testScreen(configuration, screen) {
	const { scene, testWidth } = screen
	const title = `${scene.title} w${testWidth}`

	const { buffer, digest, width, height } = await getScreenshot(
		`${configuration.origin}${scene.path}`,
		testWidth, { header: configuration.header, only: scene.only, mask: scene.mask || configuration.mask })

	const image = await Image.findOne({ 'metadata.digest': digest }).lean()
	if (!image) {
		await new Promise(resolve => {
			const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'images' })
			const writestream = bucket.openUploadStream(`${digest}.png`, {
				metadata: { width, height, digest },
				contentType: 'image/png',
			})

			writestream.on('finish', () => {
				resolve()
			})

			var zipStream = new streams.ReadableStreamBuffer({ chunkSize: 8192 })
			zipStream.pipe(writestream)
			zipStream.put(buffer)
			zipStream.stop()
		})
	}

	return {
		title,
		image: digest,
		width,
		height,
	}
}


async function startTest(test) {

	const screens = []
	for (const scene of test.configuration.scenes) {
		for (const testWidth of test.configuration.widths) {
			screens.push({ scene, testWidth })
		}
	}

	test.results = []
	test.progress.completed = 0
	test.progress.total = screens.length
	await test.save()

	try {
		test.results = await Promise.all(screens.map(async screen => {
			const result = await testScreen(test.configuration, screen)
			await Test.updateOne({ _id: test._id }, { $inc: { 'progress.completed': 1 } })
			return result
		}))

		console.debug(`test ${test._id} finished`)
		test.progress.state = 'done'
		await test.save()
	}
	catch (error) {
		console.debug(`test ${test._id} failed with error`)
		console.error(error)
		test.progress.state = 'done'
		test.progress.error = error.message
		await test.save()
	}
}

export default app
