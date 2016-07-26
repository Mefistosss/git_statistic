const util = require('util');
// const path = require('path');
// const fs = require('fs');
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
    getAutors: function(callback) {
        var arr = [],
            command = "git log --format='%aN %ae' | sort -u";
        _exec(command, this._config, function(error, result) {
            if (error) { callback(error); }
            else {
                result.split('\n').forEach(function(autor) {
                    var name, email;
                    if (autor.trim() !== '') {
                        name = /(.+) +\S+@\S+/.exec(autor);
                        email = /(\S+@\S+)/.exec(autor);

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

    getShortstat: function(user, callback) {

    }
});

// git diff --author="Alex Krasnov" --shortstat "@{1 day ago}"
// git log master --format="%ad"


module.exports = Git;
