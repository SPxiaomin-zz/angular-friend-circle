app
    .config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
        $stateProvider
            .state('auth', {
                url: '/auth',
                templateUrl: 'templates/auth.html'
            })
            .state('circle', {
                url: '/circle',
                templateUrl: 'templates/circle.html'
            })
            .state('chatroom', {
                url: '/chatroom',
                templateUrl: 'templates/chatroom.html'
            })
            .state('search', {
                url: '/search',
                templateUrl: 'templates/search.html'
            })
            .state('hint', {
                url: '/hint',
                templateUrl: 'templates/hint.html'
            })

        $urlRouterProvider.otherwise('/auth');
    }]);
