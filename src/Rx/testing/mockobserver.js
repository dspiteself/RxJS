goog.provide('Rx.MockObserver')
goog.require('Rx.Observer')

/*
 * @constructor @private
 */
Rx.MockObserver = function(scheduler) {
	goog.base(this);
	this.scheduler = scheduler;
	this.messages = [];
}
goog.inherits(Rx.MockObserver, Rx.Observer);

/*
 * @memberOf Rx.MockObserver.prototype# @private
 */
Rx.MockObserver.prototype.onNext = function(value) {
	this.messages.push(new Recorded(this.scheduler.clock, Notification
			.createOnNext(value)));
};

/*
 * @memberOf Rx.MockObserver.prototype# @private
 */
Rx.MockObserver.prototype.onError = function(exception) {
	this.messages.push(new Recorded(this.scheduler.clock, Notification
			.createOnError(exception)));
};

/*
 * @memberOf Rx.MockObserver.prototype# @private
 */
Rx.MockObserver.prototype.onCompleted = function() {
	this.messages.push(new Recorded(this.scheduler.clock, Notification
			.createOnCompleted()));
};
