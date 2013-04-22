goog.provide('Rx.Observer_test');
goog.require('Rx.Observer');
goog.require("Rx.Notification")
goog.require("Rx.AnonymousSubject")
goog.require('goog.testing.jsunit');

var Observer, createOnNext, createOnError, createOnCompleted;

var setUpPage = function() {
	Observer = Rx.Observer;
	createOnNext = Rx.Notification.createOnNext
	createOnError = Rx.Notification.createOnError
	createOnCompleted = Rx.Notification.createOnCompleted;
};

var testToObserver_NotificationOnNext = function() {
	var i = 0;
	var next = function(n) {
		assertEquals(i++ , 0);
		assertEquals(n.kind , 'N');
		assertEquals(n.value , 42);
		assertEquals(n.exception , undefined);
		assertTrue(n.hasValue);
	};
	Observer.fromNotifier(next).onNext(42);
}

var testToObserver_NotificationOnError= function() {
	var ex = 'ex';
	var i = 0;
	var next = function(n) {
		assertEquals(i++, 0);
		assertEquals(n.kind, 'E');
		assertEquals(n.exception, ex);
		assertTrue(!n.hasValue);
	};
	Observer.fromNotifier(next).onError(ex);
};

var testToObserver_NotificationOnCompleted= function() {
	var i = 0;
	var next = function(n) {
		assertEquals(i++, 0);
		assertEquals(n.kind, 'C');
		assertTrue(!n.hasValue);
	};
	Observer.fromNotifier(next).onCompleted();
};

var testToNotifier_Forwards= function() {
	var obsn = new MyObserver();
	obsn.toNotifier()(createOnNext(42));
	assertEquals(obsn.hasOnNext, 42);

	var ex = 'ex';
	var obse = new MyObserver();
	obse.toNotifier()(createOnError(ex));
	assertEquals(ex, obse.hasOnError);

	obsc = new MyObserver();
	obsc.toNotifier()(createOnCompleted());
	assertTrue(obsc.hasOnCompleted);
};

var testCreate_OnNext= function() {
	var next, res;
	next = false;
	res = Observer.create(function(x) {
		assertEquals(42, x);
		next = true;
	});
	res.onNext(42);
	assertTrue(next);
	return res.onCompleted();
};

var testCreate_OnNext_HasError= function() {
	var e_;
	var ex = 'ex';
	var next = false;
	var res = Observer.create(function(x) {
		assertEquals(42, x);
		next = true;
	});

	res.onNext(42);
	assertTrue(next);

	try {
		res.onError(ex);
		assertTrue(false);
	} catch (e) {
		e_ = e;
	}
	assertEquals(ex, e_);
};

var testCreate_OnNextOnCompleted= function() {
	var next = false;
	var completed = false;
	var res = Observer.create(function(x) {
		assertEquals(42, x);
		return next = true;
	}, undefined, function() {
		return completed = true;
	});

	res.onNext(42);

	assertTrue(next);
	assertTrue(!completed);

	res.onCompleted();

	assertTrue(completed);
};

var testCreate_OnNextOnCompleted_HasError= function() {
	var e_;
	var ex = 'ex';
	var next = false;
	var completed = false;
	var res = Observer.create(function(x) {
		assertEquals(42, x);
		next = true;
	}, undefined, function() {
		completed = true;
	});
	res.onNext(42);
	assertTrue(next);
	assertTrue(!completed);
	try {
		res.onError(ex);
		assertTrue(false);
	} catch (e) {
		e_ = e;
	}
	assertEquals(ex, e_);
	assertTrue(!completed);
};

var testCreate_OnNextOnError= function() {
	var ex = 'ex';
	var next = true;
	var error = false;
	var res = Observer.create(function(x) {
		assertEquals(42, x);
		next = true;
	}, function(e) {
		assertEquals(ex, e);
		error = true;
	});

	res.onNext(42);

	assertTrue(next);
	assertTrue(!error);

	res.onError(ex);
	assertTrue(error);
};

var testCreate_OnNextOnError_HitCompleted= function() {
	var ex = 'ex';
	var next = true;
	var error = false;
	var res = Observer.create(function(x) {
		assertEquals(42, x);
		next = true;
	}, function(e) {
		assertEquals(ex, e);
		error = true;
	});

	res.onNext(42);
	assertTrue(next);
	assertTrue(!error);

	res.onCompleted();

	assertTrue(!error);
};

var testCreate_OnNextOnErrorOnCompleted1= function() {
	var ex = 'ex';
	var next = true;
	var error = false;
	var completed = false;
	var res = Observer.create(function(x) {
		assertEquals(42, x);
		next = true;
	}, function(e) {
		assertEquals(ex, e);
		error = true;
	}, function() {
		completed = true;
	});

	res.onNext(42);

	assertTrue(next);
	assertTrue(!error);
	assertTrue(!completed);

	res.onCompleted();

	assertTrue(completed);
	assertTrue(!error);
};

