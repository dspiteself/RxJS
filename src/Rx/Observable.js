goog.provide("Rx.Observable")
goog.provide("Rx.Internals.AnonymousObservable");
goog.require("Rx.AutoDetachObserver")


/**
 * @constructor
 * @private
 */
Rx.Observable = function(subscribe) {
	this._subscribe = subscribe;
}
Rx.Observable.sequenceContainsNoElements = 'Sequence contains no elements.';
Rx.Observable.prototype.finalValue = function() {
	var source = this;
	return new Rx.Internals.AnonymousObservable(function(observer) {
		var hasValue = false, value;
		return source.subscribe(function(x) {
			hasValue = true;
			value = x;
		}, goog.bind(observer.onError, observer), function() {
			if (!hasValue) {
				observer.onError(new Error(
						Rx.Observable.sequenceContainsNoElements));
			} else {
				observer.onNext(value);
				observer.onCompleted();
			}
		});
	});
};

/**
 * Subscribes an observer to the observable sequence.
 * 
 * @example 1 - source.subscribe(); 2 - source.subscribe(observer); 3 -
 *          source.subscribe(function (x) { console.log(x); }); 4 -
 *          source.subscribe(function (x) { console.log(x); }, function (err) {
 *          console.log(err); }); 5 - source.subscribe(function (x) {
 *          console.log(x); }, function (err) { console.log(err); }, function () {
 *          console.log('done'); });
 * @param {Mixed}
 *            [observerOrOnNext] The object that is to receive notifications or
 *            an action to invoke for each element in the observable sequence.
 * @param {Function}
 *            [onError] Action to invoke upon exceptional termination of the
 *            observable sequence.
 * @param {Function}
 *            [onCompleted] Action to invoke upon graceful termination of the
 *            observable sequence.
 * @returns {Diposable} The source sequence whose subscriptions and
 *          unsubscriptions happen on the specified scheduler.
 */
Rx.Observable.prototype.subscribe = Rx.Observable.prototype.forEach = function(
		observerOrOnNext, onError, onCompleted) {
	var subscriber;
	if (typeof observerOrOnNext === 'object') {
		subscriber = observerOrOnNext;
	} else {
		subscriber = observerCreate(observerOrOnNext, onError, onCompleted);
	}

	return this._subscribe(subscriber);
};

/**
 * Creates a list from an observable sequence.
 * 
 * @memberOf Observable
 * @returns An observable sequence containing a single element with a list
 *          containing all the elements of the source sequence.
 */
Rx.Observable.prototype.toArray = function() {
	function accumulator(list, i) {
		var newList = list.slice(0);
		newList.push(i);
		return newList;
	}
	return this.scan([], accumulator).startWith([]).finalValue();
};

/**
 * Invokes the specified function asynchronously on the specified scheduler,
 * surfacing the result through an observable sequence.
 * 
 * @example 1 - res = Rx.Observable.start(function () { console.log('hello');
 *          }); 2 - res = Rx.Observable.start(function () {
 *          console.log('hello'); }, Rx.Scheduler.timeout); 2 - res =
 *          Rx.Observable.start(function () { this.log('hello'); },
 *          Rx.Scheduler.timeout, console);
 * 
 * @param {Function}
 *            func Function to run asynchronously.
 * @param {Scheduler}
 *            [scheduler] Scheduler to run the function on. If not specified,
 *            defaults to Scheduler.timeout.
 * @param [context]
 *            The context for the func parameter to be executed. If not
 *            specified, defaults to undefined.
 * @returns {Observable} An observable sequence exposing the function's result
 *          value, or an exception.
 * 
 * Remarks * The function is called immediately, not during the subscription of
 * the resulting sequence. * Multiple subscriptions to the resulting sequence
 * can observe the function's result.
 */
Rx.Observable.start = function(func, scheduler, context) {
	return Rx.Observable.toAsync(func, scheduler)();
};

/**
 * Converts the function into an asynchronous function. Each invocation of the
 * resulting asynchronous function causes an invocation of the original
 * synchronous function on the specified scheduler.
 * 
 * @example 1 - res = Rx.Observable.toAsync(function (x, y) { return x + y;
 *          })(4, 3); 2 - res = Rx.Observable.toAsync(function (x, y) { return x +
 *          y; }, Rx.Scheduler.timeout)(4, 3); 2 - res =
 *          Rx.Observable.toAsync(function (x) { this.log(x); },
 *          Rx.Scheduler.timeout, console)('hello');
 * 
 * @param function
 *            Function to convert to an asynchronous function.
 * @param {Scheduler}
 *            [scheduler] Scheduler to run the function on. If not specified,
 *            defaults to Scheduler.timeout.
 * @param {Mixed}
 *            [context] The context for the func parameter to be executed. If
 *            not specified, defaults to undefined.
 * @returns {Function} Asynchronous function.
 */
Rx.Observable.toAsync = function(func, scheduler, context) {
	scheduler || (scheduler = timeoutScheduler);
	return function() {
		var args = slice.call(arguments, 0), subject = new Rx.AsyncSubject();
		scheduler.schedule(function() {
			var result;
			try {
				result = func.apply(context, args);
			} catch (e) {
				subject.onError(e);
				return;
			}
			subject.onNext(result);
			subject.onCompleted();
		});
		return subject.asObservable();
	};
};
/**
 * Wraps the source sequence in order to run its observer callbacks on the
 * specified scheduler.
 * 
 * This only invokes observer callbacks on a scheduler. In case the subscription
 * and/or unsubscription actions have side-effects that require to be run on a
 * scheduler, use subscribeOn.
 * 
 * @param {Scheduler}
 *            scheduler Scheduler to notify observers on.
 * @returns {Observable} The source sequence whose observations happen on the
 *          specified scheduler.
 */
Rx.Observable.prototype.observeOn = function(scheduler) {
	var source = this;
	return new Rx.Internals.AnonymousObservable(function(observer) {
		return source.subscribe(new ObserveOnObserver(scheduler, observer));
	});
};

/**
 * Wraps the source sequence in order to run its subscription and unsubscription
 * logic on the specified scheduler. This operation is not commonly used; see
 * the remarks section for more information on the distinction between
 * subscribeOn and observeOn.
 * 
 * This only performs the side-effects of subscription and unsubscription on the
 * specified scheduler. In order to invoke observer callbacks on a scheduler,
 * use observeOn.
 * 
 * @param {Scheduler}
 *            scheduler Scheduler to perform subscription and unsubscription
 *            actions on.
 * @returns {Observable} The source sequence whose subscriptions and
 *          unsubscriptions happen on the specified scheduler.
 */
Rx.Observable.prototype.subscribeOn = function(scheduler) {
	var source = this;
	return new Rx.Internals.AnonymousObservable(function(observer) {
		var m = new SingleAssignmentDisposable(), d = new SerialDisposable();
		d.setDisposable(m);
		m.setDisposable(scheduler.schedule(function() {
			d.setDisposable(new ScheduledDisposable(scheduler, source
					.subscribe(observer)));
		}));
		return d;
	});
};

/**
 * Creates an observable sequence from a specified subscribe method
 * implementation.
 * 
 * @example 1 - res = Rx.Observable.create(function (observer) { return function () { } );
 * 
 * @param {Function}
 *            subscribe Implementation of the resulting observable sequence's
 *            subscribe method, returning a function that will be wrapped in a
 *            Disposable.
 * @returns {Observable} The observable sequence with the specified
 *          implementation for the Subscribe method.
 */
Rx.Observable.create = function(subscribe) {
	return new Rx.Internals.AnonymousObservable(function(o) {
		return disposableCreate(subscribe(o));
	});
};

/**
 * Creates an observable sequence from a specified subscribe method
 * implementation.
 * 
 * @example 1 - res = Rx.Observable.create(function (observer) { return
 *          Rx.Disposable.empty; } );
 * @static
 * @memberOf Observable
 * @param {Function}
 *            subscribe Implementation of the resulting observable sequence's
 *            subscribe method.
 * @returns {Observable} The observable sequence with the specified
 *          implementation for the Subscribe method.
 */
Rx.Observable.createWithDisposable = function(subscribe) {
	return new Rx.Internals.AnonymousObservable(subscribe);
};

/**
 * Returns an observable sequence that invokes the specified factory function
 * whenever a new observer subscribes.
 * 
 * @example 1 - res = Rx.Observable.defer(function () { return
 *          Rx.Observable.fromArray([1,2,3]); });
 * @static
 * @memberOf Observable
 * @param {Function}
 *            observableFactory Observable factory function to invoke for each
 *            observer that subscribes to the resulting sequence.
 * @returns {Observable} An observable sequence whose observers trigger an
 *          invocation of the given observable factory function.
 */
Rx.Observable.defer = function(observableFactory) {
	return new Rx.Internals.AnonymousObservable(function(observer) {
		var result;
		try {
			result = observableFactory();
		} catch (e) {
			return observableThrow(e).subscribe(observer);
		}
		return result.subscribe(observer);
	});
};

