const Git = require('./lib/git');
const getRepositories = require('./lib/repositories');

module.exports = function(_path /* absolute path to repository */, callback) {
    getRepositories(_path, function(err, repositories) {
        var result = [];
        if (err) {
            callback(err);
        } else {
            repositories.forEach(function(r) {
                result.push(new Git(r));
            });
            callback(null, result);
        }
    });
};
