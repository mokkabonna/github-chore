define(['knockout', 'text!./template.html'], function(ko, template) {
  'use strict';


  ko.components.register('observable-text', {
    template: template
  });

});