/**
 * Returns an empty observable sequence, using the specified scheduler to send
 * out the single OnCompleted message.
 * 
 * @example 1 - res = Rx.Observable.empty(); 2 - res =
 *          Rx.Observable.empty(Rx.Scheduler.timeout);
 * @static
 * @memberOf Observable
 * @param {Scheduler}
 *            [scheduler] Scheduler to send the termination call on.
 * @returns {Observable} An observable sequence with no elements.
 */
var observableEmpty = Rx.Observable.empty = function(scheduler) {
	scheduler || (scheduler = immediateScheduler);
	return new Rx.Internals.AnonymousObservable(function(observer) {
		return scheduler.schedule(function() {
			observer.onCompleted();
		});
	});
};

/**
 * Converts an array to an observable sequence, using an optional scheduler to
 * enumerate the array.
 * 
 * @example 1 - res = Rx.Observable.fromArray([1,2,3]); 2 - res =
 *          Rx.Observable.fromArray([1,2,3], Rx.Scheduler.timeout);
 * @static
 * @memberOf Observable
 * @param {Scheduler}
 *            [scheduler] Scheduler to run the enumeration of the input sequence
 *            on.
 * @returns {Observable} The observable sequence whose elements are pulled from
 *          the given enumerable sequence.
 */
var observableFromArray = Rx.Observable.fromArray = function(array, scheduler) {
	scheduler || (scheduler = currentThreadScheduler);
	return new Rx.Internals.AnonymousObservable(function(observer) {
		var count = 0;
		return scheduler.scheduleRecursive(function(self) {
			if (count < array.length) {
				observer.onNext(array[count++]);
				self();
			} else {
				observer.onCompleted();
			}
		});
	});
};

/**
 * Generates an observable sequence by running a state-driven loop producing the
 * sequence's elements, using the specified scheduler to send out observer
 * messages.
 * 
 * @example 1 - res = Rx.Observable.generate(0, function (x) { return x < 10; },
 *          function (x) { return x + 1; }, function (x) { return x; }); 2 - res =
 *          Rx.Observable.generate(0, function (x) { return x < 10; }, function
 *          (x) { return x + 1; }, function (x) { return x; },
 *          Rx.Scheduler.timeout);
 * @static
 * @memberOf Observable
 * @param {Mixed}
 *            initialState Initial state.
 * @param {Function}
 *            condition Condition to terminate generation (upon returning
 *            false).
 * @param {Function}
 *            iterate Iteration step function.
 * @param {Function}
 *            resultSelector Selector function for results produced in the
 *            sequence.
 * @param {Scheduler}
 *            [scheduler] Scheduler on which to run the generator loop. If not
 *            provided, defaults to Scheduler.currentThread.
 * @returns {Observable} The generated sequence.
 */
Rx.Observable.generate = function(initialState, condition, iterate,
		resultSelector, scheduler) {
	scheduler || (scheduler = currentThreadScheduler);
	return new Rx.Internals.AnonymousObservable(function(observer) {
		var first = true, state = initialState;
		return scheduler.scheduleRecursive(function(self) {
			var hasResult, result;
			try {
				if (first) {
					first = false;
				} else {
					state = iterate(state);
				}
				hasResult = condition(state);
				if (hasResult) {
					result = resultSelector(state);
				}
			} catch (exception) {
				observer.onError(exception);
				return;
			}
			if (hasResult) {
				observer.onNext(result);
				self();
			} else {
				observer.onCompleted();
			}
		});
	});
};

/**
 * Returns a non-terminating observable sequence, which can be used to denote an
 * infinite duration (e.g. when using reactive joins).
 * 
 * @static
 * @memberOf Observable
 * @returns {Observable} An observable sequence whose observers will never get
 *          called.
 */
var observableNever = Rx.Observable.never = function() {
	return new Rx.Internals.AnonymousObservable(function() {
		return disposableEmpty;
	});
};

/**
 * Generates an observable sequence of integral numbers within a specified
 * range, using the specified scheduler to send out observer messages.
 * 
 * @example 1 - res = Rx.Observable.range(0, 10); 2 - res =
 *          Rx.Observable.range(0, 10, Rx.Scheduler.timeout);
 * @static
 * @memberOf Observable
 * @param {Number}
 *            start The value of the first integer in the sequence.
 * @param {Number}
 *            count The number of sequential integers to generate.
 * @param {Scheduler}
 *            [scheduler] Scheduler to run the generator loop on. If not
 *            specified, defaults to Scheduler.currentThread.
 * @returns {Observable} An observable sequence that contains a range of
 *          sequential integral numbers.
 */
Rx.Observable.range = function(start, count, scheduler) {
	scheduler || (scheduler = currentThreadScheduler);
	return new Rx.Internals.AnonymousObservable(function(observer) {
		return scheduler.scheduleRecursiveWithState(0, function(i, self) {
			if (i < count) {
				observer.onNext(start + i);
				self(i + 1);
			} else {
				observer.onCompleted();
			}
		});
	});
};

/**
 * Generates an observable sequence that repeats the given element the specified
 * number of times, using the specified scheduler to send out observer messages.
 * 
 * @example 1 - res = Rx.Observable.repeat(42); 2 - res =
 *          Rx.Observable.repeat(42, 4); 3 - res = Rx.Observable.repeat(42, 4,
 *          Rx.Scheduler.timeout); 4 - res = Rx.Observable.repeat(42, null,
 *          Rx.Scheduler.timeout);
 * @static
 * @memberOf Observable
 * @param {Mixed}
 *            value Element to repeat.
 * @param {Number}
 *            repeatCount [Optiona] Number of times to repeat the element. If
 *            not specified, repeats indefinitely.
 * @param {Scheduler}
 *            scheduler Scheduler to run the producer loop on. If not specified,
 *            defaults to Scheduler.immediate.
 * @returns {Observable} An observable sequence that repeats the given element
 *          the specified number of times.
 */
Rx.Observable.repeat = function(value, repeatCount, scheduler) {
	scheduler || (scheduler = currentThreadScheduler);
	if (repeatCount == null) {
		repeatCount = -1;
	}
	return observableReturn(value, scheduler).repeat(repeatCount);
};

/**
 * Returns an observable sequence that contains a single element, using the
 * specified scheduler to send out observer messages.
 * 
 * @example 1 - res = Rx.Observable.returnValue(42); 2 - res =
 *          Rx.Observable.returnValue(42, Rx.Scheduler.timeout);
 * @static
 * @memberOf Observable
 * @param {Mixed}
 *            value Single element in the resulting observable sequence.
 * @param {Scheduler}
 *            scheduler Scheduler to send the single element on. If not
 *            specified, defaults to Scheduler.immediate.
 * @returns {Observable} An observable sequence containing the single specified
 *          element.
 */
var observableReturn = Rx.Observable.returnValue = function(value, scheduler) {
	scheduler || (scheduler = immediateScheduler);
	return new Rx.Internals.AnonymousObservable(function(observer) {
		return scheduler.schedule(function() {
			observer.onNext(value);
			observer.onCompleted();
		});
	});
};

/**
 * Returns an observable sequence that terminates with an exception, using the
 * specified scheduler to send out the single OnError message.
 * 
 * @example 1 - res = Rx.Observable.throwException(new Error('Error')); 2 - res =
 *          Rx.Observable.throwException(new Error('Error'),
 *          Rx.Scheduler.timeout);
 * @static
 * @memberOf Observable
 * @param {Mixed}
 *            exception An object used for the sequence's termination.
 * @param {Scheduler}
 *            scheduler Scheduler to send the exceptional termination call on.
 *            If not specified, defaults to Scheduler.immediate.
 * @returns {Observable} The observable sequence that terminates exceptionally
 *          with the specified exception object.
 */
var observableThrow = Rx.Observable.throwException = function(exception,
		scheduler) {
	scheduler || (scheduler = immediateScheduler);
	return new Rx.Internals.AnonymousObservable(function(observer) {
		return scheduler.schedule(function() {
			observer.onError(exception);
		});
	});
};

/**
 * Constructs an observable sequence that depends on a resource object, whose
 * lifetime is tied to the resulting observable sequence's lifetime.
 * 
 * @example 1 - res = Rx.Observable.using(function () { return new
 *          AsyncSubject(); }, function (s) { return s; });
 * @static
 * @memberOf Observable
 * @param {Function}
 *            resourceFactory Factory function to obtain a resource object.
 * @param {Function}
 *            observableFactory Factory function to obtain an observable
 *            sequence that depends on the obtained resource.
 * @returns {Observable} An observable sequence whose lifetime controls the
 *          lifetime of the dependent resource object.
 */
Rx.Observable.using = function(resourceFactory, observableFactory) {
	return new Rx.Internals.AnonymousObservable(function(observer) {
		var disposable = disposableEmpty, resource, source;
		try {
			resource = resourceFactory();
			if (resource) {
				disposable = resource;
			}
			source = observableFactory(resource);
		} catch (exception) {
			return new CompositeDisposable(observableThrow(exception)
					.subscribe(observer), disposable);
		}
		return new CompositeDisposable(source.subscribe(observer), disposable);
	});
};

/**
 * Propagates the observable sequence that reacts first.
 * 
 * @memberOf Observable#
 * @param {Observable}
 *            rightSource Second observable sequence.
 * @returns {Observable} {Observable} An observable sequence that surfaces
 *          either of the given sequences, whichever reacted first.
 */
