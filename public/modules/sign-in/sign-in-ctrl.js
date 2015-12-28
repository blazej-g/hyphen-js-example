3/**
 * Created by blazejgrzelinski on 07/04/15.
 */

timeminder.controller('SignInCtrl', ['$scope', 'Hyphen', '$state', function ($scope,  Hyphen, $state) {
var model = {};
    $scope.model = model;
    model.signIn = function() {
        Hyphen.Users.api.signIn.data = model.user;
        var promise = Hyphen.Users.api.signIn.call();
        promise.then(function(result){
            sessionStorage.setItem("token", result.data.token);
            $state.go("projects");
        }, function(reason){
            console.log("not signed in");
        });

    }

    model.signUp = function(){

    }
}])
