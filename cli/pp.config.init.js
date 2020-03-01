require('dotenv').config({ path: '.env' })

module.exports = {
	// Pixel perfect service origin
	testService: 'http://domain',
	// Page to be tested origin
	origin: process.env.ORIGIN || 'http://domain',
	widths: [320, 1448],
	header: 120,
	scenes: [
		{
			title: 'Home',
			path: '/',
		},
	],
}
