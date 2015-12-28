jsHyphen.factory('Users', ['Hyphen', '$timeout', '$q', function (Hyphen, $timeout, $q) {

    var User = function (data) {
        //console.log(data);
    }

    User.key = "_id";

    User.prototype.getFullName = function () {
        return this.user_first_name + " " + this.user_last_name;
    }

    User.indexes = [{name: "Id", key: "_id"}, {name: "FirstName", key: "user_first_name"}];

    User.syncNew = function (data) {
        var proms = [];

        _(data).each(function (record) {
            var id = record._id
            delete record._id;
            Hyphen.Users.api.registerUser.data = record;
            var p = Hyphen.Users.api.registerUser.call();
            p.then(function (data) {
                var user = Hyphen.Users.dataModel.getById(id);
                if (user)
                    Hyphen.Users.dataModel.remove(user);
            });
            proms.push(p);
        });

        return $q.all(proms);
    };

    User.syncUpdated = function (data) {
        var proms = [];

        _(data).each(function (record) {
            Hyphen.Users.api.update.data = record;
            var p = Hyphen.Users.api.update.call();
            proms.push(p);
        });

        return $q.all(proms);
    };

    User.syncDeleted = function (data) {
        var proms = [];
        _(data).each(function (record) {
            var p = Hyphen.Users.api.delete.call(record._id);
            proms.push(p);
        });

        return $q.all(proms);
    };

    User.getAllOffline = function (params, data, dataModel) {
        console.log("this is handler for get users offline");
        console.log(params);
    }

    User.registerUserOffline = function (params, data, dataModel) {
        data._id = Math.random() * 10000;
        dataModel.Users.add(data);
    }

    User.deleteOffline = function (params, data, dataModel) {
        var user = dataModel.Users.getById(params);
        if (user)
            dataModel.Users.remove(user);
    }

    User.updateOffline = function (params, data, dataModel) {
        dataModel.Users.add(data);
    }

    return User;

}]);

jsHyphen.factory('Projects', ['$timeout', '$q', function ($timeout, $q) {
    var Project = function () {

    }

    Project.key = "_id";

    Project.indexes = [{name: "Id", key: "_id"}];

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