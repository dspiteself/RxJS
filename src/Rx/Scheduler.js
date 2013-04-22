goog.provide("Rx.Scheduler")
goog.require("goog.structs.PriorityQueue")
/** Provides a set of static properties to access commonly used schedulers. */

/**
 * @constructor
 * @private
 */
Rx.Scheduler = function(now, schedule, scheduleRelative, scheduleAbsolute) {
	this.now = now;
	this._schedule = schedule;
	this._scheduleRelative = scheduleRelative;
	this._scheduleAbsolute = scheduleAbsolute;
}
Rx.Scheduler.defaultNow= function() { return new Date().getTime(); }
Rx.Scheduler.invokeRecImmediate = function(scheduler, pair) {
	var state = pair.first, action = pair.second, group = new CompositeDisposable(), recursiveAction = function(
			state1) {
		action(state1, function(state2) {
			var isAdded = false, isDone = false, d = scheduler
					.scheduleWithState(state2, function(scheduler1, state3) {
						if (isAdded) {
							group.remove(d);
						} else {
							isDone = true;
						}
						recursiveAction(state3);
						return disposableEmpty;
					});
			if (!isDone) {
				group.add(d);
				isAdded = true;
			}
		});
	};
	recursiveAction(state);
	return group;
}

Rx.Scheduler.invokeRecDate = function(scheduler, pair, method) {
	var state = pair.first, action = pair.second, group = new CompositeDisposable(), recursiveAction = function(
			state1) {
		action(state1, function(state2, dueTime1) {
			var isAdded = false, isDone = false, d = scheduler[method].call(
					scheduler, state2, dueTime1, function(scheduler1, state3) {
						if (isAdded) {
							group.remove(d);
						} else {
							isDone = true;
						}
						recursiveAction(state3);
						return disposableEmpty;
					});
			if (!isDone) {
				group.add(d);
				isAdded = true;
			}
		});
	};
	recursiveAction(state);
	return group;
}

Rx.Scheduler.invokeAction = function(scheduler, action) {
	action();
	return disposableEmpty;
}

/**
 * Returns a scheduler that wraps the original scheduler, adding exception
 * handling for scheduled actions.
 * 
 * @memberOf Scheduler#
 * @param {Function}
 *            handler Handler that's run if an exception is caught. The
 *            exception will be rethrown if the handler returns false.
 * @returns {Scheduler} Wrapper around the original scheduler, enforcing
 *          exception handling.
 */
Rx.Scheduler.prototype.catchException = function(handler) {
	return new CatchScheduler(this, handler);
};

/**
 * Schedules a periodic piece of work by dynamically discovering the scheduler's
 * capabilities. The periodic task will be scheduled using window.setInterval
 * for the base implementation.
 * 
 * @memberOf Scheduler#
 * @param {Number}
 *            period Period for running the work periodically.
 * @param {Function}
 *            action Action to be executed.
 * @returns {Disposable} The disposable object used to cancel the scheduled
 *          recurring action (best effort).
 */
Rx.Scheduler.prototype.schedulePeriodic = function(period, action) {
	return this.schedulePeriodicWithState(null, period, function() {
		action();
	});
};

/**
 * Schedules a periodic piece of work by dynamically discovering the scheduler's
 * capabilities. The periodic task will be scheduled using window.setInterval
 * for the base implementation.
 * 
 * @memberOf Scheduler#
 * @param {Mixed}
 *            state Initial state passed to the action upon the first iteration.
 * @param {Number}
 *            period Period for running the work periodically.
 * @param {Function}
 *            action Action to be executed, potentially updating the state.
 * @returns {Disposable} The disposable object used to cancel the scheduled
 *          recurring action (best effort).
 */
Rx.Scheduler.prototype.schedulePeriodicWithState = function(state, period,
		action) {
	var s = state, id = window.setInterval(function() {
		s = action(s);
	}, period);
	return disposableCreate(function() {
		window.clearInterval(id);
	});
};

