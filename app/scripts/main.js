define([
  'knockout',
  'octokat',
  'promise',
  'lodash',
  'semver',
  'promiseAction',
  'components/spinner/viewModel',
  'components/observableText/viewModel',
  'components/errorButton/viewModel',
], function(ko, Octokat, Promise, _, semver, promiseAction, spinnner, obsText) {
  'use strict';

  var octo = new Octokat({
  });

  ko.subscribable.fn.toggle = function() {
    this(!this());
  };

  ko.subscribable.fn.inverted = function() {
    return ko.pureComputed(function() {
      return !this();
    }, this);
  };

  var viewModel = {
    initialized: ko.observable(false),
    repoFilter: ko.observable(),
    availableRepos: ko.observableArray(),
    file: ko.observable('README.md'),
    repoFileContent: ko.observableArray()
  };

  viewModel.selectAllInFilter = function() {
    viewModel.filteredAvailableRepos().forEach(function(repo) {
      repo.selected(true);
    });
  };

  viewModel.selectedRepos = ko.computed(function() {
    return viewModel.availableRepos().filter(function(repo) {
      return repo.selected();
    });
  });

  function forksFilter(repo) {
    return viewModel.showForks() ? true : repo.fork === false;
  }

  function searchFilter(repo) {
    var nameFilter = viewModel.repoFilter();
    if (!nameFilter) {
      return true;
    } else {
      var reg = new RegExp(viewModel.repoFilter(), 'igm');
      var fields = ['fullName', 'description'];
      return _.some(fields, function(path) {
        return reg.test(_.get(repo, path));
      });
    }
  }

  viewModel.showForks = ko.observable(false);

  viewModel.filters = ko.observableArray([searchFilter, forksFilter]);

  viewModel.filteredAvailableRepos = ko.computed(function() {
    return _.intersection.apply(null, viewModel.filters().map(function(filter) {
      return viewModel.availableRepos().filter(filter);
    }));
  });

  viewModel.owners = ko.computed(function() {
    return _.uniq(viewModel.availableRepos().map(function(repo) {
      return repo.owner;
    }));
  });

  viewModel.commonBranch = {
    newBranchName: ko.observable(),
    selectedBranch: ko.observable('master'),
    allBranches: ko.computed(function() {
      return _.uniq(_.flatten(viewModel.selectedRepos().map(function(repo) {
        return repo.branches();
      })));
    }),
    selectSameBranch: function() {
      viewModel.selectedRepos().forEach(function(repo) {
        repo.selectedBranch(viewModel.commonBranch.selectedBranch());
      });
    },
    deleteAllSelectedBranches: function() {
      if (confirm()) {
        viewModel.selectedRepos().forEach(function(repo) {
          repo.deleteSelectedBranch(true);
        });
      }
    }
  };

  function getAllPages(results) {
    if (_.isFunction(results.nextPage)) {
      return results.nextPage().then(function(nextPage) {
        return getAllPages(nextPage).then(function(allPages) {
          return results.concat(allPages);
        });
      });
    } else {
      return new Promise(function(resolve) {
        resolve(results);
      });
    }
  }

  function insertPage(repos) {
    var existing = viewModel.availableRepos();
    var newRepos = repos.map(function(repo) {
      return new Repo(repo);
    });

    viewModel.availableRepos(existing.concat(newRepos));

    if (repos.nextPage) {
      repos.nextPage().then(insertPage);
    }
  }

  //get all repos user has access to
  octo.user.repos.fetch().then(insertPage);

  window.d = viewModel;

  ko.subscribable.fn.promiseAction = function(action) {
    var self = this;
    this.fetch = promiseAction(action);

    this.fetch.isResolved.subscribe(function(isResolved) {
      if (isResolved) {
        self(self.fetch.resolvedWith());
      }
    });

    return this;
  };

  function Repo(info) {
    var self = this;

    _.assign(this, info);

    this.repository = octo.repos(this.owner.login, this.name);

    this.selected = ko.observable(false);
    this.selectedBranch = ko.observable();

    this.openIssues = ko.observableArray().promiseAction(function() {
      return self.issues.fetch().then(function(issues) {
        return issues.filter(function(issue) {
          return !issue.pullRequest; //remove all pull requests
        });
      });
    });

    this.openPulls = ko.observableArray().promiseAction(function() {
      return self.pulls.fetch();
    });

    this.branches = ko.observableArray().promiseAction(function() {
      return self.repository.branches.fetch().then(function(branches) {
        return _.map(branches, 'name');
      });
    });

    this.latestSemverTag = ko.observable().promiseAction(function() {
      return self.tags.fetch().then(function(tags) {
        return _.filter(_.map(tags, 'name'), semver.valid)[0];
      });
    });

    this.selected.subscribe(function(isSelected) {
      if (isSelected) {
        self.branches.fetch();
      }
    });
  }

  Repo.prototype.deleteSelectedBranch = function() {
    if (branchName === 'master') return;
    if (this.owner.login === 'SublimeLinter') return;

    if (confirm('This is not recoverable! Are you sure?')) {

      var self = this;
      var branchName = this.selectedBranch();

      return this.repository.git.refs('heads/' + branchName).remove().then(function(result) {
        self.branches.remove(branchName);
        return result;
      });
    }
  };

  Repo.prototype.latestShaOnBranch = function() {
    return this.repository.git.refs('heads/' + this.selectedBranch()).fetch().then(function(info) {
      return info.object.sha;
    });
  };

  Repo.prototype.createBranchFromSha = function(branchName, sha) {
    var self = this;
    return this.repository.git.refs.create({
      ref: 'refs/heads/' + branchName,
      sha: sha
    }).then(function(ref) {
      self.branches.push(branchName);
      self.selectedBranch(branchName);
      return ref;
    });
  };

  // viewModel.repos.push(new Repo({
  //   owner: 'mokkabonna',
  //   repo: 'knockout.bindingHandlers.hidden'
  // }));

  // viewModel.repos.push(new Repo({
  //   owner: 'mokkabonna',
  //   repo: 'knockout.bindingHandlers.number'
  // }));

  function cloneRepoInfo(repoInfo, extra) {
    return _.assign(_.cloneDeep(repoInfo), extra);
  }

  viewModel.commonBranch.openIssues = ko.observableArray().promiseAction(function() {
    return Promise.all(viewModel.selectedRepos().map(function(repo) {
      return repo.openIssues.fetch();
    })).then(_.flatten);
  });

  viewModel.commonBranch.openPulls = ko.observableArray().promiseAction(function() {
    return Promise.all(viewModel.selectedRepos().map(function(repo) {
      return repo.openPulls.fetch();
    })).then(_.flatten);
  });

  viewModel.commonBranch.branches = ko.observableArray().promiseAction(function() {
    return Promise.all(viewModel.selectedRepos().map(function(repo) {
      return repo.branches.fetch();
    })).then(_.flatten).then(_.uniq);
  });

  viewModel.commonBranch.latestSemverTag = ko.observableArray().promiseAction(function() {
    return Promise.all(viewModel.selectedRepos().map(function(repo) {
      return repo.latestSemverTag.fetch();
    })).then(_.flatten);
  });

  viewModel.commonBranch.createBranch = function() {
    var newBranches = viewModel.selectedRepos().map(function(repo) {
      return repo.latestShaOnBranch().then(function(sha) {
        return repo.createBranchFromSha(viewModel.commonBranch.newBranchName(), sha);
      });
    });

    Promise.all(newBranches).then(function() {
      console.log(JSON.stringify(arguments, null, 2));
    }).catch(function(e) {
      console.log('failed', e);
    });
  };

  viewModel.getFileContent = function() {
    var allFiles = viewModel.selectedRepos().map(function(repo) {
      return repo.repository.contents('bower.json').fetch().then(function(content) {
        return cloneRepoInfo(repo, {
          content: content
        });
      });
    });

    Promise.all(allFiles).then(function(results) {
      viewModel.repoFileContent(results);
    });

  };

  ko.applyBindings(viewModel);
  viewModel.initialized(true);

});
