goog.provide("Rx.Subject")
goog.require("Rx.Observable")
goog.require("Rx.Observer")
/**
 * Represents an object that is both an observable sequence as well as an
 * observer. Each notification is broadcasted to all subscribed observers.
 */

/**
 * Creates a subject.
 * 
 * @constructor
 */
Rx.Subject = function() {
	goog.base(this, function(observer) {
		checkDisposed.call(this);
		if (!this.isStopped) {
			this.observers.push(observer);
			return new Rx.InnerSubscription(this, observer);
		}
		if (this.exception) {
			observer.onError(this.exception);
			return disposableEmpty;
		}
		observer.onCompleted();
		return disposableEmpty;
	});
	this.isDisposed = false, this.isStopped = false, this.observers = [];
}
goog.inherits(Rx.Subject, Rx.Observable);
goog.mixin(Rx.Subject.prototype, Rx.Observer.prototype)

/**
 * Indicates whether the subject has observers subscribed to it.
 * 
 * @memberOf ReplaySubject#
 * @returns {Boolean} Indicates whether the subject has observers subscribed to
 *          it.
 */
Rx.Subject.prototype.hasObservers = function() {
	return this.observers.length > 0;
},
/**
 * Notifies all subscribed observers about the end of the sequence.
 * 
 * @memberOf ReplaySubject#
 */
Rx.Subject.prototype.onCompleted = function() {
	checkDisposed.call(this);
	if (!this.isStopped) {
		var os = this.observers.slice(0);
		this.isStopped = true;
		for ( var i = 0, len = os.length; i < len; i++) {
			os[i].onCompleted();
		}

		this.observers = [];
	}
}
/**
 * Notifies all subscribed observers about the exception.
 * 
 * @memberOf ReplaySubject#
 * @param {Mixed}
 *            error The exception to send to all observers.
 */
Rx.Subject.prototype.onError = function(exception) {
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
}
/**
 * Notifies all subscribed observers about the arrival of the specified element
 * in the sequence.
 * 
 * @memberOf ReplaySubject#
 * @param {Mixed}
 *            value The value to send to all observers.
 */
Rx.Subject.prototype.onNext = function(value) {
	checkDisposed.call(this);
	if (!this.isStopped) {
		var os = this.observers.slice(0);
		for ( var i = 0, len = os.length; i < len; i++) {
			os[i].onNext(value);
		}
	}
}
/**
 * Unsubscribe all observers and release resources.
 * 
 * @memberOf ReplaySubject#
 */
Rx.Subject.prototype.dispose = function() {
	this.isDisposed = true;
	this.observers = null;
}

/**
 * Creates a subject from the specified observer and Rx.Observable.
 * 
 * @static
 * @memberOf Subject
 * @param {Observer}
 *            observer The observer used to send messages to the subject.
 * @param {Observable}
 *            observable The observable used to subscribe to messages sent from
 *            the subject.
 * @returns {Subject} Subject implemented using the given observer and
 *          Rx.Observable.
 */
Rx.Subject.create = function(observer, observable) {
	return new AnonymousSubject(observer, observable);
};

