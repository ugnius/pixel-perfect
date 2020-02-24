const { Builder } = require('selenium-webdriver')
const chrome = require('selenium-webdriver/chrome')
const sharp = require('sharp')
const crypto = require('crypto')
const config = require('../config')


async function getScreenshot(url, width, options = {}) {
	let driver = await new Builder()
		.usingServer(config.seleniumServer)
		.forBrowser('chrome')
		.setChromeOptions(new chrome.Options().headless())
		.build()

	try {
		const headerHeight = options.header !== undefined ? options.header : 0
		const headless = options.headless !== undefined ? options.headless : true
		const windowFrameWidth = headless ? 0 : 8

		await driver.manage().window().setRect({ width: width + windowFrameWidth, height: config.height })
		await driver.get(url)
		await driver.executeScript('document.body.style.overflowY = \'hidden\'')

		let windowHeight = await driver.executeScript('return window.innerHeight')
		windowHeight -= headerHeight

		const captures = []
		let lastScroll, start = 0
		do {
			await driver.executeScript(`window.scrollTo(0, ${start})`)
			lastScroll = await driver.executeScript('return window.scrollY')
			const buffer = Buffer.from(await driver.takeScreenshot(), 'base64')
			captures.unshift({ start: lastScroll, buffer })
			start = start + windowHeight
		} while (lastScroll === start - windowHeight)
		const totalHeight = lastScroll + windowHeight + headerHeight

		let raw = await sharp(
			{
				create: {
					width: width,
					height: totalHeight,
					channels: 4,
					background: { r: 255, g: 0, b: 0, alpha: 0.5 },
				},
			})
			.raw()
			.toBuffer({ resolveWithObject: true })

		for (const capture of captures) {
			raw = await sharp(raw.data, { raw: raw.info })
				.composite([{ input: capture.buffer, top: capture.start, left: 0 }])
				.raw()
				.toBuffer({ resolveWithObject: true })
		}

		const buffer = await sharp(raw.data, { raw: raw.info }).png().toBuffer()
		const digest = crypto.createHash('sha256').update(buffer).digest('hex')
		return { buffer, digest, width, height: totalHeight }

	} finally {
		await driver.quit()
	}
}


module.exports = {
	getScreenshot,
}
