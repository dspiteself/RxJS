goog.provide('Rx.ScheduledItem')
goog.require('Rx.SingleAssignmentDisposable')

/**
 * @private
 * @constructor
 */
Rx.ScheduledItem = function(scheduler, state, action, dueTime, comparer) {
	this.scheduler = scheduler;
	this.state = state;
	this.action = action;
	this.dueTime = dueTime;
	this.comparer = comparer || defaultSubComparer;
	this.disposable = new Rx.SingleAssignmentDisposable();
}

/**
 * @private
 * @memberOf ScheduledItem#
 */
Rx.ScheduledItem.prototype.invoke = function() {
	this.disposable.disposable(this.invokeCore());
};

/**
 * @private
 * @memberOf ScheduledItem#
 */
Rx.ScheduledItem.prototype.compareTo = function(other) {
	return this.comparer(this.dueTime, other.dueTime);
};

/**
 * @private
 * @memberOf ScheduledItem#
 */
Rx.ScheduledItem.prototype.isCancelled = function() {
	return this.disposable.isDisposed;
};

/**
 * @private
 * @memberOf ScheduledItem#
 */
Rx.ScheduledItem.prototype.invokeCore = function() {
	return this.action(this.scheduler, this.state);
};
