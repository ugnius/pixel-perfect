const { Builder } = require('selenium-webdriver')
const chrome = require('selenium-webdriver/chrome')
const sharp = require('sharp')
const crypto = require('crypto')
const config = require('../config')


const maxDrivers = 4
let activeDrivers = 0
const queue = []


async function getDriver() {
	if (activeDrivers < maxDrivers) {
		activeDrivers++

		return await new Builder()
			.usingServer(config.seleniumServer)
			.forBrowser('chrome')
			.setChromeOptions(new chrome.Options().headless())
			.build()
	}

	return await new Promise(resolve => {
		queue.push(resolve)
	})
}

async function releaseDriver(driver) {
	if (queue.length) {
		const resolve = queue.shift()
		resolve(driver)
	}
	else {
		activeDrivers--
		await driver.quit()
	}
}


async function getScreenshot(url, width, options = {}) {
	const driver = await getDriver()

	try {
		const headerHeight = options.header !== undefined ? options.header : 0
		const headless = options.headless !== undefined ? options.headless : true
		const windowFrameWidth = headless ? 0 : 8

		await driver.manage().window().setRect({ width: width + windowFrameWidth, height: config.height })
		await driver.get(url)
		await driver.executeScript('document.body.style.overflowY = \'hidden\'')
		await driver.executeScript('window.scrollTo(0, 0)')
		await new Promise(resolve => setTimeout(resolve, 1000))

		let windowHeight = await driver.executeScript('return window.innerHeight')
		windowHeight -= headerHeight

		let onlyRect = null
		if (options.only) {
			onlyRect = await driver.executeScript(`return document.querySelector('${options.only}').getBoundingClientRect()`)
		}
		let maskRects = []
		if (options.mask) {
			maskRects = await Promise.all(options.mask.map(x => {
				return driver.executeScript(`return document.querySelector('${x}').getBoundingClientRect()`)
			}))
		}

		const captures = []
		let lastScroll, start = 0
		do {
			await driver.executeScript(`window.scrollTo(0, ${start})`)
			lastScroll = await driver.executeScript('return window.scrollY')
			const buffer = Buffer.from(await driver.takeScreenshot(), 'base64')
			captures.unshift({ start: lastScroll, buffer })
			start = start + windowHeight
		} while (lastScroll === start - windowHeight)
		let totalHeight = lastScroll + windowHeight + headerHeight

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

		if (maskRects) {
			for (const maskRect of maskRects) {
				if (!maskRect) { continue }
				raw = await sharp(raw.data, { raw: raw.info })
					.composite([
						{ input: { create: {
							width: Math.ceil(maskRect.width),
							height: Math.ceil(maskRect.height),
							channels: 4,
							background: { r: 200, g: 200, b: 200, alpha: 1 },
						} },
						top: Math.ceil(maskRect.top),
						left: Math.ceil(maskRect.left),
						},
					])
					.raw()
					.toBuffer({ resolveWithObject: true })
			}
		}

		if (onlyRect) {
			raw = await sharp(raw.data, { raw: raw.info })
				.extract({
					left: Math.ceil(onlyRect.left),
					top: Math.ceil(onlyRect.top),
					width: Math.ceil(onlyRect.width),
					height: Math.ceil(onlyRect.height),
				})
				.raw()
				.toBuffer({ resolveWithObject: true })

			totalHeight = onlyRect.height
			width = onlyRect.width
		}

		const buffer = await sharp(raw.data, { raw: raw.info }).png().toBuffer()

		const digest = crypto.createHash('sha256').update(buffer).digest('hex')
		return { buffer, digest, width, height: totalHeight }

	} finally {
		await releaseDriver(driver)
	}
}


module.exports = {
	getScreenshot,
}
