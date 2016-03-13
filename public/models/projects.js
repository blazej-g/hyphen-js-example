jsHyphen.factory('Projects', ['$timeout', '$q', 'Hyphen', function ($timeout, $q, Hyphen) {
    var Project = function () {

    }

    Project.indexes =
    {
        _id : "id"
    }

    Project.createOffline = function (params, data, dataModel) {
        data._id = Math.random() * 10000;
        dataModel.Projects.add(data);
    }

    Project.new = function (record) {
        delete record._id;
        Hyphen.Projects.api.create.data = record;
        return Hyphen.Projects.api.create.call()
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