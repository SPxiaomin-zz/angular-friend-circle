app
    .directive('headertemplate', ['$templateCache', function($templateCache) {
        return {
            restrict: 'E',
            replace: true,
            templateUrl: $templateCache.get('header.html')
        };
    }])
    .directive('footertemplate', ['$templateCache', function($templateCache) {
        return {
            restrict: 'E',
            replace: true,
            templateUrl: $templateCache.get('footer.html')
        };
    }]);
