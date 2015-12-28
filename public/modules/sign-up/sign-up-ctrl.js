/**
 * Created by blazejgrzelinski on 07/04/15.
 */

timeminder.controller('SignUpCtrl', ['$scope', 'Hyphen', '$state', function ($scope, Hyphen, $state) {
    var model = {};
    $scope.model = model;

    model.signUp = function () {
        Hyphen.Users.api.registerUser.data = model.user;
        var promise = Hyphen.Users.api.registerUser.call();
        promise.then(function () {

            $state.go("projects");
        });
    }
}])