Rx.Observable.prototype.amb = function(rightSource) {
	var leftSource = this;
	return new Rx.Internals.AnonymousObservable(
			function(observer) {

				var choice, leftChoice = 'L', rightChoice = 'R', leftSubscription = new SingleAssignmentDisposable(), rightSubscription = new SingleAssignmentDisposable();

				function choiceL() {
					if (!choice) {
						choice = leftChoice;
						rightSubscription.dispose();
					}
				}

				function choiceR() {
					if (!choice) {
						choice = rightChoice;
						leftSubscription.dispose();
					}
				}

				leftSubscription.setDisposable(leftSource.subscribe(function(
						left) {
					choiceL();
					if (choice === leftChoice) {
						observer.onNext(left);
					}
				}, function(err) {
					choiceL();
					if (choice === leftChoice) {
						observer.onError(err);
					}
				}, function() {
					choiceL();
					if (choice === leftChoice) {
						observer.onCompleted();
					}
				}));

				rightSubscription.setDisposable(rightSource.subscribe(function(
						right) {
					choiceR();
					if (choice === rightChoice) {
						observer.onNext(right);
					}
				}, function(err) {
					choiceR();
					if (choice === rightChoice) {
						observer.onError(err);
					}
				}, function() {
					choiceR();
					if (choice === rightChoice) {
						observer.onCompleted();
					}
				}));

				return new CompositeDisposable(leftSubscription,
						rightSubscription);
			});
};

/**
 * Propagates the observable sequence that reacts first.
 * 
 * @example E.g. winner = Rx.Observable.amb(xs, ys, zs);
 * @static
 * @memberOf Observable
 * @returns {Observable} An observable sequence that surfaces any of the given
 *          sequences, whichever reacted first.
 */
Rx.Observable.amb = function() {
	var acc = observableNever(), items = argsOrArray(arguments, 0);
	function func(previous, current) {
		return previous.amb(current);
	}
	for ( var i = 0, len = items.length; i < len; i++) {
		acc = func(acc, items[i]);
	}
	return acc;
};

function observableCatchHandler(source, handler) {
	return new Rx.Internals.AnonymousObservable(
			function(observer) {
				var d1 = new SingleAssignmentDisposable(), subscription = new SerialDisposable();
				subscription.setDisposable(d1);
				d1.setDisposable(source.subscribe(observer.onNext
						.bind(observer), function(exception) {
					var d, result;
					try {
						result = handler(exception);
					} catch (ex) {
						observer.onError(ex);
						return;
					}
					d = new SingleAssignmentDisposable();
					subscription.setDisposable(d);
					d.setDisposable(result.subscribe(observer));
				}, observer.onCompleted.bind(observer)));
				return subscription;
			});
}

/**
 * Continues an observable sequence that is terminated by an exception with the
 * next observable sequence.
 * 
 * @example 1 - xs.catchException(ys) 2 - xs.catchException(function (ex) {
 *          return ys(ex); })
 * @memberOf Observable#
 * @param {Mixed}
 *            handlerOrSecond Exception handler function that returns an
 *            observable sequence given the error that occurred in the first
 *            sequence, or a second observable sequence used to produce results
 *            when an error occurred in the first sequence.
 * @returns {Observable} An observable sequence containing the first sequence's
 *          elements, followed by the elements of the handler sequence in case
 *          an exception occurred.
 */
Rx.Observable.prototype.catchException = function(handlerOrSecond) {
	if (typeof handlerOrSecond === 'function') {
		return observableCatchHandler(this, handlerOrSecond);
	}
	return observableCatch([ this, handlerOrSecond ]);
};

/**
 * Continues an observable sequence that is terminated by an exception with the
 * next observable sequence.
 * 
 * @example 1 - res = Rx.Observable.catchException(xs, ys, zs); 2 - res =
 *          Rx.Observable.catchException([xs, ys, zs]);
 * @static
 * @memberOf Observable
 * @returns {Observable} An observable sequence containing elements from
 *          consecutive source sequences until a source sequence terminates
 *          successfully.
 */
var observableCatch = Rx.Observable.catchException = function() {
	var items = argsOrArray(arguments, 0);
	return enumerableFor(items).catchException();
};

/**
 * Merges the specified observable sequences into one observable sequence by
 * using the selector function whenever any of the observable sequences produces
 * an element. This can be in the form of an argument list of observables or an
 * array.
 * 
 * @example 1 - obs = Rx.Observable.combineLatest(obs1, obs2, obs3, function
 *          (o1, o2, o3) { return o1 + o2 + o3; }); 2 - obs =
 *          Rx.Observable.combineLatest([obs1, obs2, obs3], function (o1, o2,
 *          o3) { return o1 + o2 + o3; });
 * @memberOf Observable#
 * @returns {Observable} An observable sequence containing the result of
 *          combining elements of the sources using the specified result
 *          selector function.
 */
Rx.Observable.prototype.combineLatest = function() {
	var args = slice.call(arguments);
	if (Array.isArray(args[0])) {
		args[0].unshift(this);
	} else {
		args.unshift(this);
	}
	return combineLatest.apply(this, args);
};

/**
 * Merges the specified observable sequences into one observable sequence by
 * using the selector function whenever any of the observable sequences produces
 * an element.
 * 
 * @example 1 - obs = Rx.Observable.combineLatest(obs1, obs2, obs3, function
 *          (o1, o2, o3) { return o1 + o2 + o3; }); 2 - obs =
 *          Rx.Observable.combineLatest([obs1, obs2, obs3], function (o1, o2,
 *          o3) { return o1 + o2 + o3; });
 * @static
 * @memberOf Observable
 * @returns {Observable} An observable sequence containing the result of
 *          combining elements of the sources using the specified result
 *          selector function.
 */
var combineLatest = Rx.Observable.combineLatest = function() {
	var args = slice.call(arguments), resultSelector = args.pop();

	if (Array.isArray(args[0])) {
		args = args[0];
	}

	return new Rx.Internals.AnonymousObservable(
			function(observer) {
				var falseFactory = function() {
					return false;
				}, n = args.length, hasValue = arrayInitialize(n, falseFactory), hasValueAll = false, isDone = arrayInitialize(
						n, falseFactory), values = new Array(n);

				function next(i) {
					var res;
					hasValue[i] = true;
					if (hasValueAll
							|| (hasValueAll = hasValue.every(function(x) {
								return x;
							}))) {
						try {
							res = resultSelector.apply(null, values);
						} catch (ex) {
							observer.onError(ex);
							return;
						}
						observer.onNext(res);
					} else if (isDone.filter(function(x, j) {
						return j !== i;
					}).every(function(x) {
						return x;
					})) {
						observer.onCompleted();
					}
				}

				function done(i) {
					isDone[i] = true;
					if (isDone.every(function(x) {
						return x;
					})) {
						observer.onCompleted();
					}
				}

				var subscriptions = new Array(n);
				for ( var idx = 0; idx < n; idx++) {
					(function(i) {
						subscriptions[i] = new SingleAssignmentDisposable();
						subscriptions[i].setDisposable(args[i].subscribe(
								function(x) {
									values[i] = x;
									next(i);
								}, observer.onError.bind(observer), function() {
									done(i);
								}));
					}(idx));
				}

				return new CompositeDisposable(subscriptions);
			});
};

/**
 * Concatenates all the observable sequences. This takes in either an array or
 * variable arguments to concatenate.
 * 
 * @example 1 - concatenated = xs.concat(ys, zs); 2 - concatenated =
 *          xs.concat([ys, zs]);
 * @memberOf Observable#
 * @returns {Observable} An observable sequence that contains the elements of
 *          each given sequence, in sequential order.
 */
Rx.Observable.prototype.concat = function() {
	var items = slice.call(arguments, 0);
	items.unshift(this);
	return observableConcat.apply(this, items);
};

/**
 * Concatenates all the observable sequences.
 * 
 * @example 1 - res = Rx.Observable.concat(xs, ys, zs); 2 - res =
 *          Rx.Observable.concat([xs, ys, zs]);
 * @static
 * @memberOf Observable
 * @returns {Observable} An observable sequence that contains the elements of
 *          each given sequence, in sequential order.
 */
var observableConcat = Rx.Observable.concat = function() {
	var sources = argsOrArray(arguments, 0);
	return enumerableFor(sources).concat();
};

/**
 * Concatenates an observable sequence of observable sequences.
 * 
 * @memberOf Observable#
 * @returns {Observable} An observable sequence that contains the elements of
 *          each observed inner sequence, in sequential order.
 */
Rx.Observable.prototype.concatObservable = Rx.Observable.prototype.concatAll = function() {
	return this.merge(1);
};

/**
 * Merges an observable sequence of observable sequences into an observable
 * sequence, limiting the number of concurrent subscriptions to inner sequences.
 * Or merges two observable sequences into a single observable sequence.
 * 
 * @example 1 - merged = sources.merge(1); 2 - merged =
 *          source.merge(otherSource);
 * @memberOf Observable#
 * @param {Mixed}
 *            [maxConcurrentOrOther] Maximum number of inner observable
 *            sequences being subscribed to concurrently or the second
 *            observable sequence.
 * @returns {Observable} The observable sequence that merges the elements of the
 *          inner sequences.
 */
