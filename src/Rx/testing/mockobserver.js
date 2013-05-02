goog.provide("Rx.testing.MockObserver")
goog.require("Rx.Observer")


        /*
         * @constructor
         * @prviate
         */
        function MockObserver(scheduler) {
            _super.call(this);
            this.scheduler = scheduler;
            this.messages = [];
        }
goog.inherits(Rx.testing.MockObserver, Observer);


        /*
         * @memberOf MockObserverPrototype#
         * @prviate
         */
        MockObserverPrototype.onNext = function (value) {
            this.messages.push(new Recorded(this.scheduler.clock, Notification.createOnNext(value)));
        };

        /*
         * @memberOf MockObserverPrototype#
         * @prviate
         */
        MockObserverPrototype.onError = function (exception) {
            this.messages.push(new Recorded(this.scheduler.clock, Notification.createOnError(exception)));
        };

        /*
         * @memberOf MockObserverPrototype#
         * @prviate
         */
        MockObserverPrototype.onCompleted = function () {
            this.messages.push(new Recorded(this.scheduler.clock, Notification.createOnCompleted()));
        };

