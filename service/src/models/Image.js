import mongoose from 'mongoose'


const schema = new mongoose.Schema({
	metadata: {
		digest: String,
		width: Number,
		height: Number,
	},
}, {
	collection: 'images.files',
})


const Image = mongoose.model('Image', schema)
export default Image
