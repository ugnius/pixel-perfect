import React, { useState, useMemo, useRef } from 'react'
import PropType from 'prop-types'
import './Screen.scss'


function Screen(props) {
	const screen = props.data

	const pad = 20
	const [show, setShow] = useState(false)
	const maxWidth = window.innerWidth - 73 - pad * 2
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
	}, [maxHeight, screen])

	const divRef = useRef()

	function setSlideAmount(event) {
		setSlide(event.clientX - divRef.current.getBoundingClientRect().left)
	}

	return <div className={`screen screen-${screen.status}`}>
		<div className="screen-title" onClick={() => setShow(!show)}>
			{screen.title}
		</div>
		{ show && screen.status === 'changed' &&
			<div style={{ position: 'relative', width: width + pad * 2, height, margin: 'auto', padding: '0 20px' }}
				onMouseMove={setSlideAmount}
				onMouseLeave={() => setSlide(0)}
				ref={divRef}
				onClick={() => setMaxHeight(maxHeight ? 0 : 800)}
			>
				<img
					src={`/images/${screen.new.image}/diff/${screen.old.image}`}
					style={{ position: 'absolute', left: pad, top: 0, width, display: slide ? 'hidden' : undefined }}
				/>
				{ slide > 0 && <>
					<div style={{ position: 'absolute', left: pad, top: 0, width }} >
						<img style={{ width }} src={`/images/${screen.new.image}`} />
					</div>
					<div style={{ position: 'absolute', left: pad, top: 0, width: Math.max(0, Math.min(width, slide - pad)), overflow: 'hidden', borderRight: '1px solid black' }}>
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


export default Screen

