/**
 * Created by blazejgrzelinski on 24/04/15.
 */
timeminder.service('PlannerAuthorization', [function () {

    var isAuthorized = false;

    this.authorize = function (val, token) {
        isAuthorized = val;
    };

    this.isAuthorized = function () {
        return isAuthorized;
    };

    this.SignOut = function () {
        isAuthorized = false;
    };

}]);