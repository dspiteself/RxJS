goog.provide('Rx.ReactiveTest')
//Defaults
var Observer = Rx.Observer,
    Observable = Rx.Observable,
    slice = Array.prototype.slice,
    Notification = Rx.Notification
    
/**
 * Creates a new object recording the production of the specified value at the given virtual time.
 *
 * @constructor
 * @param {Number} time Virtual time the value was produced on.
 * @param {Mixed} value Value that was produced.
 * @param {Function} comparer An optional comparer.
 */
var Recorded = Rx.Recorded = function (time, value, comparer) {
    this.time = time;
    this.value = value;
    this.comparer = comparer || defaultComparer;
};

/**
 * Checks whether the given recorded object is equal to the current instance.
 *
 * @param {Recorded} other Recorded object to check for equality.
 * @returns {Boolean} true if both objects are equal; false otherwise.  
 */  
Recorded.prototype.equals = function (other) {
    return this.time === other.time && this.comparer(this.value, other.value);
};

/**
 * Returns a string representation of the current Recorded value.
 *
 * @returns {String} String representation of the current Recorded value. 
 */   
Recorded.prototype.toString = function () {
    return this.value.toString() + '@' + this.time;
};


/** 
     * @private 
     * @constructor
     */
    function OnNextPredicate(predicate) {
        this.predicate = predicate;
    };

    /** 
     * @private 
     * @memberOf OnNextPredicate#
     */    
    OnNextPredicate.prototype.equals = function (other) {
        if (other === this) { return true; }
        if (other == null) { return false; }
        if (other.kind !== 'N') { return false; }
        return this.predicate(other.value);
    };

    /** 
     * @private 
     * @constructor
     */
    function OnErrorPredicate(predicate) {
        this.predicate = predicate;
    };

    /** 
     * @private 
     * @memberOf OnErrorPredicate#
     */       
    OnErrorPredicate.prototype.equals = function (other) {
        if (other === this) { return true; }
        if (other == null) { return false; }
        if (other.kind !== 'E') { return false; }
        return this.predicate(other.exception);
    };

    /** 
     * @static
     * type Object
     */
    var ReactiveTest = Rx.ReactiveTest = {
        /** Default virtual time used for creation of observable sequences in unit tests. */
        created: 100,
        /** Default virtual time used to subscribe to observable sequences in unit tests. */
        subscribed: 200,
        /** Default virtual time used to dispose subscriptions in <see cref="ReactiveTest"/>-based unit tests. */
        disposed: 1000,

        /**
         * Factory method for an OnNext notification record at a given time with a given value or a predicate function.
         * 
         * 1 - ReactiveTest.onNext(200, 42);
         * 2 - ReactiveTest.onNext(200, function (x) { return x.length == 2; });
         * 
         * @param ticks Recorded virtual time the OnNext notification occurs.
         * @param value Recorded value stored in the OnNext notification or a predicate.
         * @return Recorded OnNext notification.
         */
        onNext: function (ticks, value) {
            if (typeof value === 'function') {
                return new Recorded(ticks, new OnNextPredicate(value));
            }
            return new Recorded(ticks, Rx.Notification.createOnNext(value));
        },
        /**
         * Factory method for an OnError notification record at a given time with a given error.
         * 
         * 1 - ReactiveTest.onNext(200, new Error('error'));
         * 2 - ReactiveTest.onNext(200, function (e) { return e.message === 'error'; });
         * 
         * @param ticks Recorded virtual time the OnError notification occurs.
         * @param exception Recorded exception stored in the OnError notification.
         * @return Recorded OnError notification. 
         */      
        onError: function (ticks, exception) {
            if (typeof exception === 'function') {
                return new Recorded(ticks, new OnErrorPredicate(exception));
            }
            return new Recorded(ticks, Rx.Notification.createOnError(exception));
        },
        /**
         * Factory method for an OnCompleted notification record at a given time.
         * 
         * @param ticks Recorded virtual time the OnCompleted notification occurs.
         * @return Recorded OnCompleted notification.
         */
        onCompleted: function (ticks) {
            return new Recorded(ticks, Rx.Notification.createOnCompleted());
        },
        /**
         * Factory method for a subscription record based on a given subscription and disposal time.
         * 
         * @param start Virtual time indicating when the subscription was created.
         * @param end Virtual time indicating when the subscription was disposed.
         * @return Subscription object.
         */
        subscribe: function (start, end) {
            return new Subscription(start, end);
        }
    };
