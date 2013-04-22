goog.provide("Rx.AsyncSubject")
goog.require("Rx.Observable")
goog.require("Rx.Observer")
/**
 * Represents the result of an asynchronous operation. The last value before the
 * OnCompleted notification, or the error received through OnError, is sent to
 * all subscribed observers.
 */

/**
 * Creates a subject that can only receive one value and that value is cached
 * for all future observations.
 * 
 * @constructor
 */
Rx.AsyncSubject = function() {
	goog.base(this, function(observer) {
		checkDisposed.call(this);
		if (!this.isStopped) {
			this.observers.push(observer);
			return new Rx.InnerSubscription(this, observer);
		}
		var ex = this.exception;
		var hv = this.hasValue;
		var v = this.value;
		if (ex) {
			observer.onError(ex);
		} else if (hv) {
			observer.onNext(v);
			observer.onCompleted();
		} else {
			observer.onCompleted();
		}
		return disposableEmpty;
	});

	this.isDisposed = false, this.isStopped = false, this.value = null,
			this.hasValue = false, this.observers = [], this.exception = null;
}
goog.inherits(Rx.AsyncSubject, Rx.Observable);
goog.mixin(Rx.AsyncSubject.prototype, Rx.Observer.prototype)

/**
 * Indicates whether the subject has observers subscribed to it.
 * 
 * @memberOf AsyncSubject#
 * @returns {Boolean} Indicates whether the subject has observers subscribed to
 *          it.
 */
Rx.AsyncSubject.prototype.hasObservers = function() {
	return this.observers.length > 0;
},
/**
 * Notifies all subscribed observers about the end of the sequence, also causing
 * the last received value to be sent out (if any).
 * 
 * @memberOf AsyncSubject#
 */
Rx.AsyncSubject.prototype.onCompleted = function() {
	var o, i, len;
	checkDisposed.call(this);
	if (!this.isStopped) {
		var os = this.observers.slice(0);
		this.isStopped = true;
		var v = this.value;
		var hv = this.hasValue;

		if (hv) {
			for (i = 0, len = os.length; i < len; i++) {
				o = os[i];
				o.onNext(v);
				o.onCompleted();
			}
		} else {
			for (i = 0, len = os.length; i < len; i++) {
				os[i].onCompleted();
			}
		}

		this.observers = [];
	}
},
/**
 * Notifies all subscribed observers about the exception.
 * 
 * @memberOf AsyncSubject#
 * @param {Mixed}
 *            error The exception to send to all observers.
 */
Rx.AsyncSubject.prototype.onError = function(exception) {
	checkDisposed.call(this);
	if (!this.isStopped) {
		var os = this.observers.slice(0);
		this.isStopped = true;
		this.exception = exception;

		for ( var i = 0, len = os.length; i < len; i++) {
			os[i].onError(exception);
		}

		this.observers = [];
	}
},
/**
 * Sends a value to the subject. The last value received before successful
 * termination will be sent to all subscribed and future observers.
 * 
 * @memberOf AsyncSubject#
 * @param {Mixed}
 *            value The value to store in the subject.
 */
Rx.AsyncSubject.prototype.onNext = function(value) {
	checkDisposed.call(this);
	if (!this.isStopped) {
		this.value = value;
		this.hasValue = true;
	}
}
/**
 * Unsubscribe all observers and release resources.
 * 
 * @memberOf AsyncSubject#
 */
Rx.AsyncSubject.prototype.dispose = function() {
	this.isDisposed = true;
	this.observers = null;
	this.exception = null;
	this.value = null;
}


