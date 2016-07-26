const util = require('util');
// const path = require('path');
// const fs = require('fs');
const when = require('when');
const sequence = require('when/sequence');
const exec = require('child_process').exec;

function lastItem(arr) {
    return arr[arr.length - 1];
}

function _exec(command, options, callback) {
    exec(command, options, function(error, stdout, stderr) {
        if (error && (!stdout || '' === stdout.trim())) {
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

Git.prototype = util._extend(Git.prototype, {
    getAuthors: function(callback) {
        var arr = [],
            command = "git log --format='%aN %ae' | sort -u";

        callback || (callback = function() {});

        _exec(command, this._config, function(error, result) {
            if (error) { callback(error); }
            else {
                result.split('\n').forEach(function(author) {
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

    getCommits: function(author, callback) {
        var command;
        callback || (callback = function() {});
        if (util.isString(author)) {
            var command = "git log --author='" + author + "' --format='%s-=|=-%ai'";
            _exec(command, this._config, function(error, result) {
                if (error) return callback(error);

                _arr = result.split('\n');

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

                callback(null, _arr);
            });
        } else {
            callback('author isn\'t string.');
        }
    },

    getAllCommits: function(callback) {
        var self = this, arr = [],
            promises = [];

        callback || (callback = function() {});

        this.getAuthors(function(error, result) {
            var promises = [];
            if (error) return callback(error);
            result.forEach(function(author) {
                promises.push(function() {
                    var defer = when.defer();

                    self.getCommits(author.email, function(err, res) {
                        if (err) return defer.reject(err);
                        arr.push({
                            name: author.name,
                            email: author.email,
                            commits: res
                        });
                        defer.resolve(true);
                    });

                    return defer.promise;
                });
            });

            sequence(promises).then(function(res) {
                callback(null, arr);
            }, function(err) {
                callback(err);
            });

        });
    },

    getShortstat: function(author, callback) {

    },

    getAllShortstats: function(callback) {

    }
});

// git log --author="sergey@luckyteam.co.uk" --format='%ae %s'
// git diff --author="Sergey Ponomarenko" --shortstat "@{1 day ago}"
// git log master --format="%ad"
// r.getAuthors

module.exports = Git;