/**
 * Schedules an action to be executed.
 * 
 * @memberOf Scheduler#
 * @param {Function}
 *            action Action to execute.
 * @returns {Disposable} The disposable object used to cancel the scheduled
 *          action (best effort).
 */
Rx.Scheduler.prototype.schedule = function(action) {
	return this._schedule(action, invokeAction);
};

/**
 * Schedules an action to be executed.
 * 
 * @memberOf Scheduler#
 * @param state
 *            State passed to the action to be executed.
 * @param {Function}
 *            action Action to be executed.
 * @returns {Disposable} The disposable object used to cancel the scheduled
 *          action (best effort).
 */
Rx.Scheduler.prototype.scheduleWithState = function(state, action) {
	return this._schedule(state, action);
};

/**
 * Schedules an action to be executed after the specified relative due time.
 * 
 * @memberOf Scheduler#
 * @param {Function}
 *            action Action to execute.
 * @param {Number}dueTime
 *            Relative time after which to execute the action.
 * @returns {Disposable} The disposable object used to cancel the scheduled
 *          action (best effort).
 */
Rx.Scheduler.prototype.scheduleWithRelative = function(dueTime, action) {
	return this._scheduleRelative(action, dueTime, invokeAction);
};

/**
 * Schedules an action to be executed after dueTime.
 * 
 * @memberOf Scheduler#
 * @param state
 *            State passed to the action to be executed.
 * @param {Function}
 *            action Action to be executed.
 * @param {Number}dueTime
 *            Relative time after which to execute the action.
 * @returns {Disposable} The disposable object used to cancel the scheduled
 *          action (best effort).
 */
Rx.Scheduler.prototype.scheduleWithRelativeAndState = function(state, dueTime,
		action) {
	return this._scheduleRelative(state, dueTime, action);
};

/**
 * Schedules an action to be executed at the specified absolute due time.
 * 
 * @memberOf Scheduler#
 * @param {Function}
 *            action Action to execute.
 * @param {Number}dueTime
 *            Absolute time at which to execute the action.
 * @returns {Disposable} The disposable object used to cancel the scheduled
 *          action (best effort).
 */
Rx.Scheduler.prototype.scheduleWithAbsolute = function(dueTime, action) {
	return this._scheduleAbsolute(action, dueTime, invokeAction);
};

/**
 * Schedules an action to be executed at dueTime.
 * 
 * @memberOf Scheduler#
 * @param {Mixed}
 *            state State passed to the action to be executed.
 * @param {Function}
 *            action Action to be executed.
 * @param {Number}dueTime
 *            Absolute time at which to execute the action.
 * @returns {Disposable} The disposable object used to cancel the scheduled
 *          action (best effort).
 */
Rx.Scheduler.prototype.scheduleWithAbsoluteAndState = function(state, dueTime,
		action) {
	return this._scheduleAbsolute(state, dueTime, action);
};

/**
 * Schedules an action to be executed recursively.
 * 
 * @memberOf Scheduler#
 * @param {Function}
 *            action Action to execute recursively. The parameter passed to the
 *            action is used to trigger recursive scheduling of the action.
 * @returns {Disposable} The disposable object used to cancel the scheduled
 *          action (best effort).
 */
Rx.Scheduler.prototype.scheduleRecursive = function(action) {
	return this.scheduleRecursiveWithState(action, function(_action, self) {
		_action(function() {
			self(_action);
		});
	});
};

/**
 * Schedules an action to be executed recursively.
 * 
 * @memberOf Scheduler#
 * @param {Mixed}
 *            state State passed to the action to be executed.
 * @param {Function}
 *            action Action to execute recursively. The last parameter passed to
 *            the action is used to trigger recursive scheduling of the action,
 *            passing in recursive invocation state.
 * @returns {Disposable} The disposable object used to cancel the scheduled
 *          action (best effort).
 */
