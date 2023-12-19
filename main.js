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

		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
		this.updateVariableDefinitions() // export variable definitions
		this.updatePresets() // export presets

		this.on_air = false;
		this.setVariableValues({
			'on_air': 0
		});
		this.on_air_session_id = '';
		this.onair_poll_interval = undefined;

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
	
		if (do_reset) {
			if (this.onair_poll_interval !== undefined) {
				clearInterval(this.onair_poll_interval);
			}
			this.init_onair_poll();
		}
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
			self.updateStatus(InstanceStatus.BadConfig);
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
				this.setVariableValues({
					'on_air': 1
				});
			} else {
				self.on_air = false;
				self.on_air_session_id = '';
				this.setVariableValues({
					'on_air': 0
				});
			}
			self.checkFeedbacks('on_air');
			self.updateStatus(InstanceStatus.Ok);

		} catch (error) {
			// Something went wrong obtaining on-air status - can't connect to Proclaim
			self.on_air = false;
			self.on_air_session_id = '';
			this.setVariableValues({
				'on_air': 0
			});
			self.checkFeedbacks('on_air');
			self.updateStatus(InstanceStatus.Disconnected);
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