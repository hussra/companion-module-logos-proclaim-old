export const UpdateActions = function(self) {
	self.setActionDefinitions({
		
		on_air: {
			name: 'Go On Air',
			callback: async (event) => {
				self.sendAppCommand('GoOnAir');
			}
		},

		off_air: {
			name: 'Go Off Air',
			callback: async (event) => {
				self.sendAppCommand('GoOffAir');
			}
		},
		
		on_air_toggle: {
			name: 'Toggle On Air',
			callback: async (event) => {
				if (self.on_air) {
					self.sendAppCommand('GoOffAir');
				} else {
					self.sendAppCommand('GoOnAir');
				}
			}
		},

		next_slide: {
			name: 'Next Slide',
			callback: async (event) => {
				self.sendAppCommand('NextSlide');
			}
		},

		previous_slide: {
			name: 'Previous Slide',
			callback: async (event) => {
				self.sendAppCommand('PreviousSlide');
			}
		},

		go_to_service_item: {
			name: 'Go to Service Item',
			options: [
				{
					id: 'num',
					type: 'number',
					label: 'Service Item Number',
					default: 1,
					min: 0,
					max: 254,
				},
			],
			callback: async (event) => {
				console.log('Go to service item ', event.options.num)
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
					min: 0,
					max: 254,
				},
			],
			callback: async (event) => {
				console.log('Go to slide ', event.options.num)
			},
		},
	})
}
