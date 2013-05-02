goog.provide("Rx.testing.MockObserver")
goog.require("Rx.Observer")


        /*
         * @constructor
         * @prviate
         */
         Rx.testing.MockObserver=function(scheduler) {
            goog.base(this);
            this.scheduler = scheduler;
            this.messages = [];
        }
goog.inherits(Rx.testing.MockObserver, Observer);



        /*
         * @memberOf MockObserverPrototype#
         * @prviate
         */
        Rx.testing.MockObserver.prototype.onNext = function (value) {
            this.messages.push(new Recorded(this.scheduler.clock, Notification.createOnNext(value)));
        };

        /*
         * @memberOf MockObserverPrototype#
         * @prviate
         */
        Rx.testing.MockObserver.prototype.onError = function (exception) {
            this.messages.push(new Recorded(this.scheduler.clock, Notification.createOnError(exception)));
        };

        /*
         * @memberOf MockObserverPrototype#
         * @prviate
         */
        Rx.testing.MockObserver.prototype.onCompleted = function () {
            this.messages.push(new Recorded(this.scheduler.clock, Notification.createOnCompleted()));
        };
