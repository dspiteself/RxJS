goog.provide('Rx.AsyncSubject_test');
goog.require('Rx.AsyncSubject');
goog.require("Rx.Notification")
goog.require("Rx.AnonymousSubject")
goog.require('Rx.ReactiveTest')
goog.require('Rx.TestScheduler')

goog.require('goog.testing.jsunit');


var AsyncSubject ,
	    TestScheduler,
	    onNext,
	    onError,
	    onCompleted,
	    subscribe;
var setUpPage = function() {
    AsyncSubject = Rx.AsyncSubject
    TestScheduler = Rx.TestScheduler
    onNext = Rx.ReactiveTest.onNext
    onError = Rx.ReactiveTest.onError
    onCompleted = Rx.ReactiveTest.onCompleted
    subscribe = Rx.ReactiveTest.subscribe;
    var slice = Array.prototype.slice;

    function defaultComparer(x, y) {
		if (!y.equals) {
			return x === y;
		}
		return x.equals(y);
    }

	function createMessage(actual, expected) {
			return 'Expected: [' + expected.toString() + ']\r\nActual: [' + actual.toString() + ']';
	}

	function areElementsEqual(expected, actual, comparer, message) {
		var i, isOk = true;
		comparer || (comparer = defaultComparer);
		console.log("test",expected,actual,comparer)
		assertTrue(expected.length === actual.length)
		for (i = 0; i < expected.length; i++) {
			assertTrue(comparer(expected[i], actual[i]));

		}
		//ok(isOk, message || createMessage(expected, actual));
	}

    Array.prototype.assertEqual = function () {
        var actual = slice.call(arguments);
        return areElementsEqual(this, actual, defaultComparer);
    };
};


var testInfinite=function () {
        var results1, results2, results3, scheduler, subject, subscription, subscription1, subscription2, subscription3, xs;
        scheduler = new TestScheduler();
        xs = scheduler.createHotObservable(
            onNext(70, 1),
            onNext(110, 2),
            onNext(220, 3),
            onNext(270, 4),
            onNext(340, 5),
            onNext(410, 6),
            onNext(520, 7),
            onNext(630, 8),
            onNext(710, 9),

            onNext(870, 10),
            onNext(940, 11),
            onNext(1020, 12)
        );
        results1 = scheduler.createObserver();
        results2 = scheduler.createObserver();
        results3 = scheduler.createObserver();
        scheduler.scheduleAbsolute(100, function () {
            subject = new AsyncSubject();
        });
        scheduler.scheduleAbsolute(200, function () {
            subscription = xs.subscribe(subject);
        });
        scheduler.scheduleAbsolute(1000, function () {
            subscription.dispose();
        });
        scheduler.scheduleAbsolute(300, function () {
            subscription1 = subject.subscribe(results1);
        });
        scheduler.scheduleAbsolute(400, function () {
            subscription2 = subject.subscribe(results2);
        });
        scheduler.scheduleAbsolute(900, function () {
            subscription3 = subject.subscribe(results3);
        });
        scheduler.scheduleAbsolute(600, function () {
            subscription1.dispose();
        });
        scheduler.scheduleAbsolute(700, function () {
            subscription2.dispose();
        });
        scheduler.scheduleAbsolute(800, function () {
            subscription1.dispose();
        });
        scheduler.scheduleAbsolute(950, function () {
            subscription3.dispose();
        });
        scheduler.start();
        results1.messages.assertEqual();
        results2.messages.assertEqual();
        results3.messages.assertEqual();
    };

var testFinite=function () {
        var results1, results2, results3, scheduler, subject, subscription, subscription1, subscription2, subscription3, xs;
        scheduler = new TestScheduler();
        xs = scheduler.createHotObservable(
            onNext(70, 1),
            onNext(110, 2),
            onNext(220, 3),
            onNext(270, 4),
            onNext(340, 5),
            onNext(410, 6),
            onNext(520, 7),
            onCompleted(630),
            onNext(640, 9),
            onCompleted(650),
            onError(660, 'ex')
        );
        results1 = scheduler.createObserver();
        results2 = scheduler.createObserver();
        results3 = scheduler.createObserver();
        scheduler.scheduleAbsolute(100, function () {
            subject = new AsyncSubject();
        });
        scheduler.scheduleAbsolute(200, function () {
            subscription = xs.subscribe(subject);
        });
        scheduler.scheduleAbsolute(1000, function () {
            subscription.dispose();
        });
        scheduler.scheduleAbsolute(300, function () {
            subscription1 = subject.subscribe(results1);
        });
        scheduler.scheduleAbsolute(400, function () {
            subscription2 = subject.subscribe(results2);
        });
        scheduler.scheduleAbsolute(900, function () {
            subscription3 = subject.subscribe(results3);
        });
        scheduler.scheduleAbsolute(600, function () {
            subscription1.dispose();
        });
        scheduler.scheduleAbsolute(700, function () {
            subscription2.dispose();
        });
        scheduler.scheduleAbsolute(800, function () {
            subscription1.dispose();
        });
        scheduler.scheduleAbsolute(950, function () {
            subscription3.dispose();
        });
        scheduler.start();
        results1.messages.assertEqual();
        results2.messages.assertEqual(onNext(630, 7), onCompleted(630));
        results3.messages.assertEqual(onNext(900, 7), onCompleted(900));
    };

