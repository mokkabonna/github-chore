define(['knockout', 'text!./template.html'],function(ko, template){
  'use strict';

  ko.components.register('spinner',{
    template: template
  });

});
