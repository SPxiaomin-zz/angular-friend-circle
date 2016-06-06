var app = angular.module('app', ['ui.router', 'ngCookies', 'btford.socket-io', 'ngSanitize']);

app.run(['$templateCache', function($templateCache) {
    $templateCache.put('header.html', 'templates/header.html');
    $templateCache.put('footer.html', 'templates/footer.html');
}]);
