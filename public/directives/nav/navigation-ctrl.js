timeminder.directive('navigation', ['PlannerAuthorization', '$location', function(PlannerAuthorization, $location) {
    return {
        restrict: 'E',
        //require: '^ngModel',
        scope: {
            //ngModel: '='
        },
        templateUrl: 'directives/nav/navigation-view.html',
        link: function(scope, iElement, iAttrs) {
            scope.PlannerAuthorization= PlannerAuthorization;


        },
        controller: ['$scope', '$element', function ($scope, $element) {
            var model= null;
            $scope.model = model;

            $scope.SignOut = function(){
                $scope.PlannerAuthorization.SignOut();
                $location.path('/sign_in');
            }
        }],
    }
}]);