var testError=function () {
        var ex, results1, results2, results3, scheduler, subject, subscription, subscription1, subscription2, subscription3, xs;
        ex = 'ex';
        scheduler = new TestScheduler();
        xs = scheduler.createHotObservable(
            onNext(70, 1),
            onNext(110, 2),
            onNext(220, 3),
            onNext(270, 4),
            onNext(340, 5),
            onNext(410, 6),
            onNext(520, 7),
            onError(630, ex),
            onNext(640, 9),
            onCompleted(650),
            onError(660, 'ex2')
        );
        results1 = scheduler.createObserver();
        results2 = scheduler.createObserver();
        results3 = scheduler.createObserver();
        scheduler.scheduleAbsolute(100, function () {
            subject = new AsyncSubject();
        });
        scheduler.scheduleAbsolute(200, function () {
            subscription = xs.subscribe(subject);
        });
        scheduler.scheduleAbsolute(1000, function () {
            subscription.dispose();
        });
        scheduler.scheduleAbsolute(300, function () {
            subscription1 = subject.subscribe(results1);
        });
        scheduler.scheduleAbsolute(400, function () {
            subscription2 = subject.subscribe(results2);
        });
        scheduler.scheduleAbsolute(900, function () {
            subscription3 = subject.subscribe(results3);
        });
        scheduler.scheduleAbsolute(600, function () {
            subscription1.dispose();
        });
        scheduler.scheduleAbsolute(700, function () {
            subscription2.dispose();
        });
        scheduler.scheduleAbsolute(800, function () {
            subscription1.dispose();
        });
        scheduler.scheduleAbsolute(950, function () {
            subscription3.dispose();
        });
        scheduler.start();
        results1.messages.assertEqual();
        results2.messages.assertEqual(onError(630, ex));
        results3.messages.assertEqual(onError(900, ex));
    };

var testCanceled=function () {
        var results1, results2, results3, scheduler, subject, subscription, subscription1, subscription2, subscription3, xs;
        scheduler = new Rx.TestScheduler();
        xs = scheduler.createHotObservable(
            onCompleted(630),
            onNext(640, 9),
            onCompleted(650),
            onError(660, 'ex')
            );
        results1 = scheduler.createObserver();
        results2 = scheduler.createObserver();
        results3 = scheduler.createObserver();
        scheduler.scheduleAbsolute(100, function () {
            subject = new AsyncSubject();
        });
        scheduler.scheduleAbsolute(200, function () {
            subscription = xs.subscribe(subject);
        });
        scheduler.scheduleAbsolute(1000, function () {
            subscription.dispose();
        });
        scheduler.scheduleAbsolute(300, function () {
            subscription1 = subject.subscribe(results1);
        });
        scheduler.scheduleAbsolute(400, function () {
            subscription2 = subject.subscribe(results2);
        });
        scheduler.scheduleAbsolute(900, function () {
            subscription3 = subject.subscribe(results3);
        });
        scheduler.scheduleAbsolute(600, function () {
            subscription1.dispose();
        });
        scheduler.scheduleAbsolute(700, function () {
            subscription2.dispose();
        });
        scheduler.scheduleAbsolute(800, function () {
            subscription1.dispose();
        });
        scheduler.scheduleAbsolute(950, function () {
            subscription3.dispose();
        });
        scheduler.start();
        results1.messages.assertEqual();
        results2.messages.assertEqual(onCompleted(630));
        results3.messages.assertEqual(onCompleted(900));
};

var testSubjectDisposed=function () {
        var results1, results2, results3, scheduler, subject, subscription1, subscription2, subscription3;
        scheduler = new TestScheduler();
        results1 = scheduler.createObserver();
        results2 = scheduler.createObserver();
        results3 = scheduler.createObserver();
        scheduler.scheduleAbsolute(100, function () {
            subject = new AsyncSubject();
        });
        scheduler.scheduleAbsolute(200, function () {
            subscription1 = subject.subscribe(results1);
        });
        scheduler.scheduleAbsolute(300, function () {
            subscription2 = subject.subscribe(results2);
        });
        scheduler.scheduleAbsolute(400, function () {
            subscription3 = subject.subscribe(results3);
        });
        scheduler.scheduleAbsolute(500, function () {
            subscription1.dispose();
        });
        scheduler.scheduleAbsolute(600, function () {
            subject.dispose();
        });
        scheduler.scheduleAbsolute(700, function () {
            subscription2.dispose();
        });
        scheduler.scheduleAbsolute(800, function () {
            subscription3.dispose();
        });
        scheduler.scheduleAbsolute(150, function () {
            subject.onNext(1);
        });
        scheduler.scheduleAbsolute(250, function () {
            subject.onNext(2);
        });
        scheduler.scheduleAbsolute(350, function () {
            subject.onNext(3);
        });
        scheduler.scheduleAbsolute(450, function () {
            subject.onNext(4);
        });
        scheduler.scheduleAbsolute(550, function () {
            subject.onNext(5);
        });
        scheduler.scheduleAbsolute(650, function () {
            raises(function () {
                subject.onNext(6);
            });
        });
        scheduler.scheduleAbsolute(750, function () {
            raises(function () {
                subject.onCompleted();
            });
        });
        scheduler.scheduleAbsolute(850, function () {
            raises(function () {
                subject.onError('ex');
            });
        });
        scheduler.scheduleAbsolute(950, function () {
            raises(function () {
                subject.subscribe();
            });
        });
        scheduler.start();
        results1.messages.assertEqual();
        results2.messages.assertEqual();
        results3.messages.assertEqual();
    };

