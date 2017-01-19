const util = require('util');
const when = require('when');
const extend  = require('extend');
const sequence = require('when/sequence');
const exec = require('child_process').exec;
const unique = require("array-unique").immutable;

function lastItem(arr) {
    return arr[arr.length - 1];
}

function getValue(value) {
    var result = null;
    if (value && util.isString(value) && value.trim() !== '') {
        result = value;
    }
    return result;
}

function getSince(value) {
    var since = getValue(value);
    since = since ? ('--since="' + since + '"') : '';
    return since;
}

function getUntil(value) {
    var until = getValue(value);
    until = until ? ('--until="' + until + '" ') : '';
    return until;
}

function sortArr(arr) {
    var result = [];
    arr.forEach(function(value) {
        if (/file changed/.test(value)) {
            result.push(value);
        }
    });
    return result;
}

function getNumber(str) {
    var result = 0;

    if(str) {
        result = parseInt(str.trim());
        if(isNaN(result)) {
            result = 0;
        }
    }

    return result;
}

function getName(str) {
    str = str.replace(/[0-9]/g, '');
    str = str.replace(/\([+-]\)/g, '');
    return str.trim();
}

function getElements(str) {
    var result = {
        files_changed: 0,
        lines_inserted: 0,
        lines_deleted: 0
    };

    str = str.trim();
    if ('' === str) { return result; }

    str = str.split(',');
    str.forEach(function(value) {
        if ('' !== value.trim()) {
            var name = getName(value),
                n = getNumber(value);

            switch (name) {
                case 'file changed':
                    result.files_changed = n;
                    break;
                case 'insertions':
                    result.lines_inserted = n;
                    break;
                case 'deletions':
                    result.lines_deleted = n;
                    break;
            }
        }
    });

    return result;
}

function getValues(arr) {
    var result = {
        files_changed: 0,
        lines_inserted: 0,
        lines_deleted: 0
    };

    arr.forEach(function(value) {
        value = getElements(value);

        ['files_changed', 'lines_inserted', 'lines_deleted'].forEach(function(name) {
            result[name] += value[name];
        });
    });

    return result;
}

function _exec(command, options, callback) {
    exec(command, options, function(error, stdout, stderr) {
        // if (error && (!stdout || '' === stdout.trim())) {
        if (error) {
            callback(error);
        } else {
            callback(null, stdout);
        }
    });
}

function Git (p) {
    this._path = p;
    this._name = lastItem(p.split('/'));
    this._config = { cwd: this._path };
}

extend(Git.prototype, {
    _getAuthors: function(author, callback) {
        if (author && util.isString(author) && author.trim() !== '') {
            callback(null, [{email: author}]);
        } else {
            this.getAuthors(callback);
        }
    },
    getAuthors: function(callback) {
        var arr = [],
            command = "git log --format=\"%aN %ae\"";

        callback || (callback = function() {});

        _exec(command, this._config, function(error, result) {
            if (error) { callback(error); }
            else {
                unique(result.split('\n')).forEach(function(author) {
                    var name, email;
                    if (author.trim() !== '') {
                        name = /(.+) +\S+@\S+/.exec(author);
                        email = /(\S+@\S+)/.exec(author);

                        arr.push({
                            name: name[1] || null,
                            email: email[1] || null
                        });
                    }
                });
                callback(null, arr);
            }
        });
    },

    getBranches: function(callback) {
        var arr = [],
            command = "git branch -a",
            isExist = function(v) {
                for (var i = 0; i < arr.length; i++) {
                    if (arr[i] === v) {
                        return true;
                    }
                }
                return false;
            };

        callback || (callback = function() {});

        _exec(command, this._config, function(error, result) {
            if (error) { callback(error); }
            else {
                result.split('\n').forEach(function(branch) {
                    if (/^\*/.test(branch)) {
                        branch = branch.replace(/^\*/, '');
                    }

                    branch = branch.trim();

                    if(!/\/HEAD/.test(branch)) {
                        if(/^remote/.test(branch)) {
                            branch = branch.split('/');
                            branch = branch[branch.length - 1];
                        }

                        if ('' !== branch && !isExist(branch)) {
                            arr.push(branch);
                        }
                    }
                });
                callback(null, arr);
            }
        });
    },

    getCommits: function(options, callback) {
        var command, commits = [],
            self = this,
            since, until;

        if (!options || util.isFunction(options)) {
            if (!callback && util.isFunction(options)) {
                callback = options;
            }
            options = {};
        }

        since = getSince(options.since);
        until = getUntil(options.until);

        this._getAuthors(options.author, function(error, result) {
            var promises = [];
            if (error) return callback(error);

            result.forEach(function(author) {
                promises.push(function() {
                    var defer = when.defer(),
                        command = ("git log --author=\"" + author.email + "\" " + until + since + " --format=\"%s-=|=-%ai\"");

                    _exec(command, self._config, function(_error, _result) {
                        var _arr;
                        if (_error) return defer.reject(_error);

                        _arr = _result.split('\n');

                        if (_arr[_arr.length - 1].trim() === '') {
                            _arr.length--;
                        }

                        _arr = _arr.map(function(el) {
                            el = el.split('-=|=-');
                            return {
                                commit: el[0],
                                date: el[1]
                            }
                        });

                        commits.push({
                            name: author.name,
                            email: author.email,
                            commits: _arr
                        });

                        defer.resolve(true);
                    });

                    return defer.promise;
                });
            });

            sequence(promises).then(function(res) {
                callback(null, commits);
            }, function(err) {
                callback(err);
            });
        });
    },

    getShortstats: function(options, callback) {
        var command, shortstats = [],
            self = this,
            since, until;

        if (!options || util.isFunction(options)) {
            if (!callback && util.isFunction(options)) {
                callback = options;
            }
            options = {};
        }

        since = getSince(options.since);
        until = getUntil(options.until);

        this._getAuthors(options.author, function(error, result) {
            var promises = [];
            if (error) return callback(error);

            result.forEach(function(author) {
                promises.push(function() {
                    var defer = when.defer(),
                        command = 'git log --shortstat --author="' + author.email + '" ' + until + since;

                    _exec(command, self._config, function(_error, _result) {
                        if (_error) return defer.reject(_error);

                        var res = getValues(sortArr(_result.split('\n')));

                        res.name = author.name;
                        res.email = author.email;

                        shortstats.push(res);
                        defer.resolve(true);
                    });

                    return defer.promise;
                });
            });

            sequence(promises).then(function(res) {
                callback(null, shortstats);
            }, function(err) {
                callback(err);
            });
        });
    },

    exec: function(command, callback) {
        _exec(command, this._config, callback);
    }
});

module.exports = Git;
