goog.provide('Rx.CompositeDisposable')
goog.provide('Rx.Disposable')
goog.provide('Rx.SingleAssignmentDisposable')
goog.provide('Rx.SerialDisposable')
goog.provide('Rx.RefCountDisposable')
goog.provide('Rx.ScheduledDisposable')
/**
 * Represents a group of disposable resources that are disposed together.
 * 
 * @constructor
 */
Rx.CompositeDisposable = function() {
	this.disposables = argsOrArray(arguments, 0);
	this.isDisposed = false;
	this.length = this.disposables.length;
};

/**
 * Adds a disposable to the CompositeDisposable or disposes the disposable if
 * the CompositeDisposable is disposed.
 * 
 * @param {Mixed}
 *            item Disposable to add.
 */
Rx.CompositeDisposable.prototype.add = function(item) {
	if (this.isDisposed) {
		item.dispose();
	} else {
		this.disposables.push(item);
		this.length++;
	}
};

/**
 * Removes and disposes the first occurrence of a disposable from the
 * CompositeDisposable.
 * 
 * @memberOf CompositeDisposable#
 * @param {Mixed}
 *            item Disposable to remove.
 * @returns {Boolean} true if found; false otherwise.
 */
Rx.CompositeDisposable.prototype.remove = function(item) {
	var shouldDispose = false;
	if (!this.isDisposed) {
		var idx = this.disposables.indexOf(item);
		if (idx !== -1) {
			shouldDispose = true;
			this.disposables.splice(idx, 1);
			this.length--;
			item.dispose();
		}

	}
	return shouldDispose;
};

/**
 * Disposes all disposables in the group and removes them from the group.
 * 
 * @memberOf CompositeDisposable#
 */
Rx.CompositeDisposable.prototype.dispose = function() {
	if (!this.isDisposed) {
		this.isDisposed = true;
		var currentDisposables = this.disposables.slice(0);
		this.disposables = [];
		this.length = 0;

		for ( var i = 0, len = currentDisposables.length; i < len; i++) {
			currentDisposables[i].dispose();
		}
	}
};

/**
 * Removes and disposes all disposables from the CompositeDisposable, but does
 * not dispose the CompositeDisposable.
 * 
 * @memberOf CompositeDisposable#
 */
Rx.CompositeDisposable.prototype.clear = function() {
	var currentDisposables = this.disposables.slice(0);
	this.disposables = [];
	this.length = 0;
	for ( var i = 0, len = currentDisposables.length; i < len; i++) {
		currentDisposables[i].dispose();
	}
};

/**
 * Determines whether the CompositeDisposable contains a specific disposable.
 * 
 * @memberOf CompositeDisposable#
 * @param {Mixed}
 *            item Disposable to search for.
 * @returns {Boolean} true if the disposable was found; otherwise, false.
 */
Rx.CompositeDisposable.prototype.contains = function(item) {
	return this.disposables.indexOf(item) !== -1;
};

/**
 * Converts the existing CompositeDisposable to an array of disposables
 * 
 * @memberOf CompositeDisposable#
 * @returns {Array} An array of disposable objects.
 */
Rx.CompositeDisposable.prototype.toArray = function() {
	return this.disposables.slice(0);
};

/**
 * Provides a set of static methods for creating Disposables.
 * 
 * @constructor
 * @param {Function}
 *            dispose Action to run during the first call to dispose. The action
 *            is guaranteed to be run at most once.
 */
Rx.Disposable = function(action) {
	this.isDisposed = false;
	this.action = action;
};

/**
 * Performs the task of cleaning up resources.
 * 
 * @memberOf Disposable#
 */
Rx.Disposable.prototype.dispose = function() {
	if (!this.isDisposed) {
		this.action();
		this.isDisposed = true;
	}
};

/**
 * Creates a disposable object that invokes the specified action when disposed.
 * 
 * @static
 * @memberOf Disposable
 * @param {Function}
 *            dispose Action to run during the first call to dispose. The action
 *            is guaranteed to be run at most once.
 * @return {Disposable} The disposable object that runs the given action upon
 *         disposal.
 */
Rx.Disposable.create = function(action) {
	return new Disposable(action);
};

/**
 * Gets the disposable that does nothing when disposed.
 * 
 * @static
 * @memberOf Disposable
 */
Rx.Disposable.empty = {
	dispose : goog.nullFunction
};

/**
 * Represents a disposable resource which only allows a single assignment of its
 * underlying disposable resource. If an underlying disposable resource has
 * already been set, future attempts to set the underlying disposable resource
 * will throw an Error.
 * 
 * @constructor
 */
Rx.SingleAssignmentDisposable = function() {
	this.isDisposed = false;
	this.current = null;
};

/**
 * Gets or sets the underlying disposable. After disposal, the result of getting
 * this method is undefined.
 * 
 * @memberOf SingleAssignmentDisposable#
 * @param {Disposable}
 *            [value] The new underlying disposable.
 * @returns {Disposable} The underlying disposable.
 */
Rx.SingleAssignmentDisposable.prototype.disposable = function(value) {
	return !value ? this.getDisposable() : this.setDisposable(value);
};

/**
 * Gets the underlying disposable. After disposal, the result of getting this
 * method is undefined.
 * 
 * @memberOf SingleAssignmentDisposable#
 * @returns {Disposable} The underlying disposable.
 */
Rx.SingleAssignmentDisposable.prototype.getDisposable = function() {
	return this.current;
};

