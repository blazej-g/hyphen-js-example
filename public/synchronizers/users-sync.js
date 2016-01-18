jsHyphen.factory('UsersSync', ['Hyphen', '$timeout', '$q', function (Hyphen, $timeout, $q) {
    var UsersSync = {};
    UsersSync.new = function (record) {
        delete record._id;
        Hyphen.Users.api.create.data = record;
        return Hyphen.Users.api.create.call()
    }

    UsersSync.update = function (record) {
        Hyphen.Users.api.update.data = record;
        return Hyphen.Users.api.update.call();
    }

    UsersSync.delete = function (record) {
        return Hyphen.Users.api.delete.call(record._id);

    }

    //UsersSync.syncStore = function (store) {

    //}

    return UsersSync;

}]);