var testCreate_OnNextOnErrorOnCompleted2= function() {
	var ex = 'ex';
	var next = true;
	var error = false;
	var completed = false;
	var res = Observer.create(function(x) {
		assertEquals(42, x);
		next = true;
	}, function(e) {
		assertEquals(ex, e);
		error = true;
	}, function() {
		completed = true;
	});

	res.onNext(42);

	assertTrue(next);
	assertTrue(!error);
	assertTrue(!completed);

	res.onError(ex);

	assertTrue(!completed);
	assertTrue(error);
};

var MyObserver = (function() {
	function onNext(value) {
		this.hasOnNext = value;
	}

	function onError(err) {
		this.hasOnError = err;
	}

	function onCompleted() {
		this.hasOnCompleted = true;
	}

	return function() {
		var obs = new Observer();
		obs.onNext = onNext.bind(obs);
		obs.onError = onError.bind(obs);
		obs.onCompleted = onCompleted.bind(obs);

		return obs;
	};
}());

var deepequals = function(x)
{
	  var p;
	  for(p in this) {
	      if(typeof(x[p])=='undefined') {return false;}
	  }

	  for(p in this) {
	      if (this[p]) {
	          switch(typeof(this[p])) {
	              case 'object':
	                  if (!this[p].equals(x[p])) { return false; } break;
	              case 'function':
	                  if (typeof(x[p])=='undefined' ||
	                      (p != 'equals' && this[p].toString() != x[p].toString()))
	                      return false;
	                  break;
	              default:
	                  if (this[p] != x[p]) { return false; }
	          }
	      } else {
	          if (x[p])
	              return false;
	      }
	  }

	  for(p in x) {
	      if(typeof(this[p])=='undefined') {return false;}
	  }

	  return true;
	}

var testAsObserver_Hides= function() {
	var obs, res;
	obs = new MyObserver();
	res = obs.asObserver();
	assertFalse(deepequals(obs, res));
};

var testAsObserver_Forwards= function() {
	var obsn = new MyObserver();
	obsn.asObserver().onNext(42);
	assertEquals(obsn.hasOnNext, 42);

	var ex = 'ex';
	obse = new MyObserver();
	obse.asObserver().onError(ex);
	assertEquals(obse.hasOnError, ex);

	var obsc = new MyObserver();
	obsc.asObserver().onCompleted();
	assertTrue(obsc.hasOnCompleted);
};

var testObserver_Checked_AlreadyTerminated_Completed= function() {
	var m = 0, n = 0;
	var o = Observer.create(function() {
		m++;
	}, function() {
		assertTrue(false);
	}, function() {
		n++;
	}).checked();

	o.onNext(1);
	o.onNext(2);
	o.onCompleted();

	assertThrows(function() {
		o.onCompleted();
	});
	assertThrows(function() {
		on.onError(new Error('error'));
	});
	assertEquals(2, m);
	assertEquals(1, n);
};

var testObserver_Checked_AlreadyTerminated_Error= function() {
	var m = 0, n = 0;
	var o = Observer.create(function() {
		m++;
	}, function() {
		n++;
	}, function() {
		assertTrue(false);
	}).checked();

	o.onNext(1);
	o.onNext(2);
	o.onError(new Error('error'));

	assertThrows(function() {
		o.onCompleted();
	});
	assertThrows(function() {
		o.onError(new Error('error'));
	});

	assertEquals(2, m);
	assertEquals(1, n);
};

var testObserver_Checked_Reentrant_Next= function() {
	var n = 0;
	var o;
	o = Observer.create(function() {
		n++;
		assertThrows(function() {
			o.onNext(9);
		});
		assertThrows(function() {
			o.onError(new Error('error'));
		});
		assertThrows(function() {
			o.onCompleted();
		});
	}, function() {
		assertTrue(false);
	}, function() {
		assertTrue(false);
	}).checked();

	o.onNext(1);
	assertEquals(1, n);
};

var testObserver_Checked_Reentrant_Error= function() {
	var n = 0;
	var o;
	o = Observer.create(function() {
		assertTrue(false);
	}, function() {
		n++;
		assertThrows(function() {
			o.onNext(9);
		});
		assertThrows(function() {
			o.onError(new Error('error'));
		});
		assertThrows(function() {
			o.onCompleted();
		});
	}, function() {
		assertTrue(false);
	}).checked();

	o.onError(new Error('error'));
	assertEquals(1, n);

};

var testObserver_Checked_Reentrant_Completed= function() {
	var n = 0;
	var o;
	o = Observer.create(function() {
		assertTrue(false);
	}, function() {
		assertTrue(false);
	}, function() {
		n++;
		assertThrows(function() {
			o.onNext(9);
		});
		assertThrows(function() {
			o.onError(new Error('error'));
		});
		assertThrows(function() {
			o.onCompleted();
		});
	}).checked();

	o.onCompleted();
	assertEquals(1, n);
};
