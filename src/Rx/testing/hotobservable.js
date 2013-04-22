goog.provide("Rx.HotObservable")
goog.require("Rx.Observable")

/**
 * @private
 * @constructor
 */
Rx.HotObservable=function(scheduler, messages) {
	goog.base(this, function subscribe(observer) {
		var observable = this;
		this.observers.push(observer);
		this.subscriptions.push(new Subscription(this.scheduler.clock));
		var index = this.subscriptions.length - 1;
		return disposableCreate(function() {
			var idx = observable.observers.indexOf(observer);
			observable.observers.splice(idx, 1);
			observable.subscriptions[index] = new Subscription(
					observable.subscriptions[index].subscribe,
					observable.scheduler.clock);
		});
	});
	var message, notification, observable = this;
	this.scheduler = scheduler;
	this.messages = messages;
	this.subscriptions = [];
	this.observers = [];
	for ( var i = 0, len = this.messages.length; i < len; i++) {
		message = this.messages[i];
		notification = message.value;
		(function(innerNotification) {
			scheduler.scheduleAbsoluteWithState(null, message.time, function() {
				for ( var j = 0; j < observable.observers.length; j++) {
					innerNotification.accept(observable.observers[j]);
				}
				return disposableEmpty;
			});
		})(notification);
	}
}
goog.inherits(Rx.HotObservable, Rx.Observable);