Rx.Observable.prototype.merge = function(maxConcurrentOrOther) {
	if (typeof maxConcurrentOrOther !== 'number') {
		return observableMerge(this, maxConcurrentOrOther);
	}
	var sources = this;
	return new Rx.Internals.AnonymousObservable(
			function(observer) {
				var activeCount = 0, group = new CompositeDisposable(), isStopped = false, q = [], subscribe = function(
						xs) {
					var subscription = new SingleAssignmentDisposable();
					group.add(subscription);
					subscription.setDisposable(xs.subscribe(observer.onNext
							.bind(observer), observer.onError.bind(observer),
							function() {
								var s;
								group.remove(subscription);
								if (q.length > 0) {
									s = q.shift();
									subscribe(s);
								} else {
									activeCount--;
									if (isStopped && activeCount === 0) {
										observer.onCompleted();
									}
								}
							}));
				};
				group.add(sources.subscribe(function(innerSource) {
					if (activeCount < maxConcurrentOrOther) {
						activeCount++;
						subscribe(innerSource);
					} else {
						q.push(innerSource);
					}
				}, observer.onError.bind(observer), function() {
					isStopped = true;
					if (activeCount === 0) {
						observer.onCompleted();
					}
				}));
				return group;
			});
};

/**
 * Merges all the observable sequences into a single observable sequence. The
 * scheduler is optional and if not specified, the immediate scheduler is used.
 * 
 * @example 1 - merged = Rx.Observable.merge(xs, ys, zs); 2 - merged =
 *          Rx.Observable.merge([xs, ys, zs]); 3 - merged =
 *          Rx.Observable.merge(scheduler, xs, ys, zs); 4 - merged =
 *          Rx.Observable.merge(scheduler, [xs, ys, zs]);
 * 
 * @static
 * @memberOf Observable
 * @returns {Observable} The observable sequence that merges the elements of the
 *          observable sequences.
 */
var observableMerge = Rx.Observable.merge = function() {
	var scheduler, sources;
	if (!arguments[0]) {
		scheduler = immediateScheduler;
		sources = slice.call(arguments, 1);
	} else if (arguments[0].now) {
		scheduler = arguments[0];
		sources = slice.call(arguments, 1);
	} else {
		scheduler = immediateScheduler;
		sources = slice.call(arguments, 0);
	}
	if (Array.isArray(sources[0])) {
		sources = sources[0];
	}
	return observableFromArray(sources, scheduler).mergeObservable();
};

/**
 * Merges an observable sequence of observable sequences into an observable
 * sequence.
 * 
 * @memberOf Observable#
 * @returns {Observable} The observable sequence that merges the elements of the
 *          inner sequences.
 */
Rx.Observable.prototype.mergeObservable = Rx.Observable.prototype.mergeAll = function() {
	var sources = this;
	return new Rx.Internals.AnonymousObservable(
			function(observer) {
				var group = new CompositeDisposable(), isStopped = false, m = new SingleAssignmentDisposable();
				group.add(m);
				m.setDisposable(sources.subscribe(function(innerSource) {
					var InnerSubscription = new SingleAssignmentDisposable();
					group.add(InnerSubscription);
					InnerSubscription.setDisposable(innerSource.subscribe(
							function(x) {
								observer.onNext(x);
							}, observer.onError.bind(observer), function() {
								group.remove(InnerSubscription);
								if (isStopped && group.length === 1) {
									observer.onCompleted();
								}
							}));
				}, observer.onError.bind(observer), function() {
					isStopped = true;
					if (group.length === 1) {
						observer.onCompleted();
					}
				}));
				return group;
			});
};

/**
 * Continues an observable sequence that is terminated normally or by an
 * exception with the next observable sequence.
 * 
 * @memberOf Observable
 * @param {Observable}
 *            second Second observable sequence used to produce results after
 *            the first sequence terminates.
 * @returns {Observable} An observable sequence that concatenates the first and
 *          second sequence, even if the first sequence terminates
 *          exceptionally.
 */
Rx.Observable.prototype.onErrorResumeNext = function(second) {
	if (!second) {
		throw new Error('Second observable is required');
	}
	return onErrorResumeNext([ this, second ]);
};

/**
 * Continues an observable sequence that is terminated normally or by an
 * exception with the next observable sequence.
 * 
 * @example 1 - res = Rx.Observable.onErrorResumeNext(xs, ys, zs); 1 - res =
 *          Rx.Observable.onErrorResumeNext([xs, ys, zs]);
 * @static
 * @memberOf Observable
 * @returns {Observable} An observable sequence that concatenates the source
 *          sequences, even if a sequence terminates exceptionally.
 */
var onErrorResumeNext = Rx.Observable.onErrorResumeNext = function() {
	var sources = argsOrArray(arguments, 0);
	return new Rx.Internals.AnonymousObservable(
			function(observer) {
				var pos = 0, subscription = new SerialDisposable(), cancelable = immediateScheduler
						.scheduleRecursive(function(self) {
							var current, d;
							if (pos < sources.length) {
								current = sources[pos++];
								d = new SingleAssignmentDisposable();
								subscription.setDisposable(d);
								d.setDisposable(current.subscribe(
										observer.onNext.bind(observer),
										function() {
											self();
										}, function() {
											self();
										}));
							} else {
								observer.onCompleted();
							}
						});
				return new CompositeDisposable(subscription, cancelable);
			});
};

/**
 * Returns the values from the source observable sequence only after the other
 * observable sequence produces a value.
 * 
 * @memberOf Observable#
 * @param {Observable}
 *            other The observable sequence that triggers propagation of
 *            elements of the source sequence.
 * @returns {Observable} An observable sequence containing the elements of the
 *          source sequence starting from the point the other sequence triggered
 *          propagation.
 */
Rx.Observable.prototype.skipUntil = function(other) {
	var source = this;
	return new Rx.Internals.AnonymousObservable(function(observer) {
		var isOpen = false;
		var disposables = new CompositeDisposable(source.subscribe(function(
				left) {
			if (isOpen) {
				observer.onNext(left);
			}
		}, observer.onError.bind(observer), function() {
			if (isOpen) {
				observer.onCompleted();
			}
		}));

		var rightSubscription = new SingleAssignmentDisposable();
		disposables.add(rightSubscription);
		rightSubscription.setDisposable(other.subscribe(function() {
			isOpen = true;
			rightSubscription.dispose();
		}, observer.onError.bind(observer), function() {
			rightSubscription.dispose();
		}));

		return disposables;
	});
};

/**
 * Transforms an observable sequence of observable sequences into an observable
 * sequence producing values only from the most recent observable sequence.
 * 
 * @memberOf Observable#
 * @returns {Observable} The observable sequence that at any point in time
 *          produces the elements of the most recent inner observable sequence
 *          that has been received.
 */
Rx.Observable.prototype.switchLatest = function() {
	var sources = this;
	return new Rx.Internals.AnonymousObservable(
			function(observer) {
				var hasLatest = false, InnerSubscription = new SerialDisposable(), isStopped = false, latest = 0, subscription = sources
						.subscribe(
								function(innerSource) {
									var d = new SingleAssignmentDisposable(), id = ++latest;
									hasLatest = true;
									InnerSubscription.setDisposable(d);
									d.setDisposable(innerSource.subscribe(
											function(x) {
												if (latest === id) {
													observer.onNext(x);
												}
											}, function(e) {
												if (latest === id) {
													observer.onError(e);
												}
											}, function() {
												if (latest === id) {
													hasLatest = false;
													if (isStopped) {
														observer.onCompleted();
													}
												}
											}));
								}, observer.onError.bind(observer), function() {
									isStopped = true;
									if (!hasLatest) {
										observer.onCompleted();
									}
								});
				return new CompositeDisposable(subscription, InnerSubscription);
			});
};

/**
 * Returns the values from the source observable sequence until the other
 * observable sequence produces a value.
 * 
 * @memberOf Observable#
 * @param {Observable}
 *            other Observable sequence that terminates propagation of elements
 *            of the source sequence.
 * @returns {Observable} An observable sequence containing the elements of the
 *          source sequence up to the point the other sequence interrupted
 *          further propagation.
 */
Rx.Observable.prototype.takeUntil = function(other) {
	var source = this;
	return new Rx.Internals.AnonymousObservable(function(observer) {
		return new CompositeDisposable(source.subscribe(observer), other
				.subscribe(observer.onCompleted.bind(observer),
						observer.onError.bind(observer), goog.nullFunction));
	});
};

function zipArray(second, resultSelector) {
	var first = this;
	return new Rx.Internals.AnonymousObservable(function(observer) {
		var index = 0, len = second.length;
		return first
				.subscribe(function(left) {
					if (index < len) {
						var right = second[index++], result;
						try {
							result = resultSelector(left, right);
						} catch (e) {
							observer.onError(e);
							return;
						}
						observer.onNext(result);
					} else {
						observer.onCompleted();
					}
				}, observer.onError.bind(observer), observer.onCompleted
						.bind(observer));
	});
}

