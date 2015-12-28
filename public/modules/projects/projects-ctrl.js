/**
 * Created by blazejgrzelinski on 22/04/15.
 */
timeminder.controller('ProjectsCtrl', ['$scope', 'Hyphen', function ($scope, Hyphen) {
    $scope.Hyphen = Hyphen;

    $scope.removeAllProjects = function(){
        Hyphen.Projects.api.removeAll.call();
    }
    $scope.createProject = function(){
        var proj = {
            name: "Test proj",
            type: "small",
            user_last_name: "grzelinski",
            user_password: "blazej123"
        }
        Hyphen.Projects.api.create.data=proj;
        Hyphen.Projects.api.create.call();
    }
}]);