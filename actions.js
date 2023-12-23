export const UpdateActions = function (self) {
	let actions = {
		on_air_toggle: {
			name: 'Toggle On Air',
			callback: async () => {
				if (self.on_air) {
					self.sendAppCommand('GoOffAir')
				} else {
					self.sendAppCommand('GoOnAir')
				}
			},
		},

		go_to_service_item: {
			name: 'Go To Service Item',
			options: [
				{
					id: 'num',
					type: 'number',
					label: 'Service Item Number',
					default: 1,
					min: 1,
					max: 254,
				},
			],
			callback: async (event) => {
				self.sendAppCommand('GoToServiceItem', event.options.num)
			},
		},

		go_to_slide: {
			name: 'Go To Slide',
			options: [
				{
					id: 'num',
					type: 'number',
					label: 'Slide Number',
					default: 1,
					min: 1,
					max: 254,
				},
			],
			callback: async (event) => {
				self.sendAppCommand('GoToSlide', event.options.num)
			},
		},

		go_to_song_part: {
			name: 'Go To Song Part',
			options: [
				{
					type: 'dropdown',
					id: 'song_part',
					label: 'Song Part',
					default: 0,
					choices: self.song_parts,
				},
				{
					id: 'item_index',
					type: 'number',
					label: 'Index',
					default: 1,
					min: 1,
					max: 254,
				},
			],
			callback: async (event) => {
				const part = self.song_parts[event.options.song_part].label
				self.sendAppCommand(`ShowSongLyrics${part}ByIndex`, event.options.item_index)
			},
		},
	}

	const simpleActions = [
		{ id: 'on_air', name: 'Go On Air', appCommand: 'GoOnAir' },
		{ id: 'off_air', name: 'Go Off Air', appCommand: 'GoOffAir' },
		{ id: 'previous_slide', name: 'Previous Slide', appCommand: 'PreviousSlide' },
		{ id: 'next_slide', name: 'Next Slide', appCommand: 'NextSlide' },
		{ id: 'previous_service_item', name: 'Previous Service Item', appCommand: 'PreviousServiceItem' },
		{ id: 'next_service_item', name: 'Next Service Item', appCommand: 'NextServiceItem' },
		{ id: 'start_pre_service', name: 'Start Pre Service', appCommand: 'StartPreService' },
		{ id: 'start_warm_up', name: 'Start Warm Up', appCommand: 'StartWarmUp' },
		{ id: 'start_service', name: 'Start Service', appCommand: 'StartService' },
		{ id: 'start_post_service', name: 'Start Post Service', appCommand: 'StartPostService' },
		{ id: 'show_blank_quick_screen', name: 'Show Blank Quick Screen', appCommand: 'ShowBlankQuickScreen' },
		{ id: 'show_logo_quick_screen', name: 'Show Logo Quick Screen', appCommand: 'ShowLogoQuickScreen' },
		{ id: 'show_no_text_quick_screen', name: 'Show No Text Quick Screen', appCommand: 'ShowNoTextQuickScreen' },
	]

	for (var action in simpleActions) {
		let id = simpleActions[action].id
		let name = simpleActions[action].name
		let appCommand = simpleActions[action].appCommand
		actions[id] = {
			name: name,
			callback: async () => {
				self.sendAppCommand(appCommand)
			},
		}
	}

	self.setActionDefinitions(actions)
}
