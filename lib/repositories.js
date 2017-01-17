const path = require('path');
const fs = require('fs');
const when = require('when');
const sequence = require('when/sequence');

function extend(target, source) {
    for (var i = 0; i < source.length; i++) {
        target.push(source[i]);
    }
    return target;
}

function isRepository(_path) {
    return path.basename(_path) === '.git';
}

function getRepositories(_path, callback) {
    var result = [];
    fs.stat(_path, function(statError, statResult) {
        if (statError) {
            callback(null, []); // TODO
        }
        else {
            if (statResult.isFile() || statResult.isDirectory()) {
                if (isRepository(_path)) {
                    callback(null, [path.dirname(_path)]);
                } else {
                    if (statResult.isDirectory()) {
                        fs.readdir(_path, function(err, files) {
                            if (err) { callback(err); }
                            else {
                                if(files.length) {
                                    var promises = [];
                                    files.forEach(function(file) {
                                        promises.push(function() {
                                            var defer = when.defer();
                                            getRepositories(path.join(_path, file), function(_err, _result) {
                                                if (_err) { return defer.reject(_err); }
                                                else {
                                                    result = extend(result, _result);
                                                    return defer.resolve(true);
                                                }
                                            });
                                            return defer.promise;
                                        });
                                    });
                                    sequence(promises)
                                    .then(function(res) {
                                        callback(null, result);
                                    }, function(_err) {
                                        callback(_err);
                                    });
                                } else { callback(null, []); }
                            }
                        })
                    } else { callback(null, []); }
                }
            } else { callback(null, []); }
        }
    });
}

module.exports = getRepositories;
