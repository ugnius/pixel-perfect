import React, { useEffect, useState, useMemo } from 'react'
import PropType from 'prop-types'
import { http } from '../util'
import './Layout.scss'


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
		if (!test || !parentTest) { return [[], {}] }

		const newScreens = test.results.filter(t => !parentTest.results.some(p => p.title === t.title))
		const oldScreens = parentTest.results.filter(p => !test.results.some(t => t.title === p.title))
		const changedSceens = test.results.filter(t => parentTest.results.some(p => p.title === t.title && p.image !== t.image))
		const sameSceens = test.results.filter(t => parentTest.results.some(p => p.title === t.title && p.image === t.image))

		const screens = []

		for (const screen of test.results) {
			const parentScreen = parentTest.results.find(p => p.title === screen.title)
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
		<pre>{JSON.stringify(stats, null, 2)}</pre>
		{ screens.map(screen => (
			<Screen key={screen.id} data={screen} />
		)) }
	</div>
}


function Screen(props) {

	const screen = props.data

	const [show, setShow] = useState(screen.status === 'changed')
	const maxWidth = window.innerWidth - 73
	const [maxHeight, setMaxHeight] = useState(800)
	const [slide, setSlide] = useState(0)

	const [width, height] = useMemo(() => {
		let scale = 1

		const screenWidth = Math.max(...[screen.new && screen.new.width, screen.old && screen.old.width].filter(x => x))
		const screenHeight = Math.max(...[screen.new && screen.new.height, screen.old && screen.old.height].filter(x => x))

		if (maxHeight && screenHeight > maxHeight) {
			scale = maxHeight / screenHeight
		}
		if (screenWidth > maxWidth) {
			const widthScale = maxWidth / screenWidth
			if (widthScale < scale) { scale = widthScale }
		}

		return [
			screenWidth * scale,
			screenHeight * scale,
		]
	}, [maxHeight])

	function setSlideAmount(event) {
		setSlide(event.clientX - event.target.getBoundingClientRect().left)
	}

	return <div className={`screen screen-${screen.status}`}>
		<div className="screen-title" onClick={() => setShow(!show)}>
			{screen.title}
		</div>
		{ show && screen.status === 'changed' &&
			<div style={{ position: 'relative', width, height, margin: 'auto' }}
				onMouseMove={setSlideAmount}
				onMouseLeave={() => setSlide(0)}
				onClick={() => setMaxHeight(maxHeight ? 0 : 800)}
			>
				<img
					src={`/images/${screen.new.image}/diff/${screen.old.image}`}
					style={slide ? { display: 'hidden', width } : { width }}
				/>
				{ slide > 0 && <>
					<div style={{ position: 'absolute', left: 0, top: 0, width }}>
						<img style={{ width }} src={`/images/${screen.new.image}`} />
					</div>
					<div style={{ position: 'absolute', left: 0, top: 0, width: slide, overflow: 'hidden', borderRight: '1px solid black' }}>
						<img style={{ width }} src={`/images/${screen.old.image}`} />
					</div>
				</>
				}
			</div>
		}
		{ show && screen.status !== 'changed' &&
			<div style={{ position: 'relative', width, height, margin: 'auto' }}
				onClick={() => setMaxHeight(maxHeight ? 0 : 800)}
			>
				<img
					src={`/images/${screen.new ? screen.new.image : screen.old.image}`}
					style={{ width }}
				/>
			</div>
		}
	</div>
}

Screen.propTypes = {
	data: PropType.object,
}


export default Layout
