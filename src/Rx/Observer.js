goog.provide("Rx.Observer")
goog.provide("Rx.Internals.AbstractObserver")
goog.provide("Rx.AnonymousObserver")
goog.provide("Rx.CheckedObserver")
function defaultError(err) { throw err; }
/**
 * Supports push-style iteration over an observable sequence.
 * 
 * @constructor
 */
Rx.Observer = function() {};

/**
 * Creates a notification callback from an observer.
 * 
 * @param observer
 *            Observer object.
 * @returns The action that forwards its input notification to the underlying
 *          observer.
 */
Rx.Observer.prototype.toNotifier = function() {
	var observer = this;
	return function(n) {
		return n.accept(observer);
	};
};

/**
 * Hides the identity of an observer.
 * 
 * @returns An observer that hides the identity of the specified observer.
 */
Rx.Observer.prototype.asObserver = function() {
	return new Rx.AnonymousObserver(goog.bind(this.onNext, this), goog.bind(
			this.onError, this), goog.bind(this.onCompleted, this));
};

/**
 * Checks access to the observer for grammar violations. This includes checking
 * for multiple OnError or OnCompleted calls, as well as reentrancy in any of
 * the observer methods. If a violation is detected, an Error is thrown from the
 * offending observer method call.
 * 
 * @returns An observer that checks callbacks invocations against the observer
 *          grammar and, if the checks pass, forwards those to the specified
 *          observer.
 */
Rx.Observer.prototype.checked = function() {
	return new Rx.CheckedObserver(this);
};

/**
 * Creates an observer from the specified OnNext, along with optional OnError,
 * and OnCompleted actions.
 * 
 * @static
 * @memberOf Observer
 * @param {Function}
 *            [onNext] Observer's OnNext action implementation.
 * @param {Function}
 *            [onError] Observer's OnError action implementation.
 * @param {Function}
 *            [onCompleted] Observer's OnCompleted action implementation.
 * @returns {Observer} The observer object implemented using the given actions.
 */
Rx.Observer.create = function(onNext, onError, onCompleted) {
	onNext || (onNext = goog.nullFunction);
	onError || (onError = defaultError);
	onCompleted || (onCompleted = goog.nullFunction);
	return new Rx.AnonymousObserver(onNext, onError, onCompleted);
};

/**
 * Creates an observer from a notification callback.
 * 
 * @static
 * @memberOf Observer
 * @param {Function}
 *            handler Action that handles a notification.
 * @returns The observer object that invokes the specified handler using a
 *          notification corresponding to each message it receives.
 */
Rx.Observer.fromNotifier = function(handler) {
	return new Rx.AnonymousObserver(function(x) {
		return handler(Rx.Notification.createOnNext(x));
	}, function(exception) {
		return handler(Rx.Notification.createOnError(exception));
	}, function() {
		return handler(Rx.Notification.createOnCompleted());
	});
};
/**
 * Creates a new observer in a non-stopped state.
 * 
 * @constructor
 */
Rx.Internals.AbstractObserver = function() {
	this.isStopped = false;
	goog.base(this);
}

goog.inherits(Rx.Internals.AbstractObserver, Rx.Observer);

/**
 * Notifies the observer of a new element in the sequence.
 * 
 * @memberOf AbstractObserver
 * @param {Any}
 *            value Next element in the sequence.
 */
Rx.Internals.AbstractObserver.prototype.onNext = function(value) {
	if (!this.isStopped) {
		this.next(value);
	}
};

/**
 * Notifies the observer that an exception has occurred.
 * 
 * @memberOf AbstractObserver
 * @param {Any}
 *            error The error that has occurred.
 */
Rx.Internals.AbstractObserver.prototype.onError = function(error) {
	if (!this.isStopped) {
		this.isStopped = true;
		this.error(error);
	}
};

/**
 * Notifies the observer of the end of the sequence.
 */
Rx.Internals.AbstractObserver.prototype.onCompleted = function() {
	if (!this.isStopped) {
		this.isStopped = true;
		this.completed();
	}
};

/**
 * Disposes the observer, causing it to transition to the stopped state.
 */
Rx.Internals.AbstractObserver.prototype.dispose = function() {
	this.isStopped = true;
};

Rx.Internals.AbstractObserver.prototype.fail = function() {
	if (!this.isStopped) {
		this.isStopped = true;
		this.error(true);
		return true;
	}

	return false;
};

/**
 * Creates an observer from the specified OnNext, OnError, and OnCompleted
 * actions.
 * 
 * @constructor
 * @param {Any}
 *            onNext Observer's OnNext action implementation.
 * @param {Any}
 *            onError Observer's OnError action implementation.
 * @param {Any}
 *            onCompleted Observer's OnCompleted action implementation.
 */
Rx.AnonymousObserver = function(onNext, onError, onCompleted) {
	goog.base(this);
	this._onNext = onNext;
	this._onError = onError;
	this._onCompleted = onCompleted;
}

goog.inherits(Rx.AnonymousObserver, Rx.Internals.AbstractObserver);
/**
 * Calls the onNext action.
 * 
 * @memberOf AnonymousObserver
 * @param {Any}
 *            value Next element in the sequence.
 */
Rx.AnonymousObserver.prototype.next = function(value) {
	this._onNext(value);
};

/**
 * Calls the onError action.
 * 
 * @memberOf AnonymousObserver
 * @param {Any}
 *            error The error that has occurred.
 */
Rx.AnonymousObserver.prototype.error = function(exception) {
	this._onError(exception);
};

/**
 * Calls the onCompleted action.
 * 
 * @memberOf AnonymousObserver
 */
Rx.AnonymousObserver.prototype.completed = function() {
	this._onCompleted();
};

Rx.CheckedObserver = function(observer) {
	goog.base(this);
	this._observer = observer;
	this._state = 0; // 0 - idle, 1 - busy, 2 - done
}
goog.inherits(Rx.CheckedObserver, Rx.Observer);

Rx.CheckedObserver.prototype.onNext = function(value) {
	this.checkAccess();
	try {
		this._observer.onNext(value);
	} catch (e) {
		throw e;
	} finally {
		this._state = 0;
	}
};

Rx.CheckedObserver.prototype.onError = function(err) {
	this.checkAccess();
	try {
		this._observer.onError(err);
	} catch (e) {
		throw e;
	} finally {
		this._state = 2;
	}
};

Rx.CheckedObserver.prototype.onCompleted = function() {
	this.checkAccess();
	try {
		this._observer.onCompleted();
	} catch (e) {
		throw e;
	} finally {
		this._state = 2;
	}
};

Rx.CheckedObserver.prototype.checkAccess = function() {
	if (this._state === 1) {
		throw new Error('Re-entrancy detected');
	}
	if (this._state === 2) {
		throw new Error('Observer completed');
	}
	if (this._state === 0) {
		this._state = 1;
	}
};
