#!/usr/bin/env node

const path = require('path')
const chalk = require('chalk')
const fetch = require('node-fetch')
const fs = require('fs')
const open = require('open')
const { promisify } = require('util')
const readline = require('readline')


const command = process.argv[2]

switch(command) {
	case 'test':
		let configuration
		try {
			configuration = require(path.join(process.cwd(), 'pp.config.js'))
		}
		catch (error) {
			if (error.message.includes('Cannot find module')) {
				console.error(chalk.red('pp.config.js was not found'))
				console.error('Run pp init to create example config file')
				process.exit(1)
			}
			throw error
		}

		for (const scene of configuration.scenes) {
			if (configuration.scenes.filter(x => x.title === scene.title).length > 1) {
				console.error(chalk.red(`Scene title "${scene.title}" is used more than once`))
				process.exit(1)
			}
		}

		;(async () => {
			let truth
			try {
				truth = JSON.parse(await promisify(fs.readFile)(path.join(process.cwd(), 'pp.truth.json')))
				configuration.parentTest = test.id
			} catch (error) { }

			const dto = {
				configuration,
				parentTest: truth && truth.test,
			}

			const res = await post(`${configuration.testService}/tests`, dto)
			const { id } = res.data

			let progress
			do {
				if (progress) { await new Promise(resolve => setTimeout(resolve, 1000)) }
				const res = await get(`${configuration.testService}/tests/${id}/progress`)
				progress = res.data

				if (progress.state === 'running') {
					readline.cursorTo(process.stdout, 0)
					process.stdout.write(`Running test ${progress.completed + 1} of ${progress.total}`);
				}
			} while (progress.state === 'running')
			process.stdout.write('\n');

			const { data: test } = await get(`${configuration.testService}/tests/${id}`)
			if (test.progress.error) {
				console.error(chalk.red(`Error from test service: ${test.progress.error}`))
				return process.exit(1)
			}

			let changes = 0

			if (truth) {
				const { data: parentTest } = await get(`${configuration.testService}/tests/${truth.test}`)

				const newScreens = parentTest.results.filter(p => !test.results.some(t => t.title === p.title))
				const oldScreens = test.results.filter(t => !parentTest.results.some(p => p.title === t.title))
				const changedSceens = test.results.filter(t => parentTest.results.some(p => p.title === t.title && p.image !== t.image))

				changes = newScreens.length + changedSceens.length + oldScreens.length
				if (changes) {
					await promisify(fs.writeFile)(
						path.join(process.cwd(), 'pp.changes.json'),
						JSON.stringify({
							test: test._id,
							report: `${configuration.testService}/tests/${id}/report`,
						}, null, '\t')
					)

					console.error(chalk.yellow('Changes found! Saved to pp-changes.json'))
					if (newScreens.length) {
						console.log('new: ', newScreens.map(p => p.title).join(', '))
					}
					if (oldScreens.length) {
						console.log('old: ', oldScreens.map(p => p.title).join(', '))
					}
					if (changedSceens.length) {
						console.log('changed: ', changedSceens.map(p => p.title).join(', '))
					}
					console.error(chalk.yellow('Run pp aprove after reviewing report to mark changes as new truth'))
				}
				else {
					console.log(chalk.green('No changes found!'))
					return process.exit(0)
				}
			}
			else {
				await promisify(fs.writeFile)(
					path.join(process.cwd(), 'pp.changes.json'),
					JSON.stringify({
						test: test._id,
						report: `${configuration.testService}/tests/${id}/report`,
					}, null, '\t')
				)

				console.error(chalk.green('Saved to pp-changes.json'))
				console.error(chalk.green('Run pp aprove after reviewing report to mark changes as new truth'))
			}

			const url = `${configuration.testService}/tests/${id}/report`
			console.log(`Testing done. Test results are available at: ${chalk.blue(url)}`)
			open(url)
			setTimeout(() => {
				process.exit(changes ? 1 : 0)
			}, 1000)

		})().catch(error => {
			if (error.data) {
				console.error(chalk.red(`Error from test service: ${error.data.message}`))
			}
			if ((error.message || '').includes('ECONNREFUSED')) {
				console.error(chalk.red(`Error connecting to ${configuration.testService}`))
			}
			else {
				console.error(chalk.red(error))
			}

			process.exit(1)
		})

		break;

	case 'approve':
		;(async () => {
			let changes
			try {
				changes = JSON.parse(await promisify(fs.readFile)(path.join(process.cwd(), 'pp.changes.json')))
			} catch (error) {
				if (error.message.includes('ENOENT')) {
					console.error(chalk.red('pp.changes.json was not found!'))
					console.error(chalk.red('Run pp test first'))
					return process.exit(1)
				}
				throw error
			}

			await promisify(fs.writeFile)(
				path.join(process.cwd(), 'pp.truth.json'),
				JSON.stringify(changes, null, '\t')
			)

			await promisify(fs.unlink)(path.join(process.cwd(), 'pp.changes.json'))

			console.log(chalk.green('pp.truth.json was updated with changes from last test'))

		})().catch(error => {
			console.error(chalk.red(error))
			return process.exit(1)
		})

		break;
	case 'init':
		;(async () => {
			let stat
			try {
				stat = await promisify(fs.stat)(path.join(process.cwd(), 'pp.config.js'))
			} catch (error) {
				if (!error.message.includes('ENOENT')) { throw error }
			}

			if (stat) {
				console.error(chalk.red('pp.config.js already exists'))
				return process.exit(1)
			}

			const example = await promisify(fs.readFile)(path.join(__dirname, 'pp.config.init.js'))
			await promisify(fs.writeFile)(path.join(process.cwd(), 'pp.config.js'), example)
			console.log('pp.config.js example file was created')

		})().catch(error => {
			console.error(chalk.red(error))
			return process.exit(1)
		})

		break;
	default:
		console.error(chalk.red(`Unknown command "${command}"`))
		console.error('usage: pp test')
		process.exit(1)
}



async function request(url, data, options) {
	let body = undefined
	const extraHeaders = {}

	if (data !== undefined) {
		body = JSON.stringify(data)
		extraHeaders['Content-Type'] = 'application/json'
	}

	const res = await fetch(url, {
		body,
		...options,
		headers: {
			...extraHeaders,
			...options.headers,
		},
	})

	if ((res.headers.get('Content-Type') || '').includes('application/json')) {
		res.data = await res.json()
	}

	if (!res.ok) {
		throw res
	}

	return res
}


async function get(url, options) {
	return await request(url, undefined, { method: 'GET', ...options })
}

async function post(url, data, options) {
	return await request(url, data, { method: 'POST', ...options })
}
