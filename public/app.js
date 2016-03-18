/**
 * Created by blazejgrzelinski on 04/04/15.
 */
var timeminder = angular.module('timeMinder', ['ui.router', 'jsHyphen']);

timeminder.run(['$rootScope', 'Environments', 'Hyphen', 'Environments', '$state', function ($rootScope, Environments, Hyphen, Environments, $state) {

    var dataModel = [
        {
            model: "Users",
            priority: 0,
            sync: true,
            key: "_id",
            rest: [
                {
                    name: "signIn", url: "/users/login", method: "post", responseHandler: function (data, hyphenModels) {
                    sessionStorage.setItem("current-user", data.user._id);
                }
                },
                {name: "update", url: "/users/update", method: "put", offline: true},
                {name: "create", url: "/users/create", method: "post", offline: true},
                {name: "registerUser", url: "/users/register", method: "post", offline: true},
                {name: "getAll", url: "/users", method: "get", cache: true, offline: true},
                {name: "delete", url: "/users/:id", method: "delete", offline: true},
                {name: "getOne", url: "/users/:id", method: "get", offline: true},
                {name: "removeAll", url: "/users/remove_all", method: "post", action: "delete", offline: true},
                {
                    name: "getUserProjects",
                    url: "/users/user_projects",
                    method: "get", offline: true,
                    responseHandler: function (data, hyphenModels) {
                        var projects = data.projects;
                        hyphenModels.Projects.dataModel.add(projects);
                        delete data.projects;
                        hyphenModels.Users.dataModel.add(data);
                    }
                },
            ],
        },
        {
            model: "Projects",
            key: "_id",
            sync: true,
            priority: 1,
            rest: [
                {name: "create", url: "/projects/create", method: "post"},
                {name: "getAll", url: "/projects", method: "get", cache: true},
                {name: "removeAll", url: "/projects/remove_all", method: "post", action: "delete", offline: false},
            ],

        },

    ];

    var timestamp = new Date / 1e3 | 0;

    var configuration = {
        model: dataModel,
        baseUrl: Environments.settings.api,
        dbVersion: 2,
        dbName: 'HyphenJsDb',
        requestInterceptor: function (config) {
            //intercept all request and provide authorization token
            var token = sessionStorage.getItem("token");
            config.headers = {Authorization: token};
            return config;
        },
        responseInterceptor: function (data, config, store) {
            return data;
        },
    }

    Hyphen.initialize(configuration);

    $rootScope.$on('hyphenOnline', function (event) {
        console.log("began online");
        $rootScope.offline = false;
    });

    $rootScope.$on('hyphenOffline', function (event) {
        console.log("began offline");
        $rootScope.offline = true;
    });

    $rootScope.$on('syncStart', function(ev, data){
        console.log("Sync started");
        console.log(data);
        $rootScope.syncing= true;
    });

    $rootScope.$on('syncSuccess', function(ev, data){
        console.log("syncSuccess");
        console.log(data);
        $rootScope.syncing= false;
    });

    $rootScope.$on('syncRecordStart', function(ev, record){
        console.log("Sync syncRecordStart");
        console.log(record);
    });

    $rootScope.$on('syncRecordSuccess', function(ev, record){
        console.log("Sync syncRecordSuccess");
        console.log(record);
    });

    $rootScope.$on('syncStoreStart', function(ev, data){
        console.log("Sync syncStoreStart");
        console.log(data);
    });

    $rootScope.$on('syncStoreSuccess', function(ev, data){
        console.log("Sync syncStoreSuccess");
        console.log(data);
    });

    $rootScope.$on('onNotSupportedMethodCall', function(ev, data){
        console.log("On not supported method call");
        console.log(data);
    });

    $rootScope.$on('apiCallFailure', function(ev, data){
        console.log("On api call failure");
        console.log(data);
    });







    $rootScope.$on('$stateChangeError',
        function (event, toState, toParams, fromState, fromParams, error) {
            alert("location failed");
        });

    $rootScope.$on('$stateChangeStart',
        function (event, toState, toParams, fromState, fromParams) {
            $rootScope.menuVisibility = toParams.menuVisibility;
            $rootScope.active = toState.name;

            if (toParams.requireAuthorization && !sessionStorage.getItem("token")) {
                $rootScope.menuVisibility = false;
                $state.go("sign_in");
                event.preventDefault();

            } else {

            }
        });

    $rootScope.$on('$stateChangeSuccess',
        function (event, toState, toParams, fromState, fromParams) {
            if (toParams.requireAuthorization && sessionStorage.getItem("token")) {
                Hyphen.initializeDb(sessionStorage.getItem("current-user"));
            }

            if (toState.name == "sign_in") {
                Hyphen.dispose();
            }
        });
}]);

timeminder.config(['$urlRouterProvider', '$stateProvider', function ($urlRouterProvider, $stateProvider) {

    $stateProvider
        .state('projects', {
            url: "/projects",
            templateUrl: "modules/projects/projects.html",
            controller: "ProjectsCtrl",
            params: {requireAuthorization: true, menuVisibility: true},
            resolve: {
                data: ['Hyphen', function (Hyphen) {
                    return Hyphen.Projects.api.getAll.call().then(function () {

                    });
                    //return Hyphen.enqueue([{method: Hyphen.Projects.api.getAll, data: null, params: null}]);
                }]
            }
        })
        .state('users', {
            url: "/users",
            templateUrl: "modules/users/users-view.html",
            controller: 'UsersCtrl',
            params: {requireAuthorization: true, menuVisibility: true},
            resolve: {
                data: ['Hyphen', '$q', function (Hyphen, $q) {
                    return $q.all([Hyphen.Users.api.getAll.call(), Hyphen.Projects.api.getAll.call()]).then(function () {

                    });
                    ;
                    //return Hyphen.enqueue([{method: Hyphen.Users.api.getAll, data: null, params: null}, {method: Hyphen.Projects.api.getAll, data: null, params: null}]);
                }]
            }

        })
        .state('sign_up', {
            url: "/sign_up",
            templateUrl: "modules/sign-up/sign-up-view.html",
            controller: 'SignUpCtrl',
            params: {requireAuthorization: false, menuVisibility: false},
        })
        .state('sign_in', {
            url: "/sign_in",
            templateUrl: "modules/sign-in/sign-in-view.html",
            controller: 'SignInCtrl',
            params: {requireAuthorization: false, menuVisibility: false},
        });
    //  .state('start', {
    // url: "",
    // templateUrl: "modules/sign-in/sign-in-view.html",
    // controller: 'SignInCtrl',
    //  params: {requireAuthorization: false, menuVisibility: false}
    //});

    $urlRouterProvider.otherwise("/users");

}]);

timeminder.controller('navCtrl', ['$scope', 'Hyphen', '$state', function ($scope, Hyphen, $state) {
    $scope.signOut = function () {
        Hyphen.dispose();
        sessionStorage.clear();
        $state.go("sign_in");
    }

}]);
