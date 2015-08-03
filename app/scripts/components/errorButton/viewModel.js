define(['knockout', 'text!./template.html'], function(ko, template) {
  'use strict';

  function ViewModel(params) {
    this.action = params.action;
  }

  ViewModel.prototype.showError = function() {
    window.alert(this.action.rejectedWith().message);
  }

  ko.components.register('error-button', {
    viewModel: ViewModel,
    template: template
  });

});
