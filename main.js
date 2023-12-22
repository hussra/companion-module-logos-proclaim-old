import { InstanceBase, runEntrypoint, InstanceStatus, Regex } from '@companion-module/base'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions } from './actions.js'
import { UpdateFeedbacks } from './feedbacks.js'
import { UpdateVariableDefinitions } from './variables.js'
import { UpdatePresets } from './presets.js'
import got from 'got'

class ProclaimInstance extends InstanceBase {
	constructor(internal) {
		super(internal)
	}

	// When module initialised
	async init(config) {
		this.config = config

		this.updateStatus(InstanceStatus.Connecting)

		// Reference data
		this.song_parts = [
			{ id: 0, label: 'Verse', path: 'verse' },
			{ id: 1, label: 'Chorus', path: 'chorus' },
			{ id: 2, label: 'Bridge', path: 'bridge' },
			{ id: 3, label: 'Prechorus', displayLabel: 'Pre\nchorus', path: 'prechorus' },
			{ id: 4, label: 'Interlude', displayLabel: 'Inter-lude', path: 'interlude' },
			{ id: 5, label: 'Tag', path: 'tag' },
			{ id: 6, label: 'Ending', path: 'ending' },
		]

		this.updateActions() // Export actions
		this.updateFeedbacks() // Export feedbacks
		this.updateVariableDefinitions() // Export variable definitions
		this.updatePresets() // Export presets

		// Initialise state
		this.setVariableValues({
			on_air: 0,
		})
		this.on_air = false // Is Proclaim "On Air"?
		this.on_air_session_id = '' // Proclaim On Air Session ID
		this.on_air_successful = false // Were we able to connect to check Proclaim's On Air status?
		this.onair_poll_interval = undefined // The interval ID for polling On Air status
		this.proclaim_auth_required = false // Does Proclaim require authentication for App Commands?
		this.proclaim_auth_successful = false // Were we able to authenticate to Proclaim?
		this.proclaim_auth_token = '' // Proclaim authentication token

		// Process module config
		await this.configUpdated(config)
	}

	// When module gets deleted
	async destroy() {
		if (this.onair_poll_interval !== undefined) {
			clearInterval(this.onair_poll_interval)
		}
	}

	// When module config updated
	async configUpdated(config) {
		// If IP changes, need to cancel and restart the on-air polling
		var resetInterval = false

		this.config = config

		if (this.onair_poll_interval !== undefined) {
			clearInterval(this.onair_poll_interval)
		}
		this.init_onair_poll()

		// Ask for an auth token
		this.proclaim_auth_required = config.ip != '127.0.0.1'
		if (this.proclaim_auth_required) {
			this.getAuthToken()
		}

		this.setModuleStatus()
	}

	// Look at the various status flags and determine the overall module connection status
	setModuleStatus() {
		var self = this

		if (!self.config.ip) {
			self.updateStatus(InstanceStatus.BadConfig, 'IP not specified')
			return
		}

		if (!self.on_air_successful) {
			self.updateStatus(InstanceStatus.Disconnected, 'Could not obtain on air status')
			return
		}

		if (self.proclaim_auth_required && !self.proclaim_auth_successful) {
			self.updateStatus(InstanceStatus.ConnectionFailure, 'Authentication unsuccessful')
			return
		}

		self.updateStatus(InstanceStatus.Ok)
	}

	// Set up the regular polling of on-air status
	init_onair_poll() {
		var self = this
		this.onair_poll_interval = setInterval(function () {
			self.onair_poll()
		}, 1000)
		self.onair_poll()
	}