/**
 * Merges the specified observable sequences into one observable sequence by
 * using the selector function whenever all of the observable sequences or an
 * array have produced an element at a corresponding index. The last element in
 * the arguments must be a function to invoke for each series of elements at
 * corresponding indexes in the sources.
 * 
 * @example 1 - res = obs1.zip(obs2, fn); 1 - res = x1.zip([1,2,3], fn);
 * @memberOf Observable#
 * @returns {Observable} An observable sequence containing the result of
 *          combining elements of the sources using the specified result
 *          selector function.
 */
Rx.Observable.prototype.zip = function() {
	if (Array.isArray(arguments[0])) {
		return zipArray.apply(this, arguments);
	}
	var parent = this, sources = slice.call(arguments), resultSelector = sources
			.pop();
	sources.unshift(parent);
	return new Rx.Internals.AnonymousObservable(function(observer) {
		var n = sources.length, queues = arrayInitialize(n, function() {
			return [];
		}), isDone = arrayInitialize(n, function() {
			return false;
		});
		var next = function(i) {
			var res, queuedValues;
			if (queues.every(function(x) {
				return x.length > 0;
			})) {
				try {
					queuedValues = queues.map(function(x) {
						return x.shift();
					});
					res = resultSelector.apply(parent, queuedValues);
				} catch (ex) {
					observer.onError(ex);
					return;
				}
				observer.onNext(res);
			} else if (isDone.filter(function(x, j) {
				return j !== i;
			}).every(function(x) {
				return x;
			})) {
				observer.onCompleted();
			}
		};

		function done(i) {
			isDone[i] = true;
			if (isDone.every(function(x) {
				return x;
			})) {
				observer.onCompleted();
			}
		}

		var subscriptions = new Array(n);
		for ( var idx = 0; idx < n; idx++) {
			(function(i) {
				subscriptions[i] = new SingleAssignmentDisposable();
				subscriptions[i].setDisposable(sources[i].subscribe(
						function(x) {
							queues[i].push(x);
							next(i);
						}, observer.onError.bind(observer), function() {
							done(i);
						}));
			})(idx);
		}

		return new CompositeDisposable(subscriptions);
	});
};

/**
 * Merges the specified observable sequences into one observable sequence by
 * using the selector function whenever all of the observable sequences have
 * produced an element at a corresponding index.
 * 
 * @static
 * @memberOf Observable
 * @param {Array}
 *            sources Observable sources.
 * @param {Function}
 *            resultSelector Function to invoke for each series of elements at
 *            corresponding indexes in the sources.
 * @returns {Observable} An observable sequence containing the result of
 *          combining elements of the sources using the specified result
 *          selector function.
 */
Rx.Observable.zip = function(sources, resultSelector) {
	var first = sources[0], rest = sources.slice(1);
	rest.push(resultSelector);
	return first.zip.apply(first, rest);
};

/**
 * Hides the identity of an observable sequence.
 * 
 * @returns {Observable} An observable sequence that hides the identity of the
 *          source sequence.
 */
Rx.Observable.prototype.asObservable = function() {
	var source = this;
	return new Rx.Internals.AnonymousObservable(function(observer) {
		return source.subscribe(observer);
	});
};

/**
 * Projects each element of an observable sequence into zero or more buffers
 * which are produced based on element count information.
 * 
 * @example 1 - xs.bufferWithCount(10); 2 - xs.bufferWithCount(10, 1);
 * 
 * @memberOf Observable#
 * @param {Number}
 *            count Length of each buffer.
 * @param {Number}
 *            [skip] Number of elements to skip between creation of consecutive
 *            buffers. If not provided, defaults to the count.
 * @returns {Observable} An observable sequence of buffers.
 */
Rx.Observable.prototype.bufferWithCount = function(count, skip) {
	if (skip === undefined) {
		skip = count;
	}
	return this.windowWithCount(count, skip).selectMany(function(x) {
		return x.toArray();
	}).where(function(x) {
		return x.length > 0;
	});
};

/**
 * Dematerializes the explicit notification values of an observable sequence as
 * implicit notifications.
 * 
 * @memberOf Observable#
 * @returns {Observable} An observable sequence exhibiting the behavior
 *          corresponding to the source sequence's notification values.
 */
Rx.Observable.prototype.dematerialize = function() {
	var source = this;
	return new Rx.Internals.AnonymousObservable(function(observer) {
		return source
				.subscribe(function(x) {
					return x.accept(observer);
				}, observer.onError.bind(observer), observer.onCompleted
						.bind(observer));
	});
};

/**
 * Returns an observable sequence that contains only distinct contiguous
 * elements according to the keySelector and the comparer.
 * 
 * 1 - var obs = Rx.Observable.distinctUntilChanged(); 2 - var obs =
 * Rx.Observable.distinctUntilChanged(function (x) { return x.id; }); 3 - var
 * obs = Rx.Observable.distinctUntilChanged(function (x) { return x.id; },
 * function (x, y) { return x === y; });
 * 
 * @memberOf Observable#
 * @param {Function}
 *            [keySelector] A function to compute the comparison key for each
 *            element. If not provided, it projects the value.
 * @param {Function}
 *            [comparer] Equality comparer for computed key values. If not
 *            provided, defaults to an equality comparer function.
 * @returns {Observable} An observable sequence only containing the distinct
 *          contiguous elements, based on a computed key value, from the source
 *          sequence.
 */
Rx.Observable.prototype.distinctUntilChanged = function(keySelector, comparer) {
	var source = this;
	keySelector || (keySelector = identity);
	comparer || (comparer = defaultComparer);
	return new Rx.Internals.AnonymousObservable(function(observer) {
		var hasCurrentKey = false, currentKey;
		return source
				.subscribe(function(value) {
					var comparerEquals = false, key;
					try {
						key = keySelector(value);
					} catch (exception) {
						observer.onError(exception);
						return;
					}
					if (hasCurrentKey) {
						try {
							comparerEquals = comparer(currentKey, key);
						} catch (exception) {
							observer.onError(exception);
							return;
						}
					}
					if (!hasCurrentKey || !comparerEquals) {
						hasCurrentKey = true;
						currentKey = key;
						observer.onNext(value);
					}
				}, observer.onError.bind(observer), observer.onCompleted
						.bind(observer));
	});
};

/**
 * Invokes an action for each element in the observable sequence and invokes an
 * action upon graceful or exceptional termination of the observable sequence.
 * This method can be used for debugging, logging, etc. of query behavior by
 * intercepting the message stream to run arbitrary actions for messages on the
 * pipeline.
 * 
 * @example 1 - Rx.Observable.doAction(observer); 2 -
 *          Rx.Observable.doAction(onNext); 3 - Rx.Observable.doAction(onNext,
 *          onError); 4 - Rx.Observable.doAction(onNext, onError, onCompleted);
 * 
 * @memberOf Observable#
 * @param {Mixed}
 *            observerOrOnNext Action to invoke for each element in the
 *            observable sequence or an observer.
 * @param {Function}
 *            [onError] Action to invoke upon exceptional termination of the
 *            observable sequence. Used if only the observerOrOnNext parameter
 *            is also a function.
 * @param {Function}
 *            [onCompleted] Action to invoke upon graceful termination of the
 *            observable sequence. Used if only the observerOrOnNext parameter
 *            is also a function.
 * @returns {Observable} The source sequence with the side-effecting behavior
 *          applied.
 */
Rx.Observable.prototype.doAction = function(observerOrOnNext, onError,
		onCompleted) {
	var source = this, onNextFunc;
	if (typeof observerOrOnNext === 'function') {
		onNextFunc = observerOrOnNext;
	} else {
		onNextFunc = observerOrOnNext.onNext.bind(observerOrOnNext);
		onError = observerOrOnNext.onError.bind(observerOrOnNext);
		onCompleted = observerOrOnNext.onCompleted.bind(observerOrOnNext);
	}
	return new Rx.Internals.AnonymousObservable(function(observer) {
		return source.subscribe(function(x) {
			try {
				onNextFunc(x);
			} catch (e) {
				observer.onError(e);
			}
			observer.onNext(x);
		}, function(exception) {
			if (!onError) {
				observer.onError(exception);
			} else {
				try {
					onError(exception);
				} catch (e) {
					observer.onError(e);
				}
				observer.onError(exception);
			}
		}, function() {
			if (!onCompleted) {
				observer.onCompleted();
			} else {
				try {
					onCompleted();
				} catch (e) {
					observer.onError(e);
				}
				observer.onCompleted();
			}
		});
	});
};

/**
 * Invokes a specified action after the source observable sequence terminates
 * gracefully or exceptionally.
 * 
 * @example 1 - obs = Rx.Observable.finallyAction(function () {
 *          console.log('sequence ended'; });
 * 
 * @memberOf Observable#
 * @param {Function}
 *            finallyAction Action to invoke after the source observable
 *            sequence terminates.
 * @returns {Observable} Source sequence with the action-invoking termination
 *          behavior applied.
 */
Rx.Observable.prototype.finallyAction = function(action) {
	var source = this;
	return new Rx.Internals.AnonymousObservable(function(observer) {
		var subscription = source.subscribe(observer);
		return disposableCreate(function() {
			try {
				subscription.dispose();
			} catch (e) {
				throw e;
			} finally {
				action();
			}
		});
	});
};

