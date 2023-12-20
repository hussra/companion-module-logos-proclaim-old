import { InstanceBase, runEntrypoint, InstanceStatus, Regex } from '@companion-module/base'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions } from './actions.js'
import { UpdateFeedbacks } from './feedbacks.js'
import { UpdateVariableDefinitions} from './variables.js'
import { UpdatePresets} from './presets.js'
import got from 'got';

class ProclaimInstance extends InstanceBase {
	constructor(internal) {
		super(internal)
	}

	// When module initialised
	async init(config) {
		this.config = config

		this.updateStatus(InstanceStatus.Connecting)

		this.updateActions()				// Export actions
		this.updateFeedbacks() 				// Export feedbacks
		this.updateVariableDefinitions()	// Export variable definitions
		this.updatePresets()				// Export presets

		this.setVariableValues({
			'on_air': 0
		});
		this.on_air = false;							// Is Proclaim "On Air"?
		this.on_air_session_id = '';					// Proclaim On Air Session ID
		this.on_air_successful = false;					// Were we able to connect to check Proclaim's On Air status?
		this.onair_poll_interval = undefined;			// The interval ID for polling On Air status
		this.proclaim_auth_required = true; 			// Does Proclaim require authentication for App Commands?
		this.proclaim_auth_successful = false; 			// Were we able to authenticate to Proclaim?
		this.proclaim_auth_token = config.auth_token;	// Proclaim authentication token

		this.init_onair_poll();
	}

	// When module gets deleted
	async destroy() {
		if (this.onair_poll_interval !== undefined) {
			clearInterval(this.onair_poll_interval);
		}
	}

	// When module config updated
	async configUpdated(config) {

		this.log('debug', 'Config updated');

		var do_reset = false;

		if (this.config.ip != config.ip) {
			do_reset = true;
		}
	
		this.config = config;
		this.proclaim_auth_token = config.auth_token;
	
		if (do_reset) {
			if (this.onair_poll_interval !== undefined) {
				clearInterval(this.onair_poll_interval);
			}
			this.init_onair_poll();
		}

		this.updateStatus(this.getStatus());
	}

	getStatus() {
		var self = this;

		if (!(self.config.ip)) {
			self.updateStatus(InstanceStatus.BadConfig);
			self.log('debug', 'Bad configuration: IP not specified');
			return;
		}

		if (!(self.on_air_successful)) {
			self.updateStatus(InstanceStatus.Disconnected);
			self.log('debug', 'Disconnected: could not get on air status');
			return;
		}

		if (self.proclaim_auth_required && !(self.proclaim_auth_successful)) {
			self.updateStatus(InstanceStatus.ConnectionFailure);
			self.log('debug', 'Connection failure: authentication required but unsuccessful');
			return;
		}

		self.updateStatus(InstanceStatus.Ok);
	}

	// Set up the regular polling of on-air status
	init_onair_poll() {
		var self = this;
		this.onair_poll_interval = setInterval(function() {
			self.onair_poll();
		}, 1000);
		this.onair_poll();
	}

	// Poll for on-air status
	async onair_poll() {
		var self = this;
	
		if (!self.config.ip) {
			self.updateStatus(self.getStatus());
			return;
		}

		const url = 'http://' + self.config.ip + ':52195' + '/onair/session';

		try {
			const data = await got(url, {
				timeout: {
					request: 1000
				},
				retry: {
					limit: 0
				}
			}).text();

			// If we got a session ID back, we're on air! If we got blank, we're off air
			if (data.length > 30) {
				self.on_air = true;
				self.on_air_session_id = data;
				self.on_air_successful = true;
				this.setVariableValues({
					'on_air': 1
				});
			} else {
				self.on_air = false;
				self.on_air_session_id = '';
				self.on_air_successful = true;
				this.setVariableValues({
					'on_air': 0
				});
			}
			self.checkFeedbacks('on_air');
			self.updateStatus(self.getStatus());
		} catch (error) {
			// Something went wrong obtaining on-air status - can't connect to Proclaim
			self.on_air = false;
			self.on_air_successful = false;
			self.on_air_session_id = '';
			this.setVariableValues({
				'on_air': 0
			});
			self.checkFeedbacks('on_air');
			self.updateStatus(self.getStatus());
		}
	}

	async sendAppCommand(command) {
		var self = this;

		const url = 'http://' + self.config.ip + ':52195' + '/appCommand/perform?appCommandName=' + command;

		const options = {
			timeout: {
				request: 1000
			},
			retry: {
				limit: 0
			},
		};

		if (self.proclaim_auth_required) {
			options.headers = {
				'ProclaimAuthToken': self.proclaim_auth_token,
			};

			// This shouldn't be necessary... but it is. Proclaim requires the ProclaimAuthToken header
			// name to be CamelCase, though the HTTP spec says header names are case-insensitive.
			options.hooks = {
				beforeRequest: [
					options => {
						options.headers['ProclaimAuthToken'] = options.headers['proclaimauthtoken'];
					}
				]
			};
		};

		try {
			const data = await got(url, options).text();
		} catch (error) {
			if ((error.response.statusCode == 401) && self.proclaim_auth_required ) {
				self.proclaim_auth_successful = false;
				self.updateStatus(InstanceStatus.ConnectionFailure);
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
			{
				type: 'textinput',
				id: 'auth_token',
				label: 'Proclaim auth token',
				width: 6,
			}
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