Rx.Scheduler.prototype.scheduleRecursiveWithState = function(state, action) {
	return this.scheduleWithState({
		first : state,
		second : action
	}, function(s, p) {
		return invokeRecImmediate(s, p);
	});
};

/**
 * Schedules an action to be executed recursively after a specified relative due
 * time.
 * 
 * @memberOf Scheduler
 * @param {Function}
 *            action Action to execute recursively. The parameter passed to the
 *            action is used to trigger recursive scheduling of the action at
 *            the specified relative time.
 * @param {Number}dueTime
 *            Relative time after which to execute the action for the first
 *            time.
 * @returns {Disposable} The disposable object used to cancel the scheduled
 *          action (best effort).
 */
Rx.Scheduler.prototype.scheduleRecursiveWithRelative = function(dueTime, action) {
	return this.scheduleRecursiveWithRelativeAndState(action, dueTime,
			function(_action, self) {
				_action(function(dt) {
					self(_action, dt);
				});
			});
};

/**
 * Schedules an action to be executed recursively after a specified relative due
 * time.
 * 
 * @memberOf Scheduler
 * @param {Mixed}
 *            state State passed to the action to be executed.
 * @param {Function}
 *            action Action to execute recursively. The last parameter passed to
 *            the action is used to trigger recursive scheduling of the action,
 *            passing in the recursive due time and invocation state.
 * @param {Number}dueTime
 *            Relative time after which to execute the action for the first
 *            time.
 * @returns {Disposable} The disposable object used to cancel the scheduled
 *          action (best effort).
 */
Rx.Scheduler.prototype.scheduleRecursiveWithRelativeAndState = function(state,
		dueTime, action) {
	return this._scheduleRelative({
		first : state,
		second : action
	}, dueTime, function(s, p) {
		return invokeRecDate(s, p, 'scheduleWithRelativeAndState');
	});
};

/**
 * Schedules an action to be executed recursively at a specified absolute due
 * time.
 * 
 * @memberOf Scheduler
 * @param {Function}
 *            action Action to execute recursively. The parameter passed to the
 *            action is used to trigger recursive scheduling of the action at
 *            the specified absolute time.
 * @param {Number}dueTime
 *            Absolute time at which to execute the action for the first time.
 * @returns {Disposable} The disposable object used to cancel the scheduled
 *          action (best effort).
 */
Rx.Scheduler.prototype.scheduleRecursiveWithAbsolute = function(dueTime, action) {
	return this.scheduleRecursiveWithAbsoluteAndState(action, dueTime,
			function(_action, self) {
				_action(function(dt) {
					self(_action, dt);
				});
			});
};

/**
 * Schedules an action to be executed recursively at a specified absolute due
 * time.
 * 
 * @memberOf Scheduler
 * @param {Mixed}
 *            state State passed to the action to be executed.
 * @param {Function}
 *            action Action to execute recursively. The last parameter passed to
 *            the action is used to trigger recursive scheduling of the action,
 *            passing in the recursive due time and invocation state.
 * @param {Number}dueTime
 *            Absolute time at which to execute the action for the first time.
 * @returns {Disposable} The disposable object used to cancel the scheduled
 *          action (best effort).
 */
Rx.Scheduler.prototype.scheduleRecursiveWithAbsoluteAndState = function(state,
		dueTime, action) {
	return this._scheduleAbsolute({
		first : state,
		second : action
	}, dueTime, function(s, p) {
		return invokeRecDate(s, p, 'scheduleWithAbsoluteAndState');
	});
};

/** Gets the current time according to the local machine's system clock. */
Rx.Scheduler.now = Rx.Scheduler.defaultNow;

/**
 * Normalizes the specified TimeSpan value to a positive value.
 * 
 * @static
 * @memberOf Scheduler
 * @param {Number}
 *            timeSpan The time span value to normalize.
 * @returns {Number} The specified TimeSpan value if it is zero or positive;
 *          otherwise, 0
 */
