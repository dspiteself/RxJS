goog.provide("Rx.VirtualTimeScheduler")
goog.require("Rx.Scheduler")
goog.require("goog.structs.PriorityQueue")
goog.require("Rx.Internals.ScheduledItem")
/** Provides a set of extension methods for virtual time scheduling. */



/**
 * Creates a new virtual time scheduler with the specified initial clock value
 * and absolute time comparer.
 *
 * @constructor
 * @param {Number}
 *            initialClock Initial value for the clock.
 * @param {Function}
 *            comparer Comparer to determine causality of events based on
 *            absolute time.
 */
Rx.VirtualTimeScheduler = function(initialClock, comparer) {
	this.clock = initialClock;
	this.comparer = comparer;
	this.isEnabled = false;
	this.queue = new goog.structs.PriorityQueue(1024);
	Rx.Scheduler.call(this, function() {
		// localNow
		return this.toDateTimeOffset(this.clock);
	}, function(state, action) {
		// scheduleNow
		return this.scheduleAbsoluteWithState(state, this.clock, action);
	}, function(state, dueTime, action) {
		// scheduleRelative
		return this.scheduleRelativeWithState(state, this.toRelative(dueTime),
				action);
	}, function(state, dueTime, action) {
		// scheduleAbsolute
		return this.scheduleRelativeWithState(state, this.toRelative(dueTime
				- this.now()), action);
	});
}
goog.inherits(Rx.VirtualTimeScheduler, Rx.Scheduler);

Rx.VirtualTimeScheduler.invokeAction=function (scheduler, action) {
	action();
	return disposableEmpty;
}
/**
 * Schedules a periodic piece of work by dynamically discovering the scheduler's
 * capabilities. The periodic task will be emulated using recursive scheduling.
 *
 * @memberOf VirtualTimeScheduler#
 * @param {Mixed}
 *            state Initial state passed to the action upon the first iteration.
 * @param {Number}
 *            period Period for running the work periodically.
 * @param {Function}
 *            action Action to be executed, potentially updating the state.
 * @returns {Disposable} The disposable object used to cancel the scheduled
 *          recurring action (best effort).
 */
Rx.VirtualTimeScheduler.prototype.schedulePeriodicWithState = function(state,
		period, action) {
	var s = new SchedulePeriodicRecursive(this, state, period, action);
	return s.start();
};

/**
 * Schedules an action to be executed after dueTime.
 *
 * @memberOf VirtualTimeScheduler#
 * @param {Mixed}
 *            state State passed to the action to be executed.
 * @param {Number}
 *            dueTime Relative time after which to execute the action.
 * @param {Function}
 *            action Action to be executed.
 * @returns {Disposable} The disposable object used to cancel the scheduled
 *          action (best effort).
 */
Rx.VirtualTimeScheduler.prototype.scheduleRelativeWithState = function(state,
		dueTime, action) {
	var runAt = this.add(this.clock, dueTime);
	return this.scheduleAbsoluteWithState(state, runAt, action);
};

/**
 * Schedules an action to be executed at dueTime.
 *
 * @memberOf VirtualTimeScheduler#
 * @param {Number}
 *            dueTime Relative time after which to execute the action.
 * @param {Function}
 *            action Action to be executed.
 * @returns {Disposable} The disposable object used to cancel the scheduled
 *          action (best effort).
 */
Rx.VirtualTimeScheduler.prototype.scheduleRelative = function(dueTime, action) {
	return this.scheduleRelativeWithState(action, dueTime, Rx.VirtualTimeScheduler.invokeAction);
};

/**
 * Starts the virtual time scheduler.
 *
 * @memberOf VirtualTimeScheduler#
 */
Rx.VirtualTimeScheduler.prototype.start = function() {
	var next;
	if (!this.isEnabled) {
		this.isEnabled = true;
		do {
			next = this.getNext();
			if (next !== null) {
				if (this.comparer(next.dueTime, this.clock) > 0) {
					this.clock = next.dueTime;
				}
				next.invoke();
			} else {
				this.isEnabled = false;
			}
		} while (this.isEnabled);
	}
};

