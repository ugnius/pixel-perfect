import React, { useEffect, useState, useMemo } from 'react'
import { http } from '../util'
import './Layout.scss'
import Screen from './Screen'


function Layout() {
	const [test, setTest] = useState(null)
	const [parentTest, setParentTest] = useState(null)

	useEffect(() => {
		const id = (window.location.pathname.match(/tests\/(.*)\//) || [])[1]
		http.get(`/tests/${id}`).then(res => {
			setTest(res.data)

			if (res.data.parentTest) {
				http.get(`/tests/${res.data.parentTest}`).then(res => {
					setParentTest(res.data)
				})
			}
		})
	}, [])


	const [screens, stats] = useMemo(() => {
		if (!test) { return [[], {}] }
		const _parentTest = parentTest || { results: [] }

		const newScreens = test.results.filter(t => !_parentTest.results.some(p => p.title === t.title))
		const oldScreens = _parentTest.results.filter(p => !test.results.some(t => t.title === p.title))
		const changedSceens = test.results.filter(t => _parentTest.results.some(p => p.title === t.title && p.image !== t.image))
		const sameSceens = test.results.filter(t => _parentTest.results.some(p => p.title === t.title && p.image === t.image))

		const screens = []

		for (const screen of test.results) {
			const parentScreen = _parentTest.results.find(p => p.title === screen.title)
			if (parentScreen) {
				screens.push({
					id: screen._id,
					title: screen.title,
					status: screen.image === parentScreen.image ? 'same' : 'changed',
					new: screen,
					old: parentScreen,
				})
			}
		}

		for (const screen of newScreens) {
			screens.push({
				id: screen._id,
				title: screen.title,
				status: 'new',
				new: screen,
			})
		}

		for (const screen of oldScreens) {
			screens.push({
				id: screen._id,
				title: screen.title,
				status: 'old',
				old: screen,
			})
		}

		return [
			screens,
			{
				new: newScreens.length,
				old: oldScreens.length,
				changed: changedSceens.length,
				same: sameSceens.length,
			},
		]

	}, [test, parentTest])

	return <div>
		<h1 className="title">Report for {test ? test.configuration.origin : ''}</h1>
		{ Object.entries(stats).filter(([, value]) => value).map(([key, value]) => (
			<span className={`tag tag-${key}`} key={key}>{key[0].toUpperCase()}{key.substring(1)} {value}</span>
		))}
		{ screens.map(screen => (
			<Screen key={screen.id} data={screen} />
		)) }
	</div>
}

export default Layout