/**
 * Sets the underlying disposable.
 * 
 * @memberOf SingleAssignmentDisposable#
 * @param {Disposable}
 *            value The new underlying disposable.
 */
Rx.SingleAssignmentDisposable.prototype.setDisposable = function(value) {
	if (this.current) {
		throw new Error('Disposable has already been assigned');
	}
	var shouldDispose = this.isDisposed;
	if (!shouldDispose) {
		this.current = value;
	}
	if (shouldDispose && value) {
		value.dispose();
	}
};

/**
 * Disposes the underlying disposable.
 * 
 * @memberOf SingleAssignmentDisposable#
 */
Rx.SingleAssignmentDisposable.prototype.dispose = function() {
	var old;
	if (!this.isDisposed) {
		this.isDisposed = true;
		old = this.current;
		this.current = null;
	}
	if (old) {
		old.dispose();
	}
};

/**
 * Represents a disposable resource whose underlying disposable resource can be
 * replaced by another disposable resource, causing automatic disposal of the
 * previous underlying disposable resource.
 * 
 * @constructor
 */
Rx.SerialDisposable = function() {
	this.isDisposed = false;
	this.current = null;
};

/**
 * Gets the underlying disposable.
 * 
 * @return The underlying disposable</returns>
 */
Rx.SerialDisposable.prototype.getDisposable = function() {
	return this.current;
};

/**
 * Sets the underlying disposable.
 * 
 * @memberOf SerialDisposable#
 * @param {Disposable}
 *            value The new underlying disposable.
 */
Rx.SerialDisposable.prototype.setDisposable = function(value) {
	var shouldDispose = this.isDisposed, old;
	if (!shouldDispose) {
		old = this.current;
		this.current = value;
	}
	if (old) {
		old.dispose();
	}
	if (shouldDispose && value) {
		value.dispose();
	}
};

/**
 * Gets or sets the underlying disposable. If the SerialDisposable has already
 * been disposed, assignment to this property causes immediate disposal of the
 * given disposable object. Assigning this property disposes the previous
 * disposable object.
 * 
 * @memberOf SerialDisposable#
 * @param {Disposable}
 *            [value] The new underlying disposable.
 * @returns {Disposable} The underlying disposable.
 */
Rx.SerialDisposable.prototype.disposable = function(value) {
	if (!value) {
		return this.getDisposable();
	} else {
		this.setDisposable(value);
	}
};

/**
 * Disposes the underlying disposable as well as all future replacements.
 * 
 * @memberOf SerialDisposable#
 */
Rx.SerialDisposable.prototype.dispose = function() {
	var old;
	if (!this.isDisposed) {
		this.isDisposed = true;
		old = this.current;
		this.current = null;
	}
	if (old) {
		old.dispose();
	}
};

/**
 * Represents a disposable resource that only disposes its underlying disposable
 * resource when all dependent disposable objects have been disposed.
 */

/**
 * @constructor
 * @private
 */
Rx.RefCountDisposable.InnerDisposable = function(disposable) {
	this.disposable = disposable;
	this.disposable.count++;
	this.isInnerDisposed = false;
}

/** @private */
Rx.RefCountDisposable.InnerDisposable.prototype.dispose = function() {
	if (!this.disposable.isDisposed) {
		if (!this.isInnerDisposed) {
			this.isInnerDisposed = true;
			this.disposable.count--;
			if (this.disposable.count === 0
					&& this.disposable.isPrimaryDisposed) {
				this.disposable.isDisposed = true;
				this.disposable.underlyingDisposable.dispose();
			}
		}
	}
};

/**
 * Initializes a new instance of the RefCountDisposable with the specified
 * disposable.
 * 
 * @constructor
 * @param {Disposable}
 *            disposable Underlying disposable.
 */
Rx.RefCountDisposable = function(disposable) {
	this.underlyingDisposable = disposable;
	this.isDisposed = false;
	this.isPrimaryDisposed = false;
	this.count = 0;
}

/**
 * Disposes the underlying disposable only when all dependent disposables have
 * been disposed
 * 
 * @memberOf RefCountDisposable#
 */
Rx.RefCountDisposable.prototype.dispose = function() {
	if (!this.isDisposed) {
		if (!this.isPrimaryDisposed) {
			this.isPrimaryDisposed = true;
			if (this.count === 0) {
				this.isDisposed = true;
				this.underlyingDisposable.dispose();
			}
		}
	}
};

/**
 * Returns a dependent disposable that when disposed decreases the refcount on
 * the underlying disposable.
 * 
 * @memberOf RefCountDisposable#
 * @returns {Disposable} A dependent disposable contributing to the reference
 *          count that manages the underlying disposable's lifetime.H
 */
Rx.RefCountDisposable.prototype.getDisposable = function() {
	return this.isDisposed ? disposableEmpty
			: new Rx.RefCountDisposable.InnerDisposable(this);
};

/**
 * @constructor
 * @private
 */
Rx.ScheduledDisposable =function(scheduler, disposable) {
	this.scheduler = scheduler, this.disposable = disposable,
			this.isDisposed = false;
}

/**
 * @private
 * @memberOf ScheduledDisposable#
 */
Rx.ScheduledDisposable.prototype.dispose = function() {
	var parent = this;
	this.scheduler.schedule(function() {
		if (!parent.isDisposed) {
			parent.isDisposed = true;
			parent.disposable.dispose();
		}
	});
};