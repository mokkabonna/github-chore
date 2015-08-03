require.config({
  paths: {
    bower_components: '../bower_components',
    promise: '../bower_components/bluebird/js/browser/bluebird',
    jquery: '../bower_components/jquery/dist/jquery',
    semver: '../bower_components/semver/semver.browser',
    knockout: '../bower_components/knockout/dist/knockout',
    text: '../bower_components/requirejs-text/text',
    mout: '../bower_components/mout/src',
    octokat: '../bower_components/octokat/dist/octokat'
  },
  packages: [{
    name: 'lodash',
    location: '../bower_components/lodash-amd/modern'
  }, {
    name: 'mout',
    location: '../bower_components/mout/src'
  }],
  map: {
    '*': {
      knockout: '../bower_components/knockout/dist/knockout',
      ko: '../bower_components/knockout/dist/knockout'
    }
  }
});

if (!window.requireTestMode) {
  require(['main'], function() {});
}
