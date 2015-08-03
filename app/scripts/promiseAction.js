define(['knockout', 'promise'], function(ko, Promise) {
  'use strict';

  function PromiseAction(action) {
    var activePromise = ko.observable();
    var currentState = ko.observable({
      isPending: false,
      isResolved: false,
      isRejected: false,
      resolvedWith: undefined,
      rejectedWith: undefined
    });
    // var isPending = ko.observable(false);
    // var isResolved = ko.observable(false);
    // var isRejected = ko.observable(false);
    // var resolvedWith = ko.observable();
    // var rejectedWith = ko.observable();

    function wrapper() {
      /*jshint validthis:true */
      currentState({
        isPending: true,
        isResolved: false,
        isRejected: false,
        resolvedWith: undefined,
        rejectedWith: undefined
      });


      var result;
      var promise;

      try {
        result = action.apply(this, arguments);

        if (result && result.then) {

          promise = new Promise(function(resolve, reject) {

            result.then(function(data) {
              currentState({
                isPending: false,
                isResolved: true,
                isRejected: false,
                resolvedWith: data,
                rejectedWith: undefined
              });

              resolve(data);
            }, function(err) {
              currentState({
                isPending: false,
                isResolved: false,
                isRejected: true,
                resolvedWith: undefined,
                rejectedWith: err
              });

              reject(err);
            });

          });

          promise.catch(function(err) {
            //If the view claim they will handle the error then swallow it, if not rethrow it
            if (!wrapper.handleErrorInView()) {
              throw err;
            }
          });

          activePromise(promise);

          return promise;
        } else {
          currentState({
            isPending: false,
            isResolved: true,
            isRejected: false,
            resolvedWith: result,
            rejectedWith: undefined
          });

          return result;
        }

      } catch (e) {
        currentState({
          isPending: false,
          isResolved: false,
          isRejected: true,
          resolvedWith: undefined,
          rejectedWith: e
        });

        if (!wrapper.handleErrorInView()) {
          throw e;
        }
      }

    }

    wrapper.activePromise = ko.pureComputed(activePromise);
    wrapper.isPending = ko.pureComputed(function() {
      return currentState().isPending;
    });

    wrapper.isResolved = ko.pureComputed(function() {
      return currentState().isResolved;
    });

    wrapper.isRejected = ko.pureComputed(function() {
      return currentState().isRejected;
    });

    wrapper.resolvedWith = ko.pureComputed(function() {
      return currentState().resolvedWith;
    });

    wrapper.rejectedWith = ko.pureComputed(function() {
      return currentState().rejectedWith;
    });

    /**
     * Set this to true to take responsibility for errors in the view.
     *
     * If this is set to false any errors will be passed on to any global unhandled error handler.
     *
     * See the specifics of your promise libary for the behaviour of this.
     */
    wrapper.handleErrorInView = ko.observable(false);

    /**
     * Returns true if resolved value is:
     * An array with length > 0
     * An object with own properties
     * All other truthy values, >=1, true, 'any non 0 length string'
     *
     * All other values are false
     */
    wrapper.hasResult = ko.pureComputed(function() {
      var value = currentState().resolvedWith;
      var hasSomething = value ? true : false;

      if (Array.isArray(value)) {
        return value.length > 0;
      } else if (typeof value === 'object' && value !== null) {
        return Object.keys(value).length > 0;
      } else {
        return hasSomething;
      }

    });

    return wrapper;
  }

  return PromiseAction;
});