Rx.Scheduler.normalize = function(timeSpan) {
	if (timeSpan < 0) {
		timeSpan = 0;
	}
	return timeSpan;
};

var schedulerNoBlockError = 'Scheduler is not allowed to block the thread';

/**
 * Gets a scheduler that schedules work immediately on the current thread.
 * 
 * @memberOf Scheduler
 */
Rx.Scheduler.immediate = (function() {

	function scheduleNow(state, action) {
		return action(this, state);
	}

	function scheduleRelative(state, dueTime, action) {
		if (dueTime > 0)
			throw new Error(schedulerNoBlockError);
		return action(this, state);
	}

	function scheduleAbsolute(state, dueTime, action) {
		return this.scheduleWithRelativeAndState(state, dueTime - this.now(),
				action);
	}

	return new Rx.Scheduler(Rx.Scheduler.defaultNow, scheduleNow, scheduleRelative,
			scheduleAbsolute);
}());

/**
 * Gets a scheduler that schedules work as soon as possible on the current
 * thread.
 */
Rx.Scheduler.currentThread = (function() {
	var queue;

	/**
	 * @private
	 * @constructor
	 */
	function Trampoline() {
		goog.structs.PriorityQueue()
		queue = new PriorityQueue(4);
	}

	/**
	 * @private
	 * @memberOf Trampoline
	 */
	Trampoline.prototype.dispose = function() {
		queue = null;
	};

	/**
	 * @private
	 * @memberOf Trampoline
	 */
	Trampoline.prototype.run = function() {
		var item;
		while (queue.length > 0) {
			item = queue.dequeue();
			if (!item.isCancelled()) {
				while (item.dueTime - Scheduler.now() > 0) {
				}
				if (!item.isCancelled()) {
					item.invoke();
				}
			}
		}
	};

	function scheduleNow(state, action) {
		return this.scheduleWithRelativeAndState(state, 0, action);
	}

	function scheduleRelative(state, dueTime, action) {
		var dt = this.now() + Scheduler.normalize(dueTime), si = new ScheduledItem(
				this, state, action, dt), t;
		if (!queue) {
			t = new Trampoline();
			try {
				queue.enqueue(si);
				t.run();
			} catch (e) {
				throw e;
			} finally {
				t.dispose();
			}
		} else {
			queue.enqueue(si);
		}
		return si.disposable;
	}

	function scheduleAbsolute(state, dueTime, action) {
		return this.scheduleWithRelativeAndState(state, dueTime - this.now(),
				action);
	}

	var currentScheduler = new Rx.Scheduler(Rx.Scheduler.defaultNow, scheduleNow,
			scheduleRelative, scheduleAbsolute);
	currentScheduler.scheduleRequired = function() {
		return queue === null;
	};
	currentScheduler.ensureTrampoline = function(action) {
		if (queue === null) {
			return this.schedule(action);
		} else {
			return action();
		}
	};

	return currentScheduler;
}());

/**
 * @private
 */
var SchedulePeriodicRecursive = (function() {
	function tick(command, recurse) {
		recurse(0, this._period);
		try {
			this._state = this._action(this._state);
		} catch (e) {
			this._cancel.dispose();
			throw e;
		}
	}

	/**
	 * @constructor
	 * @private
	 */
	function SchedulePeriodicRecursive(scheduler, state, period, action) {
		this._scheduler = scheduler;
		this._state = state;
		this._period = period;
		this._action = action;
	}

	SchedulePeriodicRecursive.prototype.start = function() {
		var d = new SingleAssignmentDisposable();
		this._cancel = d;
		d.setDisposable(this._scheduler.scheduleRecursiveWithRelativeAndState(
				0, this._period, tick.bind(this)));

		return d;
	};

	return SchedulePeriodicRecursive;
}());