/**
 * Ignores all elements in an observable sequence leaving only the termination
 * messages.
 * 
 * @memberOf Observable#
 * @returns {Observable} An empty observable sequence that signals termination,
 *          successful or exceptional, of the source sequence.
 */
Rx.Observable.prototype.ignoreElements = function() {
	var source = this;
	return new Rx.Internals.AnonymousObservable(function(observer) {
		return source.subscribe(goog.nullFunction, observer.onError.bind(observer),
				observer.onCompleted.bind(observer));
	});
};

/**
 * Materializes the implicit notifications of an observable sequence as explicit
 * notification values.
 * 
 * @memberOf Observable#
 * @returns {Observable} An observable sequence containing the materialized
 *          notification values from the source sequence.
 */
Rx.Observable.prototype.materialize = function() {
	var source = this;
	return new Rx.Internals.AnonymousObservable(function(observer) {
		return source.subscribe(function(value) {
			observer.onNext(notificationCreateOnNext(value));
		}, function(exception) {
			observer.onNext(notificationCreateOnError(exception));
			observer.onCompleted();
		}, function() {
			observer.onNext(notificationCreateOnCompleted());
			observer.onCompleted();
		});
	});
};

/**
 * Repeats the observable sequence a specified number of times. If the repeat
 * count is not specified, the sequence repeats indefinitely.
 * 
 * @example 1 - repeated = source.repeat(); 2 - repeated = source.repeat(42);
 * 
 * @memberOf Observable#
 * @param {Number}
 *            [repeatCount] Number of times to repeat the sequence. If not
 *            provided, repeats the sequence indefinitely.
 * @returns {Observable} The observable sequence producing the elements of the
 *          given sequence repeatedly.
 */
Rx.Observable.prototype.repeat = function(repeatCount) {
	return enumerableRepeat(this, repeatCount).concat();
};

/**
 * Repeats the source observable sequence the specified number of times or until
 * it successfully terminates. If the retry count is not specified, it retries
 * indefinitely.
 * 
 * @example 1 - retried = retry.repeat(); 2 - retried = retry.repeat(42);
 * 
 * @memberOf Observable#
 * @param {Number}
 *            [retryCount] Number of times to retry the sequence. If not
 *            provided, retry the sequence indefinitely.
 * @returns {Observable} An observable sequence producing the elements of the
 *          given sequence repeatedly until it terminates successfully.
 */
Rx.Observable.prototype.retry = function(retryCount) {
	return enumerableRepeat(this, retryCount).catchException();
};

/**
 * Applies an accumulator function over an observable sequence and returns each
 * intermediate result. The optional seed value is used as the initial
 * accumulator value. For aggregation behavior with no intermediate results, see
 * Rx.Observable.aggregate.
 * 
 * 1 - scanned = source.scan(function (acc, x) { return acc + x; }); 2 - scanned =
 * source.scan(0, function (acc, x) { return acc + x; });
 * 
 * @memberOf Observable#
 * @param {Mixed}
 *            [seed] The initial accumulator value.
 * @param {Function}
 *            accumulator An accumulator function to be invoked on each element.
 * @returns {Observable} An observable sequence containing the accumulated
 *          values.
 */
Rx.Observable.prototype.scan = function() {
	var seed, hasSeed = false, accumulator;
	if (arguments.length === 2) {
		seed = arguments[0];
		accumulator = arguments[1];
		hasSeed = true;
	} else {
		accumulator = arguments[0];
	}
	var source = this;
	return Rx.Observable.defer(function() {
		var hasAccumulation = false, accumulation;
		return source.select(function(x) {
			if (hasAccumulation) {
				accumulation = accumulator(accumulation, x);
			} else {
				accumulation = hasSeed ? accumulator(seed, x) : x;
				hasAccumulation = true;
			}
			return accumulation;
		});
	});
};

/**
 * Bypasses a specified number of elements at the end of an observable sequence.
 * 
 * @memberOf Observable#
 * @description This operator accumulates a queue with a length enough to store
 *              the first <paramref name="count"/> elements. As more elements
 *              are received, elements are taken from the front of the queue and
 *              produced on the result sequence. This causes elements to be
 *              delayed.
 * @param count
 *            Number of elements to bypass at the end of the source sequence.
 * @returns {Observable} An observable sequence containing the source sequence
 *          elements except for the bypassed ones at the end.
 */
Rx.Observable.prototype.skipLast = function(count) {
	var source = this;
	return new Rx.Internals.AnonymousObservable(function(observer) {
		var q = [];
		return source
				.subscribe(function(x) {
					q.push(x);
					if (q.length > count) {
						observer.onNext(q.shift());
					}
				}, observer.onError.bind(observer), observer.onCompleted
						.bind(observer));
	});
};

/**
 * Prepends a sequence of values to an observable sequence with an optional
 * scheduler and an argument list of values to prepend.
 * 
 * 1 - source.startWith(1, 2, 3); 2 - source.startWith(Rx.Scheduler.timeout, 1,
 * 2, 3);
 * 
 * @memberOf Observable#
 * @returns {Observable} The source sequence prepended with the specified
 *          values.
 */
Rx.Observable.prototype.startWith = function() {
	var values, scheduler, start = 0;
	if (!!arguments.length && 'now' in Object(arguments[0])) {
		scheduler = arguments[0];
		start = 1;
	} else {
		scheduler = immediateScheduler;
	}
	values = slice.call(arguments, start);
	return enumerableFor([ observableFromArray(values, scheduler), this ])
			.concat();
};

/**
 * Returns a specified number of contiguous elements from the end of an
 * observable sequence, using an optional scheduler to drain the queue.
 * 
 * @example 1 - obs = source.takeLast(5); 2 - obs = source.takeLast(5,
 *          Rx.Scheduler.timeout);
 * 
 * @description This operator accumulates a buffer with a length enough to store
 *              elements count elements. Upon completion of the source sequence,
 *              this buffer is drained on the result sequence. This causes the
 *              elements to be delayed.
 * 
 * @memberOf Observable#
 * @param {Number}
 *            count Number of elements to take from the end of the source
 *            sequence.
 * @param {Scheduler}
 *            [scheduler] Scheduler used to drain the queue upon completion of
 *            the source sequence.
 * @returns {Observable} An observable sequence containing the specified number
 *          of elements from the end of the source sequence.
 */
Rx.Observable.prototype.takeLast = function(count, scheduler) {
	return this.takeLastBuffer(count).selectMany(function(xs) {
		return observableFromArray(xs, scheduler);
	});
};

/**
 * Returns an array with the specified number of contiguous elements from the
 * end of an observable sequence.
 * 
 * @description This operator accumulates a buffer with a length enough to store
 *              count elements. Upon completion of the source sequence, this
 *              buffer is produced on the result sequence.
 * 
 * @memberOf Observable#
 * @param {Number}
 *            count Number of elements to take from the end of the source
 *            sequence.
 * @returns {Observable} An observable sequence containing a single array with
 *          the specified number of elements from the end of the source
 *          sequence.
 */
Rx.Observable.prototype.takeLastBuffer = function(count) {
	var source = this;
	return new Rx.Internals.AnonymousObservable(function(observer) {
		var q = [];
		return source.subscribe(function(x) {
			q.push(x);
			if (q.length > count) {
				q.shift();
			}
		}, observer.onError.bind(observer), function() {
			observer.onNext(q);
			observer.onCompleted();
		});
	});
};

/**
 * Projects each element of an observable sequence into zero or more windows
 * which are produced based on element count information.
 * 
 * 1 - xs.windowWithCount(10); 2 - xs.windowWithCount(10, 1);
 * 
 * @memberOf Observable#
 * @param {Number}
 *            count Length of each window.
 * @param {Number}
 *            [skip] Number of elements to skip between creation of consecutive
 *            windows. If not specified, defaults to the count.
 * @returns {Observable} An observable sequence of windows.
 */
Rx.Observable.prototype.windowWithCount = function(count, skip) {
	var source = this;
	if (count <= 0) {
		throw new Error(argumentOutOfRange);
	}
	if (skip == null) {
		skip = count;
	}
	if (skip <= 0) {
		throw new Error(argumentOutOfRange);
	}
	return new Rx.Internals.AnonymousObservable(
			function(observer) {
				var m = new SingleAssignmentDisposable(), refCountDisposable = new RefCountDisposable(
						m), n = 0, q = [], createWindow = function() {
					var s = new Rx.Subject();
					q.push(s);
					observer.onNext(addRef(s, refCountDisposable));
				};
				createWindow();
				m.setDisposable(source.subscribe(function(x) {
					var s;
					for ( var i = 0, len = q.length; i < len; i++) {
						q[i].onNext(x);
					}
					var c = n - count + 1;
					if (c >= 0 && c % skip === 0) {
						s = q.shift();
						s.onCompleted();
					}
					n++;
					if (n % skip === 0) {
						createWindow();
					}
				}, function(exception) {
					while (q.length > 0) {
						q.shift().onError(exception);
					}
					observer.onError(exception);
				}, function() {
					while (q.length > 0) {
						q.shift().onCompleted();
					}
					observer.onCompleted();
				}));
				return refCountDisposable;
			});
};

