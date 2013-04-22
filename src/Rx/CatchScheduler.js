goog.provide("Rx.CatchScheduler")
goog.require("Rx.Scheduler")

/** @private */
Rx.CatchScheduler = function(scheduler, handler) {
	this._scheduler = scheduler;
	this._handler = handler;
	this._recursiveOriginal = null;
	this._recursiveWrapper = null;
	goog.base(this, function() {
		// localNow
		return this._scheduler.now();
	}, function(state, action) {
		// scheduleNow
		return this._scheduler.scheduleWithState(state, this._wrap(action));
	}, function(state, dueTime, action) {
		// scheduleRelative
		return this._scheduler.scheduleWithRelativeAndState(state, dueTime,
				this._wrap(action));
	}, function(state, dueTime, action) {
		// scheduleAbsolute
		return this._scheduler.scheduleWithAbsoluteAndState(state, dueTime,
				this._wrap(action));
	});
}
goog.inherits(CatchScheduler, Rx.Scheduler);

/** @private */
Rx.CatchScheduler.prototype._clone = function(scheduler) {
	return new CatchScheduler(scheduler, this._handler);
};

/** @private */
Rx.CatchScheduler.prototype._wrap = function(action) {
	var parent = this;
	return function(self, state) {
		try {
			return action(parent._getRecursiveWrapper(self), state);
		} catch (e) {
			if (!parent._handler(e)) {
				throw e;
			}
			return disposableEmpty;
		}
	};
};

/** @private */
Rx.CatchScheduler.prototype._getRecursiveWrapper = function(scheduler) {
	if (this._recursiveOriginal !== scheduler) {
		this._recursiveOriginal = scheduler;
		var wrapper = this._clone(scheduler);
		wrapper._recursiveOriginal = scheduler;
		wrapper._recursiveWrapper = wrapper;
		this._recursiveWrapper = wrapper;
	}
	return this._recursiveWrapper;
};

/** @private */
Rx.CatchScheduler.prototype.schedulePeriodicWithState = function(state, period,
		action) {
	var self = this, failed = false, d = new SingleAssignmentDisposable();

	d.setDisposable(this._scheduler.schedulePeriodicWithState(state, period,
			function(state1) {
				if (failed) {
					return null;
				}
				try {
					return action(state1);
				} catch (e) {
					failed = true;
					if (!self._handler(e)) {
						throw e;
					}
					d.dispose();
					return null;
				}
			}));

	return d;
};
