jsHyphen.factory('Users', ['Hyphen', '$timeout', '$q', function (Hyphen, $timeout, $q) {

    var User = function (data) {
        //console.log(data);
    }

    User.prototype.getFullName = function () {
        return this.user_first_name + " " + this.user_last_name;
    }

    User.indexes =
    {
        _id: "Id",
        user_first_name: "FirstName"
    }

    User.groups =
    {
        user_first_name: "FirstName"
    }

    User.sort =
    {
        asc : "created_at"
    }

    User.new = function (record) {
        delete record._id;
        Hyphen.Users.api.create.data = record;
        return Hyphen.Users.api.create.call()
    }

    User.update = function (record) {
        Hyphen.Users.api.update.data = record;
        return Hyphen.Users.api.update.call();
    }

    User.delete = function (record) {
        return Hyphen.Users.api.delete.call({id: record._id});
    }

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

    User.removeAllOffline = function (params, data, dataModel) {
        _(dataModel.Users.getData()).each(function (record) {
            dataModel.Users.remove(record);
        });
    }

    return User;

}]);