/**
 * Returns the elements of the specified sequence or the specified value in a
 * singleton sequence if the sequence is empty.
 * 
 * 1 - obs = xs.defaultIfEmpty(); 2 - obs = xs.defaultIfEmpty(false);
 * 
 * @memberOf Observable#
 * @param defaultValue
 *            The value to return if the sequence is empty. If not provided,
 *            this defaults to null.
 * @returns {Observable} An observable sequence that contains the specified
 *          default value if the source is empty; otherwise, the elements of the
 *          source itself.
 */
Rx.Observable.prototype.defaultIfEmpty = function(defaultValue) {
	var source = this;
	if (defaultValue === undefined) {
		defaultValue = null;
	}
	return new Rx.Internals.AnonymousObservable(function(observer) {
		var found = false;
		return source.subscribe(function(x) {
			found = true;
			observer.onNext(x);
		}, observer.onError.bind(observer), function() {
			if (!found) {
				observer.onNext(defaultValue);
			}
			observer.onCompleted();
		});
	});
};

/**
 * Returns an observable sequence that contains only distinct elements according
 * to the keySelector and the comparer. Usage of this operator should be
 * considered carefully due to the maintenance of an internal lookup structure
 * which can grow large.
 * 
 * @example 1 - obs = xs.distinct(); 2 - obs = xs.distinct(function (x) { return
 *          x.id; }); 2 - obs = xs.distinct(function (x) { return x.id; },
 *          function (x) { return x.toString(); });
 * 
 * @memberOf Observable#
 * @param {Function}
 *            [keySelector] A function to compute the comparison key for each
 *            element.
 * @param {Function}
 *            [keySerializer] Used to serialize the given object into a string
 *            for object comparison.
 * @returns {Observable} An observable sequence only containing the distinct
 *          elements, based on a computed key value, from the source sequence.
 */
Rx.Observable.prototype.distinct = function(keySelector, keySerializer) {
	var source = this;
	keySelector || (keySelector = identity);
	keySerializer || (keySerializer = defaultKeySerializer);
	return new Rx.Internals.AnonymousObservable(function(observer) {
		var hashSet = {};
		return source
				.subscribe(function(x) {
					var key, serializedKey, otherKey, hasMatch = false;
					try {
						key = keySelector(x);
						serializedKey = keySerializer(key);
					} catch (exception) {
						observer.onError(exception);
						return;
					}
					for (otherKey in hashSet) {
						if (serializedKey === otherKey) {
							hasMatch = true;
							break;
						}
					}
					if (!hasMatch) {
						hashSet[serializedKey] = null;
						observer.onNext(x);
					}
				}, observer.onError.bind(observer), observer.onCompleted
						.bind(observer));
	});
};

/**
 * Groups the elements of an observable sequence according to a specified key
 * selector function and comparer and selects the resulting elements by using a
 * specified function.
 * 
 * @example 1 - Rx.Observable.groupBy(function (x) { return x.id; }); 2 -
 *          Rx.Observable.groupBy(function (x) { return x.id; }), function (x) {
 *          return x.name; }); 3 - Rx.Observable.groupBy(function (x) { return
 *          x.id; }), function (x) { return x.name; }, function (x) { return
 *          x.toString(); });
 * 
 * @memberOf Observable#
 * @param {Function}
 *            keySelector A function to extract the key for each element.
 * @param {Function}
 *            [elementSelector] A function to map each source element to an
 *            element in an observable group.
 * @param {Function}
 *            [keySerializer] Used to serialize the given object into a string
 *            for object comparison.
 * @returns {Observable} A sequence of observable groups, each of which
 *          corresponds to a unique key value, containing all elements that
 *          share that same key value.
 */
Rx.Observable.prototype.groupBy = function(keySelector, elementSelector,
		keySerializer) {
	return this.groupByUntil(keySelector, elementSelector, function() {
		return observableNever();
	}, keySerializer);
};

/**
 * Groups the elements of an observable sequence according to a specified key
 * selector function. A duration selector function is used to control the
 * lifetime of groups. When a group expires, it receives an OnCompleted
 * notification. When a new element with the same key value as a reclaimed group
 * occurs, the group will be reborn with a new lifetime request.
 * 
 * @example 1 - Rx.Observable.groupByUntil(function (x) { return x.id; }, null,
 *          function () { return Rx.Observable.never(); }); 2 -
 *          Rx.Observable.groupBy(function (x) { return x.id; }), function (x) {
 *          return x.name; }, function () { return Rx.Observable.never(); }); 3 -
 *          Rx.Observable.groupBy(function (x) { return x.id; }), function (x) {
 *          return x.name; }, function () { return Rx.Observable.never(); },
 *          function (x) { return x.toString(); });
 * 
 * @memberOf Observable#
 * @param {Function}
 *            keySelector A function to extract the key for each element.
 * @param {Function}
 *            durationSelector A function to signal the expiration of a group.
 * @param {Function}
 *            [keySerializer] Used to serialize the given object into a string
 *            for object comparison.
 * @returns {Observable} A sequence of observable groups, each of which
 *          corresponds to a unique key value, containing all elements that
 *          share that same key value. If a group's lifetime expires, a new
 *          group with the same key value can be created once an element with
 *          such a key value is encoutered.
 * 
 */
Rx.Observable.prototype.groupByUntil = function(keySelector, elementSelector,
		durationSelector, keySerializer) {
	var source = this;
	elementSelector || (elementSelector = identity);
	keySerializer || (keySerializer = defaultKeySerializer);
	return new Rx.Internals.AnonymousObservable(
			function(observer) {
				var map = {}, groupDisposable = new CompositeDisposable(), refCountDisposable = new RefCountDisposable(
						groupDisposable);
				groupDisposable
						.add(source
								.subscribe(
										function(x) {
											var duration, durationGroup, element, fireNewMapEntry, group, key, serializedKey, md, writer, w;
											try {
												key = keySelector(x);
												serializedKey = keySerializer(key);
											} catch (e) {
												for (w in map) {
													map[w].onError(e);
												}
												observer.onError(e);
												return;
											}
											fireNewMapEntry = false;
											try {
												writer = map[serializedKey];
												if (!writer) {
													writer = new Rx.Subject();
													map[serializedKey] = writer;
													fireNewMapEntry = true;
												}
											} catch (e) {
												for (w in map) {
													map[w].onError(e);
												}
												observer.onError(e);
												return;
											}
											if (fireNewMapEntry) {
												group = new GroupedObservable(
														key, writer,
														refCountDisposable);
												durationGroup = new GroupedObservable(
														key, writer);
												try {
													duration = durationSelector(durationGroup);
												} catch (e) {
													for (w in map) {
														map[w].onError(e);
													}
													observer.onError(e);
													return;
												}
												observer.onNext(group);
												md = new SingleAssignmentDisposable();
												groupDisposable.add(md);
												var expire = function() {
													if (serializedKey in map) {
														delete map[serializedKey];
														writer.onCompleted();
													}
													groupDisposable.remove(md);
												};
												md
														.setDisposable(duration
																.take(1)
																.subscribe(
																		goog.nullFunction,
																		function(
																				exn) {
																			for (w in map) {
																				map[w]
																						.onError(exn);
																			}
																			observer
																					.onError(exn);
																		},
																		function() {
																			expire();
																		}));
											}
											try {
												element = elementSelector(x);
											} catch (e) {
												for (w in map) {
													map[w].onError(e);
												}
												observer.onError(e);
												return;
											}
											writer.onNext(element);
										}, function(ex) {
											for ( var w in map) {
												map[w].onError(ex);
											}
											observer.onError(ex);
										}, function() {
											for ( var w in map) {
												map[w].onCompleted();
											}
											observer.onCompleted();
										}));
				return refCountDisposable;
			});
};

/**
 * Projects each element of an observable sequence into a new form by
 * incorporating the element's index.
 * 
 * @example source.select(function (value, index) { return value * value +
 *          index; });
 * 
 * @memberOf Observable#
 * @param {Function}
 *            selector A transform function to apply to each source element; the
 *            second parameter of the function represents the index of the
 *            source element.
 * @param {Any}
 *            [thisArg] Object to use as this when executing callback.
 * @returns {Observable} An observable sequence whose elements are the result of
 *          invoking the transform function on each element of source.
 */
Rx.Observable.prototype.select = function(selector, thisArg) {
	var parent = this;
	return new Rx.Internals.AnonymousObservable(function(observer) {
		var count = 0;
		return parent
				.subscribe(
						function(value) {
							var result;
							try {
								result = selector.call(thisArg, value, count++,
										parent);
							} catch (exception) {
								observer.onError(exception);
								return;
							}
							observer.onNext(result);
						}, observer.onError.bind(observer),
						observer.onCompleted.bind(observer));
	});
};

Rx.Observable.prototype.map = Rx.Observable.prototype.select;

function selectMany(selector) {
	return this.select(selector).mergeObservable();
}

