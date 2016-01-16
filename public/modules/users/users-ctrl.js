/**
 * Created by blazejgrzelinski on 07/04/15.
 */

timeminder.controller('UsersCtrl', ['$scope', '$rootScope', '$http', 'Hyphen', function ($scope, $rootScope, $http, Hyphen) {
    var model = {};
    $scope.model = model;
    $scope.Hyphen = Hyphen;
    $scope.model.editRowId = null;

    $scope.removeAll = function () {
        Hyphen.Users.api.removeAll.call();
    }
    $scope.loadUsers = function () {
        var model = Hyphen.Users.api.dataModel;
        Hyphen.Users.api.getAll.call();
        //Hyphen.api.Users.getAll.call();
        //$scope.data = Hyphen.dataModel.UsersDataModel.data;
    };

    $scope.getUserProjects = function () {
        Hyphen.Users.api.getUserProjects.call();
    };

    /*
     $scope.createUser = function () {
     var user = {
     user_email: "test@ww.pl",
     user_first_name: "blazej",
     user_last_name: "grzelinski",
     user_password: "blazej123"
     }
     user.company="genie";
     Hyphen.Users.api.create.call(user);
     }
     */

    $scope.creteNewUser = function (user) {
        if (user) {
            delete user._id;
            Hyphen.Users.api.registerUser.data = user;
            var p = Hyphen.Users.api.registerUser.call();
            p.then(function (data) {
                var dddd = "fd";
            }, function (reason) {
                var fdg = "dfd";
            })
        }
    }

    $scope.selectAll = function () {
        _(Hyphen.Users.dataModel.data).each(function (user) {
            user.checked = $scope.allUsersCheckbox;
        });
    }
    $scope.deleteUser = function (user) {
        _(Hyphen.Users.dataModel.data).each(function (user) {
            if (user.checked) {
                Hyphen.Users.api.delete.call(user._id);
            }
        });

        $scope.allUsersCheckbox = false;

    };

    $scope.beginUserEdit = function (user) {
        $scope.newUser = angular.copy(user);
        $scope.newUser.user_password = "";
        $scope.editUser = true;
    }

    $scope.updateUser = function (user) {
        Hyphen.Users.api.update.data = user;
        Hyphen.Users.api.update.call();
        $scope.editUser = false;
    }

    $scope.getById = function () {
        $scope.name = Hyphen.Users.dataModel.getById($scope.user._id).getFullName();
    }

    $scope.getUserById = function () {
        Hyphen.Users.api.getOne.call("564b8aa588d41a8b0b8c94d9");
    }

}]);
