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
                {name: "signIn", url: "users/login", method: "post", processResponse: false},
                {name: "update", url: "users/update", method: "put"},
                {name: "create", url: "users/create", method: "post"},
                {name: "registerUser", url: "users/register", method: "post"},
                {name: "getAll", url: "users", method: "get"},
                {name: "delete", url: "users/:id", method: "delete"},
                {name: "getOne", url: "users/:id", method: "get"},
                {name: "removeAll", url: "users/remove_all", method: "post", action: "delete"},
                {name: "getUserProjects", url: "users/user_projects", method: "get", responseHandler: function(data, hyphenModels){
                    var projects= data.projects;
                    hyphenModels.Projects.dataModel.add(projects);
                    delete data.projects;
                    hyphenModels.Users.dataModel.add(data);
                }},
            ],
        },
        {
            model: "Projects",
            key: "_id",
            sync: true,
            priority: 1,
            rest: [
                {name: "create", url: "projects/create", method: "post"},
                {name: "getAll", url: "projects", method: "get"},
                {name: "removeAll", url: "projects/remove_all", method: "post", action: "delete"},
            ],

        }
    ];

    var timestamp = new Date / 1e3 | 0;

    var configuration = {
        model: dataModel,
        baseUrl: Environments.settings.api,
        dbVersion: timestamp * 1000,
        dbName: 'JsHyphenDb',
        requestInterceptor: function (config) {
            //intercept all request and provide authorization token
            var token = sessionStorage.getItem("token");
            config.headers = {Authorization: token};
            return config;
        },
        responseInterceptor: function () {
            throw new Error("Not implemented");
        }
    }

    Hyphen.initialize(configuration);

    Hyphen.syncStartEvent(function(){
        $rootScope.syncing = true;
    });

    Hyphen.syncEndEvent(function(){
        $rootScope.syncing = false;
    })

    $rootScope.$on('$stateChangeError',
        function (event, toState, toParams, fromState, fromParams, error) {
            alert("location failed");
        });

    $rootScope.$on('$stateChangeStart',
        function (event, toState, toParams, fromState, fromParams) {
            $rootScope.menuVisibility = toParams.menuVisibility;
            $rootScope.active = toState.name;
            if (toParams.requireAuthorization && sessionStorage.getItem("token")) {
                Hyphen.synchronize();
                console.log("synchronizing");
            }
            if (toParams.requireAuthorization && !sessionStorage.getItem("token")) {
                $rootScope.menuVisibility=false;
                $state.go("sign_in");
                    event.preventDefault();


            }else{

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
                    return Hyphen.Projects.api.getAll.call().then(function(){
                        Hyphen.synchronize();
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
                    return $q.all([Hyphen.Users.api.getAll.call(),  Hyphen.Projects.api.getAll.call()]).then(function(){
                        Hyphen.synchronize();
                    });;
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
    $scope.signOut = function(){
        sessionStorage.clear();
        $state.go("sign_in");
    }

}]);
