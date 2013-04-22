goog.provide("Rx.AnonymousSubject")
goog.require("Rx.Observable")
goog.require("Rx.Observer")

/**
 * @private
 * @constructor
 */
Rx.AnonymousSubject = function(observer, observable) {
	goog.base(this, function subscribe(observer) {
		return this.Rx.Observable.subscribe(observer);
	});
	this.observer = observer;
	this.observable = observable;
}
goog.inherits(Rx.AnonymousSubject, Rx.Observable);
goog.mixin(Rx.AnonymousSubject.prototype, Rx.Observer.prototype);
/**
 * @private
 * @memberOf AnonymousSubject#
 */
Rx.AnonymousSubject.prototype.onCompleted = function() {
	this.observer.onCompleted();
},
/**
 * @private
 * @memberOf AnonymousSubject#
 */
Rx.AnonymousSubject.prototype.onError = function(exception) {
	this.observer.onError(exception);
},
/**
 * @private
 * @memberOf AnonymousSubject#
 */
Rx.AnonymousSubject.prototype.onNext = function(value) {
	this.observer.onNext(value);
}