/**
 * Stops the virtual time scheduler.
 *
 * @memberOf VirtualTimeScheduler#
 */
Rx.VirtualTimeScheduler.prototype.stop = function() {
	this.isEnabled = false;
};

/**
 * Advances the scheduler's clock to the specified time, running all work till
 * that point.
 *
 * @param {Number}
 *            time Absolute time to advance the scheduler's clock to.
 */
Rx.VirtualTimeScheduler.prototype.advanceTo = function(time) {
	var next;
	var dueToClock = this.comparer(this.clock, time);
	if (this.comparer(this.clock, time) > 0) {
		throw new Error(argumentOutOfRange);
	}
	if (dueToClock === 0) {
		return;
	}
	if (!this.isEnabled) {
		this.isEnabled = true;
		do {
			next = this.getNext();
			if (next !== null && this.comparer(next.dueTime, time) <= 0) {
				if (this.comparer(next.dueTime, this.clock) > 0) {
					this.clock = next.dueTime;
				}
				next.invoke();
			} else {
				this.isEnabled = false;
			}
		} while (this.isEnabled);
		this.clock = time;
	}
};

/**
 * Advances the scheduler's clock by the specified relative time, running all
 * work scheduled for that timespan.
 *
 * @memberOf VirtualTimeScheduler#
 * @param {Number}
 *            time Relative time to advance the scheduler's clock by.
 */
Rx.VirtualTimeScheduler.prototype.advanceBy = function(time) {
	var dt = this.add(this.clock, time);
	var dueToClock = this.comparer(this.clock, dt);
	if (dueToClock > 0) {
		throw new Error(argumentOutOfRange);
	}
	if (dueToClock === 0) {
		return;
	}
	return this.advanceTo(dt);
};

/**
 * Advances the scheduler's clock by the specified relative time.
 *
 * @memberOf VirtualTimeScheduler#
 * @param {Number}
 *            time Relative time to advance the scheduler's clock by.
 */
Rx.VirtualTimeScheduler.prototype.sleep = function(time) {
	var dt = this.add(this.clock, time);

	if (this.comparer(this.clock, dt) >= 0) {
		throw new Error(argumentOutOfRange);
	}

	this.clock = dt;
};

/**
 * Gets the next scheduled item to be executed.
 *
 * @memberOf VirtualTimeScheduler#
 * @returns {ScheduledItem} The next scheduled item.
 */
Rx.VirtualTimeScheduler.prototype.getNext = function() {
	var next;
	while (this.queue.length > 0) {
		next = this.queue.peek();
		if (next.isCancelled()) {
			this.queue.dequeue();
		} else {
			return next;
		}
	}
	return null;
};

/**
 * Schedules an action to be executed at dueTime.
 *
 * @memberOf VirtualTimeScheduler#
 * @param {Scheduler}
 *            scheduler Scheduler to execute the action on.
 * @param {Number}
 *            dueTime Absolute time at which to execute the action.
 * @param {Function}
 *            action Action to be executed.
 * @returns {Disposable} The disposable object used to cancel the scheduled
 *          action (best effort).
 */
Rx.VirtualTimeScheduler.prototype.scheduleAbsolute = function(dueTime, action) {
	return this.scheduleAbsoluteWithState(action, dueTime, Rx.VirtualTimeScheduler.invokeAction);
};

/**
 * Schedules an action to be executed at dueTime.
 *
 * @memberOf VirtualTimeScheduler#
 * @param {Mixed}
 *            state State passed to the action to be executed.
 * @param {Number}
 *            dueTime Absolute time at which to execute the action.
 * @param {Function}
 *            action Action to be executed.
 * @returns {Disposable} The disposable object used to cancel the scheduled
 *          action (best effort).
 */
Rx.VirtualTimeScheduler.prototype.scheduleAbsoluteWithState = function(state,
		dueTime, action) {
	var self = this, run = function(scheduler, state1) {
		self.queue.remove(si);
		return action(scheduler, state1);
	}, si = new Rx.Internals.ScheduledItem(self, state, run, dueTime, self.comparer);
	self.queue.enqueue(si);
	return si.disposable;
};
