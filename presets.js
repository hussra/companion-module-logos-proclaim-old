import { combineRgb } from '@companion-module/base'

export const UpdatePresets = async function (self) {
	self.setPresetDefinitions({
		on_air: {
            type: 'button',
            category: 'On Air',
            name: 'On Air',
            style: {
                text: 'On Air',
                size: 'auto',
                bgcolor: combineRgb(0, 0, 0),
                color: combineRgb(255, 255, 255),
            },
            steps: [
                {
                    down: [
                        {
                            actionId: 'on_air_toggle',
                        },
                    ],
                    up: [],
                }
            ],
            feedbacks: [
                {
                    feedbackId: 'on_air',
                    style: {
                        bgcolor: combineRgb(255, 0, 0),
                        color: combineRgb(0, 0, 0),
                    },
                }
            ],
		},
	})
}