	// Poll for on-air status
	async onair_poll() {
		var self = this

		if (!self.config.ip) {
			self.setModuleStatus()
			return
		}

		const url = 'http://' + self.config.ip + ':52195' + '/onair/session'
		const on_air_previously_successful = self.on_air_successful

		try {
			const data = await got(url, {
				timeout: {
					request: 1000,
				},
				retry: {
					limit: 0,
				},
			}).text()

			// If we got a session ID back, we're on air! If we got blank, we're off air
			if (data.length > 30) {
				self.on_air = true
				self.on_air_session_id = data
				self.on_air_successful = true
				this.setVariableValues({
					on_air: 1,
				})
			} else {
				self.on_air = false
				self.on_air_session_id = ''
				self.on_air_successful = true
				this.setVariableValues({
					on_air: 0,
				})
			}
			self.checkFeedbacks('on_air')
			self.setModuleStatus()

			// If Proclaim is now responding and wasn't previously, try to authenticate
			if (self.on_air_successful && !on_air_previously_successful && self.proclaim_auth_required) {
				self.getAuthToken()
			}
		} catch (error) {
			// Something went wrong obtaining on-air status - can't connect to Proclaim
			self.on_air = false
			self.on_air_successful = false
			self.on_air_session_id = ''
			this.setVariableValues({
				on_air: 0,
			})
			self.checkFeedbacks('on_air')
			self.setModuleStatus()
		}
	}

	// Send any app command to Proclaim
	async sendAppCommand(command, index) {
		var self = this

		let url = 'http://' + self.config.ip + ':52195/appCommand/perform?appCommandName=' + command
		if (index !== undefined) {
			url = url + '&index=' + index
		}

		const options = {
			timeout: {
				request: 1000,
			},
			retry: {
				limit: 0,
			},
		}

		if (self.proclaim_auth_required) {
			if (!self.proclaim_auth_successful) {
				return
			}

			options.headers = {
				ProclaimAuthToken: self.proclaim_auth_token,
			}

			// This shouldn't be necessary... but it is, for now.
			// Proclaim requires the ProclaimAuthToken header name to be CamelCase, though
			// the HTTP spec says header names are case-insensitive.
			options.hooks = {
				beforeRequest: [
					(options) => {
						options.headers['ProclaimAuthToken'] = options.headers['proclaimauthtoken']
					},
				],
			}
		}

		try {
			const data = (await got(url, options).text()).replace(/^\uFEFF/, '')
			if (data != 'success') {
				self.log('debug', 'Unexpected response from Proclaim: ' + data)
			}
		} catch (error) {
			if (error.response.statusCode == 401 && self.proclaim_auth_required) {
				self.proclaim_auth_successful = false
				self.proclaim_auth_token = ''
				self.setModuleStatus()
			}
		}
	}

	// Get an authentication token from Proclaim
	async getAuthToken() {
		var self = this
		const url = 'http://' + self.config.ip + ':52195/appCommand/authenticate'
		var data
		try {
			data = await got
				.post(url, {
					timeout: {
						request: 1000,
					},
					retry: {
						limit: 0,
					},
					json: {
						Password: self.config.password,
					},
				})
				.text()
			// }).json();
			// Calling json() returns a ERR_BODY_PARSE_FAILURE, I think because Proclaim is returning
			// content-type: text/html rather than application/json

			// Maybe because we're calling text() not json(), or maybe there's some issue in the encoding of
			// Proclaim's response, we need to strip the byte order marker before parsing. I don't like this.
			const parsed = JSON.parse(data.replace(/^\uFEFF/, ''))
			self.proclaim_auth_successful = true
			self.proclaim_auth_token = parsed.proclaimAuthToken
			self.setModuleStatus()
		} catch (error) {
			self.log('debug', 'Here is the error:\n' + JSON.stringify(error))
			self.log('debug', error)
			if (error.response && error.response.statusCode == 401 && self.proclaim_auth_required) {
				self.proclaim_auth_successful = false
				self.setModuleStatus()
			}
		}
	}

	// Return config fields for web config
	getConfigFields() {
		return [
			{
				type: 'textinput',
				id: 'ip',
				label: 'Proclaim IP',
				width: 6,
				regex: Regex.IP,
				default: '127.0.0.1',
				required: true,
			},
			{
				type: 'textinput',
				id: 'password',
				label: 'Password',
				width: 6,
				isVisible: (configValues) => configValues.host !== '127.0.0.1',
				required: true,
			},
		]
	}

	updateActions() {
		UpdateActions(this)
	}

	updateFeedbacks() {
		UpdateFeedbacks(this)
	}

	updateVariableDefinitions() {
		UpdateVariableDefinitions(this)
	}

	updatePresets() {
		UpdatePresets(this)
	}
}

runEntrypoint(ProclaimInstance, UpgradeScripts)
