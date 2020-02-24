import mongoose from 'mongoose'


const schema = new mongoose.Schema({
	configuration: {
		origin: String,
		widths: [Number],
		header: Number,
		scenes: [{
			title: String,
			path: String,
		}],
	},
	parentTest: { type: mongoose.Types.ObjectId, ref: 'Test' },
	progress: {
		state: String,
		error: String,
		total: Number,
		completed: Number,
	},
	results: [
		{
			title: String,
			image: String,
			width: Number,
			height: Number,
		},
	],
})


const Test = mongoose.model('Test', schema)
export default Test
