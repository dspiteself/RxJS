goog.provide("Rx.AutoDetachObserver")
goog.require("Rx.Observer")

/**
 * @private
 * @constructor
 */
Rx.AutoDetachObserver = function(observer) {
	goog.base(this);
	this.observer = observer;
	this.m = new SingleAssignmentDisposable();
}
goog.inherits(Rx.AutoDetachObserver, Rx.Observer);

/**
 * @private
 * @memberOf Rx.AutoDetachObserver#
 */
Rx.AutoDetachObserver.prototype.next = function(value) {
	var noError = false;
	try {
		this.observer.onNext(value);
		noError = true;
	} catch (e) {
		throw e;
	} finally {
		if (!noError) {
			this.dispose();
		}
	}
};

/**
 * @private
 * @memberOf Rx.AutoDetachObserver#
 */
Rx.AutoDetachObserver.prototype.error = function(exn) {
	try {
		this.observer.onError(exn);
	} catch (e) {
		throw e;
	} finally {
		this.dispose();
	}
};


/**
 * @private
 * @memberOf Rx.AutoDetachObserver#
 */
Rx.AutoDetachObserver.prototype.completed = function() {
	try {
		this.observer.onCompleted();
	} catch (e) {
		throw e;
	} finally {
		this.dispose();
	}
};

/**
 * @private
 * @memberOf Rx.AutoDetachObserver#
 */
Rx.AutoDetachObserver.prototype.disposable = function(value) {
	return this.m.disposable(value);
};

/**
 * @private
 * @memberOf Rx.AutoDetachObserver#
 */
Rx.AutoDetachObserver.prototype.dispose = function() {
	_super.prototype.dispose.call(this);
	this.m.dispose();
};
