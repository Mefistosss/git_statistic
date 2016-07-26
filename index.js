const path = require('path');
const fs = require('fs');
const Git = require('./lib/git');


module.exports = function(_path /* absolute path to repository */, callback) {
    fs.stat(_path, function(statError, statResult) {
        if (statError) { callback(statError); }
        else {
            if (statResult.isDirectory()) {
                fs.stat(path.join(_path, '.git'), function(gitStatError, gitStatResult) {
                    if (gitStatError) { callback(gitStatError); }
                    else {
                        if (gitStatResult.isFile() || gitStatResult.isDirectory()) {
                            callback(null, new Git(_path));
                        } else {
                            callback(_path + ' is not repository.');
                        }
                    }
                });
            } else {
                callback(_path + ' is not directory.');
            }
        }
    });
};
