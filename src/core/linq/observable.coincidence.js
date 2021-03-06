    /**
     *  Correlates the elements of two sequences based on overlapping durations.
     *  
     *  @param {Observable} right The right observable sequence to join elements for.
     *  @param {Function} leftDurationSelector A function to select the duration (expressed as an observable sequence) of each element of the left observable sequence, used to determine overlap.
     *  @param {Function} rightDurationSelector A function to select the duration (expressed as an observable sequence) of each element of the right observable sequence, used to determine overlap.
     *  @param {Function} resultSelector A function invoked to compute a result element for any two overlapping elements of the left and right observable sequences. The parameters passed to the function correspond with the elements from the left and right source sequences for which overlap occurs.
     *  @returns {Observable} An observable sequence that contains result elements computed from source elements that have an overlapping duration.
     */    
    observableProto.join = function (right, leftDurationSelector, rightDurationSelector, resultSelector) {
        var left = this;
        return new AnonymousObservable(function (observer) {
            var group = new CompositeDisposable(),
            leftDone = false,
            leftId = 0,
            leftMap = new Dictionary(),
            rightDone = false,
            rightId = 0,
            rightMap = new Dictionary();
            group.add(left.subscribe(function (value) {
                var duration,
                expire,
                id = leftId++,
                md = new SingleAssignmentDisposable(),
                result,
                values;
                leftMap.add(id, value);
                group.add(md);
                expire = function () {
                    if (leftMap.remove(id) && leftMap.count() === 0 && leftDone) {
                        observer.onCompleted();
                    }
                    return group.remove(md);
                };
                try {
                    duration = leftDurationSelector(value);
                } catch (e) {
                    observer.onError(e);
                    return;
                }
                md.disposable(duration.take(1).subscribe(noop, observer.onError.bind(observer), function () { expire(); }));
                values = rightMap.getValues();
                for (var i = 0; i < values.length; i++) {
                    try {
                        result = resultSelector(value, values[i]);
                    } catch (exception) {
                        observer.onError(exception);
                        return;
                    }
                    observer.onNext(result);
                }
            }, observer.onError.bind(observer), function () {
                leftDone = true;
                if (rightDone || leftMap.count() === 0) {
                    observer.onCompleted();
                }
            }));
            group.add(right.subscribe(function (value) {
                var duration,
                expire,
                id = rightId++,
                md = new SingleAssignmentDisposable(),
                result,
                values;
                rightMap.add(id, value);
                group.add(md);
                expire = function () {
                    if (rightMap.remove(id) && rightMap.count() === 0 && rightDone) {
                        observer.onCompleted();
                    }
                    return group.remove(md);
                };
                try {
                    duration = rightDurationSelector(value);
                } catch (exception) {
                    observer.onError(exception);
                    return;
                }
                md.disposable(duration.take(1).subscribe(noop, observer.onError.bind(observer), function () { expire(); }));
                values = leftMap.getValues();
                for (var i = 0; i < values.length; i++) {
                    try {
                        result = resultSelector(values[i], value);
                    } catch (exception) {
                        observer.onError(exception);
                        return;
                    }
                    observer.onNext(result);
                }
            }, observer.onError.bind(observer), function () {
                rightDone = true;
                if (leftDone || rightMap.count() === 0) {
                    observer.onCompleted();
                }
            }));
            return group;
        });
    };

    /**
     *  Correlates the elements of two sequences based on overlapping durations, and groups the results.
     *  
     *  @param {Observable} right The right observable sequence to join elements for.
     *  @param {Function} leftDurationSelector A function to select the duration (expressed as an observable sequence) of each element of the left observable sequence, used to determine overlap.
     *  @param {Function} rightDurationSelector A function to select the duration (expressed as an observable sequence) of each element of the right observable sequence, used to determine overlap.
     *  @param {Function} resultSelector A function invoked to compute a result element for any element of the left sequence with overlapping elements from the right observable sequence. The first parameter passed to the function is an element of the left sequence. The second parameter passed to the function is an observable sequence with elements from the right sequence that overlap with the left sequence's element.
     *  @returns {Observable} An observable sequence that contains result elements computed from source elements that have an overlapping duration.
     */    
    observableProto.groupJoin = function (right, leftDurationSelector, rightDurationSelector, resultSelector) {
        var left = this;
        return new AnonymousObservable(function (observer) {
            var group = new CompositeDisposable(),
            r = new RefCountDisposable(group),
            leftId = 0,
            leftMap = new Dictionary(),
            rightId = 0,
            rightMap = new Dictionary();
            group.add(left.subscribe(function (value) {
                var duration,
                    expire,
                    i,
                    id = leftId++,
                    leftValues,
                    result,
                    rightValues;
                var s = new Subject();
                leftMap.add(id, s);
                try {
                    result = resultSelector(value, addRef(s, r));
                } catch (exception) {
                    leftValues = leftMap.getValues();
                    for (i = 0; i < leftValues.length; i++) {
                        leftValues[i].onError(exception);
                    }
                    observer.onError(exception);
                    return;
                }
                observer.onNext(result);
                rightValues = rightMap.getValues();
                for (i = 0; i < rightValues.length; i++) {
                    s.onNext(rightValues[i]);
                }
                var md = new SingleAssignmentDisposable();
                group.add(md);
                expire = function () {
                    if (leftMap.remove(id)) {
                        s.onCompleted();
                    }
                    group.remove(md);
                };
                try {
                    duration = leftDurationSelector(value);
                } catch (exception) {
                    leftValues = leftMap.getValues();
                    for (i = 0; i < leftValues.length; i++) {
                        leftValues[i].onError(exception);
                    }
                    observer.onError(exception);
                    return;
                }
                md.disposable(duration.take(1).subscribe(noop, function (exn) {
                    leftValues = leftMap.getValues();
                    for (var idx = 0, len = leftValues.length; idx < len; idx++) {
                        leftValues[idx].onError(exn);
                    }
                    observer.onError(exn);
                }, function () {
                    expire();
                }));
            }, function (exception) {
                var i, leftValues;
                leftValues = leftMap.getValues();
                for (i = 0; i < leftValues.length; i++) {
                    leftValues[i].onError(exception);
                }
                observer.onError(exception);
            }, observer.onCompleted.bind(observer)));
            group.add(right.subscribe(function (value) {
                var duration, i, leftValues;
                var id = rightId++;
                rightMap.add(id, value);
                var md = new SingleAssignmentDisposable();
                group.add(md);
                var expire = function () {
                    rightMap.remove(id);
                    group.remove(md);
                };
                try {
                    duration = rightDurationSelector(value);
                } catch (exception) {
                    leftValues = leftMap.getValues();
                    for (i = 0; i < leftValues.length; i++) {
                        leftValues[i].onError(exception);
                    }
                    observer.onError(exception);
                    return;
                }
                md.disposable(duration.take(1).subscribe(noop, function (exn) {
                    leftValues = leftMap.getValues();
                    for (var idx = 0; idx < leftValues.length; idx++) {
                        leftValues[idx].onError(exn);
                    }
                    observer.onError(exn);
                }, function () {
                    expire();
                }));
                leftValues = leftMap.getValues();
                for (i = 0; i < leftValues.length; i++) {
                    leftValues[i].onNext(value);
                }
            }, function (exception) {
                var i, leftValues;
                leftValues = leftMap.getValues();
                for (i = 0; i < leftValues.length; i++) {
                    leftValues[i].onError(exception);
                }
                observer.onError(exception);
            }));
            return r;
        });
    };
    
    /**
     *  Projects each element of an observable sequence into zero or more buffers.
     *  
     *  @param {Mixed} bufferOpeningsOrClosingSelector Observable sequence whose elements denote the creation of new windows, or, a function invoked to define the boundaries of the produced windows (a new window is started when the previous one is closed, resulting in non-overlapping windows).
     *  @param {Function} [bufferClosingSelector] A function invoked to define the closing of each produced window. If a closing selector function is specified for the first parameter, this parameter is ignored.
     *  @returns {Observable} An observable sequence of windows.    
     */
    observableProto.buffer = function (bufferOpeningsOrClosingSelector, bufferClosingSelector) {
        if (arguments.length === 1 && typeof arguments[0] !== 'function') {
            return observableWindowWithBounaries.call(this, bufferOpeningsOrClosingSelector).selectMany(function (item) {
                return item.toArray();
            });
        }
        return typeof bufferOpeningsOrClosingSelector === 'function' ?
            observableWindowWithClosingSelector(bufferOpeningsOrClosingSelector).selectMany(function (item) {
                return item.toArray();
            }) :
            observableWindowWithOpenings(this, bufferOpeningsOrClosingSelector, bufferClosingSelector).selectMany(function (item) {
                return item.toArray();
            });
    };
    
    /**
     *  Projects each element of an observable sequence into zero or more windows.
     *  
     *  @param {Mixed} windowOpeningsOrClosingSelector Observable sequence whose elements denote the creation of new windows, or, a function invoked to define the boundaries of the produced windows (a new window is started when the previous one is closed, resulting in non-overlapping windows).
     *  @param {Function} [windowClosingSelector] A function invoked to define the closing of each produced window. If a closing selector function is specified for the first parameter, this parameter is ignored.
     *  @returns {Observable} An observable sequence of windows.
     */    
    observableProto.window = function (windowOpeningsOrClosingSelector, windowClosingSelector) {
        if (arguments.length === 1 && typeof arguments[0] !== 'function') {
            return observableWindowWithBounaries.call(this, windowOpeningsOrClosingSelector);
        }
        return typeof windowOpeningsOrClosingSelector === 'function' ?
            observableWindowWithClosingSelector.call(this, windowOpeningsOrClosingSelector) :
            observableWindowWithOpenings.call(this, windowOpeningsOrClosingSelector, windowClosingSelector);
    };
    
    function observableWindowWithOpenings(windowOpenings, windowClosingSelector) {
        return windowOpenings.groupJoin(this, windowClosingSelector, function () {
            return observableEmpty();
        }, function (_, window) {
            return window;
        });
    }

    function observableWindowWithBounaries(windowBoundaries) {
        var source = this;
        return new AnonymousObservable(function (observer) {
            var window = new Subject(), 
                d = new CompositeDisposable(), 
                r = new RefCountDisposable(d);

            observer.onNext(addRef(window, r));

            d.add(source.subscribe(function (x) {
                window.onNext(x);
            }, function (err) {
                window.onError(err);
                observer.onError(err);
            }, function () {
                window.onCompleted();
                observer.onCompleted();
            }));

            d.add(windowBoundaries.subscribe(function (w) {
                window.onCompleted();
                window = new Subject();
                observer.onNext(addRef(window, r));
            }, function (err) {
                window.onError(err);
                observer.onError(err);
            }, function () {
                window.onCompleted();
                observer.onCompleted();
            }));

            return r;
        });
    }

    function observableWindowWithClosingSelector(windowClosingSelector) {
        var source = this;
        return new AnonymousObservable(function (observer) {
            var createWindowClose,
                m = new SerialDisposable(),
                d = new CompositeDisposable(m),
                r = new RefCountDisposable(d),
                window = new Subject();
            observer.onNext(addRef(window, r));
            d.add(source.subscribe(function (x) {
                window.onNext(x);
            }, function (ex) {
                window.onError(ex);
                observer.onError(ex);
            }, function () {
                window.onCompleted();
                observer.onCompleted();
            }));
            createWindowClose = function () {
                var m1, windowClose;
                try {
                    windowClose = windowClosingSelector();
                } catch (exception) {
                    observer.onError(exception);
                    return;
                }
                m1 = new SingleAssignmentDisposable();
                m.disposable(m1);
                m1.disposable(windowClose.take(1).subscribe(noop, function (ex) {
                    window.onError(ex);
                    observer.onError(ex);
                }, function () {
                    window.onCompleted();
                    window = new Subject();
                    observer.onNext(addRef(window, r));
                    createWindowClose();
                }));
            };
            createWindowClose();
            return r;
        });
    }
