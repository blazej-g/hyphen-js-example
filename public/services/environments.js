/**
 * Created by blazejgrzelinski on 16/04/15.
 */
timeminder.service('Environments', ['$location', function ($location) {
    var envs = [
        {
            name: "localhost",
            url: "localhost",
            api: "http://localhost:3000/",
            debugging: false,
        },
        {
            name: "heroku",
            url: "hyphen-js.herokuapp.com",
            api: "https://hyphen-js-server.herokuapp.com/",
            debugging: false,
        },

    ]
    this.settings = _(envs).find(function (environment) {
        return $location.host() == environment.url;
    });

    return this;
}]);

