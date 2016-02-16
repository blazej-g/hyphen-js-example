jsHyphen.factory('Projects', ['$timeout', '$q', function ($timeout, $q) {
    var Project = function () {

    }

    Project.indexes =
    {
        _id : "id"
    }

    Project.syncNew = function (data) {
        var def = $q.defer();
        $timeout(function () {
            def.resolve("data resolvedd");
        }, 100);

        return def.promise;
    }

    Project.syncUpdated = function (data) {
        var def = $q.defer();
        $timeout(function () {
            def.resolve("data resolvedd");
        }, 100);

        return def.promise;
    }

    Project.syncDeleted = function (data) {
        var def = $q.defer();
        $timeout(function () {
            def.resolve("data resolvedd");
        }, 100);

        return def.promise;
    }

    return Project;

}]);