goog.provide('Rx.TestScheduler')
goog.require('Rx.VirtualTimeScheduler')
goog.require("Rx.HotObservable")
goog.require("Rx.testing.MockObserver")
// Defaults
    var Observer = Rx.Observer,
        Observable = Rx.Observable,
        Notification = Rx.Notification,
        slice = Array.prototype.slice,
        VirtualTimeScheduler = Rx.VirtualTimeScheduler

    // Utilities
    function defaultComparer(x, y) {
        if (!y.equals) {
            return x === y;
        }
        return y.equals(x);
    }

    function argsOrArray(args, idx) {
        return args.length === 1 && Array.isArray(args[idx]) ?
            args[idx] :
            slice.call(args);
    }

/**
 * Virtual time scheduler used for testing applications and libraries built
 * using Reactive Extensions.
 */

/** @constructor */
 Rx.TestScheduler= function() {
	goog.base(this, 0, function(a, b) {
		return a - b;
	});
}
goog.inherits(Rx.TestScheduler, Rx.VirtualTimeScheduler);
/**
 * Schedules an action to be executed at the specified virtual time.
 *
 * @param state
 *            State passed to the action to be executed.
 * @param dueTime
 *            Absolute virtual time at which to execute the action.
 * @param action
 *            Action to be executed.
 * @return Disposable object used to cancel the scheduled action (best effort).
 */
Rx.TestScheduler.prototype.scheduleAbsoluteWithState = function(state, dueTime,
		action) {
	if (dueTime <= this.clock) {
		dueTime = this.clock + 1;
	}
	return Rx.VirtualTimeScheduler.prototype.scheduleAbsoluteWithState.call(this, state,
			dueTime, action);
};
/**
 * Adds a relative virtual time to an absolute virtual time value.
 *
 * @param absolute
 *            Absolute virtual time value.
 * @param relative
 *            Relative virtual time value to add.
 * @return Resulting absolute virtual time sum value.
 */
Rx.TestScheduler.prototype.add = function(absolute, relative) {
	return absolute + relative;
};
/**
 * Converts the absolute virtual time value to a DateTimeOffset value.
 *
 * @param absolute
 *            Absolute virtual time value to convert.
 * @return Corresponding DateTimeOffset value.
 */
Rx.TestScheduler.prototype.toDateTimeOffset = function(absolute) {
	return new Date(absolute).getTime();
};
/**
 * Converts the TimeSpan value to a relative virtual time value.
 *
 * @param timeSpan
 *            TimeSpan value to convert.
 * @return Corresponding relative virtual time value.
 */
Rx.TestScheduler.prototype.toRelative = function(timeSpan) {
	return timeSpan;
};
/**
 * Starts the test scheduler and uses the specified virtual times to invoke the
 * factory function, subscribe to the resulting sequence, and dispose the
 * subscription.
 *
 * @param create
 *            Factory method to create an observable sequence.
 * @param created
 *            Virtual time at which to invoke the factory to create an
 *            observable sequence.
 * @param subscribed
 *            Virtual time at which to subscribe to the created observable
 *            sequence.
 * @param disposed
 *            Virtual time at which to dispose the subscription.
 * @return Observer with timestamped recordings of notification messages that
 *         were received during the virtual time window when the subscription to
 *         the source sequence was active.
 */
Rx.TestScheduler.prototype.startWithTiming = function(create, created, subscribed,
		disposed) {
	var observer = this.createObserver(), source, subscription;
	this.scheduleAbsoluteWithState(null, created, function() {
		source = create();
		return disposableEmpty;
	});
	this.scheduleAbsoluteWithState(null, subscribed, function() {
		subscription = source.subscribe(observer);
		return disposableEmpty;
	});
	this.scheduleAbsoluteWithState(null, disposed, function() {
		subscription.dispose();
		return disposableEmpty;
	});
	this.start();
	return observer;
};
/**
 * Starts the test scheduler and uses the specified virtual time to dispose the
 * subscription to the sequence obtained through the factory function. Default
 * virtual times are used for factory invocation and sequence subscription.
 *
 * @param create
 *            Factory method to create an observable sequence.
 * @param disposed
 *            Virtual time at which to dispose the subscription.
 * @return Observer with timestamped recordings of notification messages that
 *         were received during the virtual time window when the subscription to
 *         the source sequence was active.
 */
Rx.TestScheduler.prototype.startWithDispose = function(create, disposed) {
	return this.startWithTiming(create, ReactiveTest.created,
			ReactiveTest.subscribed, disposed);
};
/**
 * Starts the test scheduler and uses default virtual times to invoke the
 * factory function, to subscribe to the resulting sequence, and to dispose the
 * subscription</see>.
 *
 * @param create
 *            Factory method to create an observable sequence.
 * @return Observer with timestamped recordings of notification messages that
 *         were received during the virtual time window when the subscription to
 *         the source sequence was active.
 */
Rx.TestScheduler.prototype.startWithCreate = function(create) {
	return this.startWithTiming(create, ReactiveTest.created,
			ReactiveTest.subscribed, ReactiveTest.disposed);
};
/**
 * Creates a hot observable using the specified timestamped notification
 * messages either as an array or arguments.
 *
 * @param messages
 *            Notifications to surface through the created sequence at their
 *            specified absolute virtual times.
 * @return Hot observable sequence that can be used to assert the timing of
 *         subscriptions and notifications.
 */
Rx.TestScheduler.prototype.createHotObservable = function() {
	var messages = argsOrArray(arguments, 0);
	return new Rx.HotObservable(this, messages);
};
/**
 * Creates a cold observable using the specified timestamped notification
 * messages either as an array or arguments.
 *
 * @param messages
 *            Notifications to surface through the created sequence at their
 *            specified virtual time offsets from the sequence subscription
 *            time.
 * @return Cold observable sequence that can be used to assert the timing of
 *         subscriptions and notifications.
 */
Rx.TestScheduler.prototype.createColdObservable = function() {
	var messages = argsOrArray(arguments, 0);
	return new ColdObservable(this, messages);
};
/**
 * Creates an observer that records received notification messages and
 * timestamps those.
 *
 * @return Observer that can be used to assert the timing of received
 *         notifications.
 */
Rx.TestScheduler.prototype.createObserver = function() {
	return new Rx.testing.MockObserver(this);
};
