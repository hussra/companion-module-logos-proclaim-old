import { combineRgb } from '@companion-module/base'

export const UpdatePresets = async function (self) {
	const style = {
		size: '18',
		bgcolor: combineRgb(0, 0, 0),
		color: combineRgb(255, 255, 255),
	}

	let presets = {
		on_air: {
			type: 'button',
			category: 'On Air',
			name: 'On Air',
			style: {
				...style,
				text: 'On Air',
			},
			steps: [
				{
					down: [
						{
							actionId: 'on_air_toggle',
						},
					],
					up: [],
				},
			],
			feedbacks: [
				{
					feedbackId: 'on_air',
					style: {
						bgcolor: combineRgb(255, 0, 0),
						color: combineRgb(0, 0, 0),
					},
				},
			],
		},
	}

	const simplePresets = [
		{ id: 'previous_slide', name: 'Previous Slide', category: 'Slides', text: 'Slide\n\u2B05' },
		{ id: 'next_slide', name: 'Next Slide', category: 'Slides', text: 'Slide\n\u27A1' },
		{ id: 'previous_service_item', name: 'Previous Service Item', category: 'Slides', text: 'Item\n\u23EA' },
		{ id: 'next_service_item', name: 'Next Service Item', category: 'Slides', text: 'Item\n\u23E9' },
		{ id: 'start_pre_service', name: 'Start Pre Service', category: 'Service Parts', text: 'Pre Service' },
		{ id: 'start_warm_up', name: 'Start Warm Up', category: 'Service Parts', text: 'Warm Up' },
		{ id: 'start_service', name: 'Start Service', category: 'Service Parts', text: 'Service' },
		{ id: 'start_post_service', name: 'Start Post Service', category: 'Service Parts', text: 'Post Service' },
		{ id: 'show_blank_quick_screen', name: 'Show Blank Quick Screen', category: 'Quick Screens', text: 'Blank' },
		{ id: 'show_logo_quick_screen', name: 'Show Logo Quick Screen', category: 'Quick Screens', text: 'Logo' },
		{ id: 'show_no_text_quick_screen', name: 'Show No Text Quick Screen', category: 'Quick Screens', text: 'No Text' },
	]

	for (var preset in simplePresets) {
		let id = simplePresets[preset].id
		let name = simplePresets[preset].name
		let category = simplePresets[preset].category
		let text = simplePresets[preset].text
		presets[id] = {
			type: 'button',
			category: category,
			name: name,
			style: {
				...style,
				text: text,
			},
			steps: [
				{
					down: [
						{
							actionId: id,
						},
					],
					up: [],
				},
			],
		}
	}

	for (var part in self.song_parts) {
		if (self.song_parts[part].label == 'Verse') {
			for (var v = 1; v < 10; v++) {
				const id = `song_part_${self.song_parts[part].path}_${v}`
				presets[id] = {
					type: 'button',
					category: 'Song Parts',
					name: `${self.song_parts[part].label} ${v}`,
					style: {
						...style,
						text: self.song_parts[part].displayLabel
							? `${self.song_parts[part].displayLabel}\\n${v}`
							: `${self.song_parts[part].label}\\n${v}`,
					},
					steps: [
						{
							down: [
								{
									actionId: 'go_to_song_part',
									options: {
										song_part: self.song_parts[part].id,
										item_index: v,
									},
								},
							],
							up: [],
						},
					],
				}
			}
		} else {
			const id = `song_part_${self.song_parts[part].path}`
			presets[id] = {
				type: 'button',
				category: 'Song Parts',
				name: self.song_parts[part].label,
				style: {
					...style,
					text: self.song_parts[part].displayLabel ? self.song_parts[part].displayLabel : self.song_parts[part].label,
				},
				steps: [
					{
						down: [
							{
								actionId: 'go_to_song_part',
								options: {
									song_part: self.song_parts[part].id,
									item_index: 1,
								},
							},
						],
						up: [],
					},
				],
			}
		}
	}

	self.setPresetDefinitions(presets)
}