var scheduleMethod, clearMethod = goog.nullFunction;
(function() {
	function postMessageSupported() {
		// Ensure not in a worker
		if (!window.postMessage || window.importScripts) {
			return false;
		}
		var isAsync = false, oldHandler = window.onmessage;
		// Test for async
		window.onmessage = function() {
			isAsync = true;
		};
		window.postMessage('', '*');
		window.onmessage = oldHandler;

		return isAsync;
	}

	if (typeof window.process === 'object'
			&& Object.prototype.toString.call(window.process) === '[object process]') {
		scheduleMethod = window.process.nextTick;
	} else if (typeof window.setImmediate === 'function') {
		scheduleMethod = window.setImmediate;
		clearMethod = window.clearImmediate;
	} else if (postMessageSupported()) {
		var MSG_PREFIX = 'ms.rx.schedule' + Math.random(), tasks = {}, taskId = 0;

		function onGlobalPostMessage(event) {
			// Only if we're a match to avoid any other global events
			if (typeof event.data === 'string'
					&& event.data.substring(0, MSG_PREFIX.length) === MSG_PREFIX) {
				var handleId = event.data.substring(MSG_PREFIX.length), action = tasks[handleId];
				action();
				delete tasks[handleId];
			}
		}

		if (window.addEventListener) {
			window.addEventListener('message', onGlobalPostMessage, false);
		} else {
			window.attachEvent('onmessage', onGlobalPostMessage, false);
		}

		scheduleMethod = function(action) {
			var currentId = taskId++;
			tasks[currentId] = action;
			window.postMessage(MSG_PREFIX + currentId, '*');
		};
	} else if (!!window.MessageChannel) {
		var channel = new window.MessageChannel(), channelTasks = {}, channelTaskId = 0;

		channel.port1.onmessage = function(event) {
			var id = event.data, action = channelTasks[id];
			action();
			delete channelTasks[id];
		};

		scheduleMethod = function(action) {
			var id = channelTaskId++;
			channelTasks[id] = action;
			channel.port2.postMessage(id);
		};
	} else if ('document' in window
			&& 'onreadystatechange' in window.document.createElement('script')) {

		scheduleMethod = function(action) {
			var scriptElement = window.document.createElement('script');
			scriptElement.onreadystatechange = function() {
				action();
				scriptElement.onreadystatechange = null;
				scriptElement.parentNode.removeChild(scriptElement);
				scriptElement = null;
			};
			window.document.documentElement.appendChild(scriptElement);
		};

	} else {
		scheduleMethod = function(action) {
			return window.setTimeout(action, 0);
		};
		clearMethod = window.clearTimeout;
	}
}());

/**
 * Gets a scheduler that schedules work via a timed callback based upon
 * platform.
 * 
 * @memberOf Scheduler
 */
Rx.Scheduler.timeout = (function() {

	function scheduleNow(state, action) {
		var scheduler = this, disposable = new SingleAssignmentDisposable();
		var id = scheduleMethod(function() {
			if (!disposable.isDisposed) {
				disposable.setDisposable(action(scheduler, state));
			}
		});
		return new CompositeDisposable(disposable, disposableCreate(function() {
			clearMethod(id);
		}));
	}

	function scheduleRelative(state, dueTime, action) {
		var scheduler = this, dt = Scheduler.normalize(dueTime);
		if (dt === 0) {
			return scheduler.scheduleWithState(state, action);
		}
		var disposable = new SingleAssignmentDisposable();
		var id = window.setTimeout(function() {
			if (!disposable.isDisposed) {
				disposable.setDisposable(action(scheduler, state));
			}
		}, dt);
		return new CompositeDisposable(disposable, disposableCreate(function() {
			window.clearTimeout(id);
		}));
	}

	function scheduleAbsolute(state, dueTime, action) {
		return this.scheduleWithRelativeAndState(state, dueTime - this.now(),
				action);
	}

	return new Rx.Scheduler(Rx.Scheduler.defaultNow, scheduleNow, scheduleRelative,
			scheduleAbsolute);
})();

