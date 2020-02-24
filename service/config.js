require('dotenv').config({ path: '../.env' })

module.exports = {
	mongoConnectionString: process.env.MONGO_CONNECTION_STRING || 'mongodb://localhost/pixel-perfect',
	seleniumServer: process.env.SELENIUM_SERVER || 'http://localhost:4444/wd/hub',
	height: process.env.BROWSER_HEIGHT || 1249,
	port: process.env.HTTP_PORT || 8080,
}