/**
 * One of the Following: Projects each element of an observable sequence to an
 * observable sequence and merges the resulting observable sequences into one
 * observable sequence.
 * 
 * @example 1 - source.selectMany(function (x) { return Rx.Observable.range(0,
 *          x); }); Or: Projects each element of an observable sequence to an
 *          observable sequence, invokes the result selector for the source
 *          element and each of the corresponding inner sequence's elements, and
 *          merges the results into one observable sequence.
 * 
 * 1 - source.selectMany(function (x) { return Rx.Observable.range(0, x); },
 * function (x, y) { return x + y; }); Or: Projects each element of the source
 * observable sequence to the other observable sequence and merges the resulting
 * observable sequences into one observable sequence.
 * 
 * 1 - source.selectMany(Rx.Observable.fromArray([1,2,3]));
 * 
 * @memberOf Observable#
 * @param selector
 *            A transform function to apply to each element or an observable
 *            sequence to project each element from the source sequence onto.
 * @param {Function}
 *            [resultSelector] A transform function to apply to each element of
 *            the intermediate sequence.
 * @returns {Observable} An observable sequence whose elements are the result of
 *          invoking the one-to-many transform function collectionSelector on
 *          each element of the input sequence and then mapping each of those
 *          sequence elements and their corresponding source element to a result
 *          element.
 */
Rx.Observable.prototype.selectMany = Rx.Observable.prototype.flatMap = function(
		selector, resultSelector) {
	if (resultSelector) {
		return this.selectMany(function(x) {
			return selector(x).select(function(y) {
				return resultSelector(x, y);
			});
		});
	}
	if (typeof selector === 'function') {
		return selectMany.call(this, selector);
	}
	return selectMany.call(this, function() {
		return selector;
	});
};

/**
 * Bypasses a specified number of elements in an observable sequence and then
 * returns the remaining elements.
 * 
 * @memberOf Observable#
 * @param {Number}
 *            count The number of elements to skip before returning the
 *            remaining elements.
 * @returns {Observable} An observable sequence that contains the elements that
 *          occur after the specified index in the input sequence.
 */
Rx.Observable.prototype.skip = function(count) {
	if (count < 0) {
		throw new Error(argumentOutOfRange);
	}
	var observable = this;
	return new Rx.Internals.AnonymousObservable(function(observer) {
		var remaining = count;
		return Rx.Observable
				.subscribe(function(x) {
					if (remaining <= 0) {
						observer.onNext(x);
					} else {
						remaining--;
					}
				}, observer.onError.bind(observer), observer.onCompleted
						.bind(observer));
	});
};

/**
 * Bypasses elements in an observable sequence as long as a specified condition
 * is true and then returns the remaining elements. The element's index is used
 * in the logic of the predicate function.
 * 
 * 1 - source.skipWhile(function (value) { return value < 10; }); 1 -
 * source.skipWhile(function (value, index) { return value < 10 || index < 10;
 * });
 * 
 * @memberOf Observable#
 * @param {Function}
 *            predicate A function to test each element for a condition; the
 *            second parameter of the function represents the index of the
 *            source element.
 * @returns {Observable} An observable sequence that contains the elements from
 *          the input sequence starting at the first element in the linear
 *          series that does not pass the test specified by predicate.
 */
Rx.Observable.prototype.skipWhile = function(predicate) {
	var source = this;
	return new Rx.Internals.AnonymousObservable(function(observer) {
		var i = 0, running = false;
		return source
				.subscribe(function(x) {
					if (!running) {
						try {
							running = !predicate(x, i++);
						} catch (e) {
							observer.onError(e);
							return;
						}
					}
					if (running) {
						observer.onNext(x);
					}
				}, observer.onError.bind(observer), observer.onCompleted
						.bind(observer));
	});
};

/**
 * Returns a specified number of contiguous elements from the start of an
 * observable sequence, using the specified scheduler for the edge case of
 * take(0).
 * 
 * 1 - source.take(5); 2 - source.take(0, Rx.Scheduler.timeout);
 * 
 * @memberOf Observable#
 * @param {Number}
 *            count The number of elements to return.
 * @param {Scheduler}
 *            [scheduler] Scheduler used to produce an OnCompleted message in
 *            case <paramref name="count count</paramref> is set to 0.
 * @returns {Observable} An observable sequence that contains the specified
 *          number of elements from the start of the input sequence.
 */
Rx.Observable.prototype.take = function(count, scheduler) {
	if (count < 0) {
		throw new Error(argumentOutOfRange);
	}
	if (count === 0) {
		return observableEmpty(scheduler);
	}
	var observable = this;
	return new Rx.Internals.AnonymousObservable(function(observer) {
		var remaining = count;
		return Rx.Observable
				.subscribe(function(x) {
					if (remaining > 0) {
						remaining--;
						observer.onNext(x);
						if (remaining === 0) {
							observer.onCompleted();
						}
					}
				}, observer.onError.bind(observer), observer.onCompleted
						.bind(observer));
	});
};

/**
 * Returns elements from an observable sequence as long as a specified condition
 * is true. The element's index is used in the logic of the predicate function.
 * 
 * @example 1 - source.takeWhile(function (value) { return value < 10; }); 1 -
 *          source.takeWhile(function (value, index) { return value < 10 ||
 *          index < 10; });
 * 
 * @memberOf Observable#
 * @param {Function}
 *            predicate A function to test each element for a condition; the
 *            second parameter of the function represents the index of the
 *            source element.
 * @returns {Observable} An observable sequence that contains the elements from
 *          the input sequence that occur before the element at which the test
 *          no longer passes.
 */
Rx.Observable.prototype.takeWhile = function(predicate) {
	var observable = this;
	return new Rx.Internals.AnonymousObservable(function(observer) {
		var i = 0, running = true;
		return Rx.Observable
				.subscribe(function(x) {
					if (running) {
						try {
							running = predicate(x, i++);
						} catch (e) {
							observer.onError(e);
							return;
						}
						if (running) {
							observer.onNext(x);
						} else {
							observer.onCompleted();
						}
					}
				}, observer.onError.bind(observer), observer.onCompleted
						.bind(observer));
	});
};

/**
 * Filters the elements of an observable sequence based on a predicate by
 * incorporating the element's index.
 * 
 * @example 1 - source.where(function (value) { return value < 10; }); 1 -
 *          source.where(function (value, index) { return value < 10 || index <
 *          10; });
 * 
 * @memberOf Observable#
 * @param {Function}
 *            predicate A function to test each source element for a condition;
 *            the second parameter of the function represents the index of the
 *            source element.
 * @param {Any}
 *            [thisArg] Object to use as this when executing callback.
 * @returns {Observable} An observable sequence that contains elements from the
 *          input sequence that satisfy the condition.
 */
Rx.Observable.prototype.where = function(predicate, thisArg) {
	var parent = this;
	return new Rx.Internals.AnonymousObservable(function(observer) {
		var count = 0;
		return parent
				.subscribe(function(value) {
					var shouldRun;
					try {
						shouldRun = predicate.call(thisArg, value, count++,
								parent);
					} catch (exception) {
						observer.onError(exception);
						return;
					}
					if (shouldRun) {
						observer.onNext(value);
					}
				}, observer.onError.bind(observer), observer.onCompleted
						.bind(observer));
	});
};

Rx.Observable.prototype.filter = Rx.Observable.prototype.where;



/**
 * @private
 * @constructor
 */
Rx.Internals.AnonymousObservable = function(subscribe) {
	if (!(this instanceof Rx.Internals.AnonymousObservable)) {
		return new Rx.Internals.AnonymousObservable(subscribe);
	}

	function s(observer) {
		var autoDetachObserver = new Rx.AutoDetachObserver(observer);
		if (currentThreadScheduler.scheduleRequired()) {
			currentThreadScheduler.schedule(function() {
				try {
					autoDetachObserver
							.disposable(subscribe(autoDetachObserver));
				} catch (e) {
					if (!autoDetachObserver.fail(e)) {
						throw e;
					}
				}
			});
		} else {
			try {
				autoDetachObserver.disposable(subscribe(autoDetachObserver));
			} catch (e) {
				if (!autoDetachObserver.fail(e)) {
					throw e;
				}
			}
		}

		return autoDetachObserver;
	}

	goog.base(this, s);
}
goog.inherits(Rx.Internals.AnonymousObservable, Rx.Observable);

/**
 * @constructor
 * @private
 */
Rx.GroupedObservable = function(key, underlyingObservable, mergedDisposable) {
	goog.base(this, function(observer) {
		return this.underlyingRx.Observable.subscribe(observer);
	});
	this.key = key;
	this.underlyingObservable = !mergedDisposable ? underlyingObservable
			: new Rx.Internals.AnonymousObservable(function(observer) {
				return new CompositeDisposable(
						mergedDisposable.getDisposable(),
						underlyingRx.Observable.subscribe(observer));
			});
}
goog.inherits(Rx.GroupedObservable, Rx.Observable);

/** @private */
Rx.InnerSubscription = function(subject, observer) {
	this.subject = subject;
	this.observer = observer;
};

/**
 * @private
 * @memberOf InnerSubscription
 */
Rx.InnerSubscription.prototype.dispose = function() {
	if (!this.subject.isDisposed && this.observer !== null) {
		var idx = this.subject.observers.indexOf(this.observer);
		this.subject.observers.splice(idx, 1);
		this.observer = null;
	}
};

