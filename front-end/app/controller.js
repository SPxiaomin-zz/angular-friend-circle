app
    .controller('BodyController', ['$rootScope', function($rootScope) {
        $rootScope.isSignin = false;
    }])
    .controller('NavbarController', ['$scope', '$rootScope', 'AuthFactory', 'HintFactory', 'socket', function($scope, $rootScope, AuthFactory, HintFactory, socket) {
        $rootScope.isAuth = AuthFactory.checkAuth('USER');

        // 下面的 if 语句的作用是当用户登陆了之后，重新刷新页面时，由于 $rootScope.totalHints
        // 和 $rootScope.isChatroomAccess 值会消失，所以通过下面的语句进行值的重置，上面的语句
        // 其实也是一样的作用
        if (AuthFactory.checkAuth('USER')) {

            socket.emit('update hints', AuthFactory.getAuth('USER').id);

            if (AuthFactory.getAuth('USER').currentRoom) {
                $rootScope.isChatroomAccess = true;
            }
        }

        socket.on('update hints', function(id) {

            if (AuthFactory.checkAuth('USER')) {

                if (AuthFactory.getAuth('USER').id === id) {

                    HintFactory.getHintsCount(AuthFactory.getAuth('USER').id + '/' + false, function(data) {
                        console.log(data.status); // Get Hint Count Success

                        // 如果没有任何的 hint 的时候，由于 flash.js 0 || {} 的原因, 所以返回的是 {}，等 hint/search 功能分析完成之后，分析各个返回数据的 routes/index.js 路径，看能否将 || {} 去掉 ？
                        if (typeof data.data === 'number') {
                            $rootScope.totalHints = data.data;
                        } else {
                            $rootScope.totalHints = 0;
                        }
                    }, function(error) {
                        console.log(error);
                    });
                }
            }
        });
    }])
    .controller('LoginController', ['$scope', '$rootScope', 'AuthFactory', 'socket', function($scope, $rootScope, AuthFactory, socket) {
        AuthFactory.checkNotAuth('USER');

        $scope.toggleSignin = function() {
            $rootScope.isSignin = !$rootScope.isSignin;
        };

        $scope.login = function() {

            AuthFactory.login({
                email: $scope.loginEmail,
                password: $scope.loginPassword
            }, function(data) {
                if (data.status.code === 404 || data.status.code === 409) {
                    console.log(data.status);
                } else if (data.status.code === 200) {
                    console.log(data.status); // Login Success

                    AuthFactory.setAuth('USER', data.data);
                    $rootScope.isAuth = AuthFactory.checkAuth('USER');
                    $rootScope.isChatroomAccess = false;
                    socket.emit('update hints', AuthFactory.getAuth('USER').id);

                    socket.emit('update friends', AuthFactory.getAuth('USER').id);

                    AuthFactory.checkNotAuth('USER');
                }
            }, function(error) {
                console.log(error);
            });
        };
    }])
    .controller('SigninController', ['$scope', '$rootScope', 'AuthFactory', function($scope, $rootScope, AuthFactory) {
        $scope.$watchGroup(['signinPassword', 'signinConfirmation'], function(newVal) {
            $scope.isMatch = newVal[0] === newVal[1];
        });

        $scope.signin = function() {

            if ($scope.isMatch) {

                AuthFactory.signin({
                    username: $scope.signinUsername,
                    password: $scope.signinPassword,
                    email: $scope.signinEmail,
                    signature: $scope.signinSignature
                }, function(data) {

                    if (data.status.code === 409) {
                        console.log(data.status);
                    } else if (data.status.code === 200) {
                        console.log(data.status);

                        AuthFactory.setAuth('USER', data.data);
                        $rootScope.isAuth = AuthFactory.checkAuth('USER');
                        $rootScope.isChatroomAccess = false;

                        socket.emit('update hints', AuthFactory.getAuth('USER').id);

                        AuthFactory.checkNotAuth('USER');
                    }
                }, function(error) {
                    console.log(error);
                });
            }
        };
    }])
    .controller('LogoutController', ['$scope', '$rootScope', 'AuthFactory', 'socket', 'RoomFactory', function($scope, $rootScope, AuthFactory, socket, RoomFactory) {
        $scope.logout = function() {
            var user = AuthFactory.getAuth('USER');

            if (user.currentRoom) {

                RoomFactory.exit({
                    userId: user.id
                }, function(data) {
                    console.log(data.status); // Exit Success

                    socket.emit('update room info', user.currentRoom);
                }, function(error) {
                    console.log(error);
                });
            }

            AuthFactory.logout({
                id: user.id
            }, function(data) {
                console.log(data.status); // Logout Success

                if (data.status.code === 200) {
                    $rootScope.isAuth = false;
                    $rootScope.username = null;

                    AuthFactory.removeAuth('USER');

                    // 此语句相当于一个跳转到 /auth 路径的作用
                    AuthFactory.checkAuth('USER');

                    // 通知好友离线
                    socket.emit('update friends', user.id);
                }
            }, function(error) {
                console.log(error);
            });

        };
    }])
    .controller('UserInfoController', ['$scope', '$rootScope', 'AuthFactory', 'FriendFactory', function($scope, $rootScope, AuthFactory, FriendFactory) {
        if (AuthFactory.checkAuth('USER')) {

            FriendFactory.getOne(AuthFactory.getAuth('USER').id, function(data) {
                console.log(data.status); // Get User Info Success

                $rootScope.username = data.data.username;
                $scope.signature = data.data.signature;
            }, function(error) {
                console.log(error);
            });
        }
    }])
    .controller('SearchFriendController', ['$scope', 'socket', 'AuthFactory', 'SearchFactory', 'HintFactory', 'FriendFactory', function($scope, socket, AuthFactory, SearchFactory, HintFactory, FriendFactory) {
        AuthFactory.checkAuth('USER');

        // 当已经发送过请求的人，接受了你的请求时，如果你正处于此页面，及时刷新数据，避免再次请求
        socket.on('update friends', function(id) {

            if (AuthFactory.checkAuth('USER')) {

                if (AuthFactory.getAuth('USER').id === id) {
                    updateFriends();
                }
            }
        });

        function updateFriends() {

            FriendFactory.getOne(AuthFactory.getAuth('USER').id, function(data) {
                console.log(data.status); // Get User Info Success

                $scope.friends = data.data.friends;
            }, function(error) {
                console.log(error);
            });
        }

        updateFriends();

        $scope.searchFriendContent = '';

        $scope.searchResult = null;
        $scope.selfId = AuthFactory.getAuth('USER').id;
        $scope.isApplied = false;

        $scope.noSearchResult = false;

        $scope.search = function() {

            SearchFactory.searchUser({
                content: $scope.searchFriendContent
            }, function(data) {
                console.log(data.status); // Search Hint Success

                // data.data 当没有数据的时候，返回的是 []，其布尔值一样是 true，所以要通过 .length 才测试值是否为空
                if (data.data && data.data.length) {
                    $scope.searchResult = data.data;
                    $scope.noSearchResult = false;
                } else {
                    $scope.searchResult = null;
                    $scope.noSearchResult = true;
                }
            }, function(error) {
                console.log(error);
            });

            $scope.searchFriendContent = '';
        };

        $scope.pullRequest = function(targetId, hintContent) {
            var self = this;

            HintFactory.pullRequest({
                targetId: targetId,
                hintType: 'friend request',
                hintContent: hintContent,
                senderId: AuthFactory.getAuth('USER').id,
                senderName: AuthFactory.getAuth('USER').username,
                mark: false,
                accept: false
            }, function(data) {
                console.log(data.status); // Post Hint Success

                socket.emit('update hints', targetId);

                self.isApplied = true;
                self.applyContent = '';
            }, function(error) {
                console.log(error);
            });
        };
    }])
    .controller('HintController', ['$scope', '$rootScope', 'socket', 'AuthFactory', 'HintFactory', 'FriendFactory', function($scope, $rootScope, socket, AuthFactory, HintFactory, FriendFactory) {
        AuthFactory.checkAuth('USER');

        socket.on('update hints', function(id) {

            if (AuthFactory.checkAuth('USER')) {

                if (AuthFactory.getAuth('USER').id === id) {

                    updateHints();
                }
            }
        });

        function updateHints() {

            HintFactory.getAllHints(AuthFactory.getAuth('USER').id, function(data) {
                console.log(data.status); // Get All Hints Success

                $scope.hintsList = data.data;
            }, function(error) {
                console.log(error);
            });
        }

        updateHints();

        $scope.isMarked = false;
        $scope.isAccepted = false;

        $scope.mark = function(id) {
            var self = this;

            HintFactory.markHint({
                targetId: AuthFactory.getAuth('USER').id,
                id: id
            }, function(data) {
                console.log(data.status); // Mark Hint Success

                self.isMarked = true;
                $rootScope.totalHints = $rootScope.totalHints - 1;
            }, function(error) {
                console.log(error);
            });
        };

        $scope.accept = function(id) {
            var self = this;

            HintFactory.acceptHint({
                targetId: AuthFactory.getAuth('USER').id,
                id: id
            }, function(data) {
                console.log(data.status); // Accept Hint Success

                if (!data.data.mark) {
                    self.isMarked = true;
                    $rootScope.totalHints = $rootScope.totalHints - 1;
                }

                addFriend(data.data.targetId, data.data.senderId);

                self.isAccepted = true;
            }, function(error) {
                console.log(error);
            });
        };

        function addFriend(targetId, senderId) {

            FriendFactory.toBeFriends({
                targetId: targetId,
                senderId: senderId
            }, function(data) {
                console.log(data.status); // Accept Each Other Success

                HintFactory.pullRequest({
                    targetId: senderId,
                    hintType: 'accept request',
                    hintContent: 'i accept your request, we are friends now.',
                    senderId: AuthFactory.getAuth('USER').id,
                    senderName: AuthFactory.getAuth('USER').username,
                    mark: false,
                    accept: true
                }, function(data) {
                    console.log(data.status); // Post Hint Success

                    // stop 分析下面的语句更新数据之后，如果sender处在不同的页面中，是否会产生逻辑错误

                    socket.emit('update hints', senderId);
                    socket.emit('update friends', senderId);
                    socket.emit('update news', senderId);
                }, function(error) {
                    console.log(error);
                });
            }, function(error) {
                console.log(error);
            });
        }
    }])
    .controller('ChatController', ['$scope', '$rootScope', '$timeout', '$location', '$window', 'socket', 'AuthFactory', 'FriendFactory', 'RoomFactory', function($scope, $rootScope, $timeout, $location, $window, socket, AuthFactory, FriendFactory, RoomFactory) {
        AuthFactory.checkAuth('USER');
        RoomFactory.checkAccess('USER');

        var minWindowSize = 768;
        $scope.isShowRoomInfo = $window.document.documentElement.clientWidth < minWindowSize ? false : true;

        $scope.convertIdToUsername = function(input, data) {

            if (AuthFactory.checkAuth('USER')) {

                if (input === AuthFactory.getAuth('USER').id) {
                    return AuthFactory.getAuth('USER').username;
                } else {
                    var friends = data || [];
                    var length = friends.length;

                    for (var i=0; i<length; i++) {

                        if (input === friends[i]['_id']) {
                            return friends[i]['username'];
                        }
                    }
                }
            }
        };

        function updateRoom() {

            RoomFactory.getOne(AuthFactory.getAuth('USER').currentRoom, function(data) {
                console.log(data.status); // Get Room Success

                $scope.room = data.data;
            }, function(error) {
                console.log(error);
            });
        }

        socket.on('update room info', function(id) {

            if (AuthFactory.checkAuth('USER')) {

                if (AuthFactory.getAuth('USER').currentRoom === id) {

                    updateRoom();
                }
            }
        });

        updateRoom();

        // 处在聊天室的过程中，如果房间中的朋友更改了姓名的话，就及时进行数据的更新
        socket.on('update friends', function(id) {

            if (AuthFactory.checkAuth('USER')) {

                var user = AuthFactory.getAuth('USER');

                if (user.friends.indexOf(id) >= 0) {

                    updateFriends();
                }
            }
        });

        function updateFriends() {

            FriendFactory.getAll(AuthFactory.getAuth('USER').id, function(data) {
                console.log(data.status); // Get All Friends Success

                $scope.friends = data.data;
            }, function(error) {
                console.log(error);
            });
        }

        updateFriends();

        $scope.exit = function() {

            RoomFactory.exit({
                userId: AuthFactory.getAuth('USER').id
            }, function(data) {
                console.log(data.status); // Exit Success

                socket.emit('update room info', AuthFactory.getAuth('USER').currentRoom);

                $rootScope.isChatroomAccess = false;
                $location.path('/circle');
            }, function(error) {
                console.log(error);
            });
        };

        $scope.message = [];
        var timer;

        $scope.sendMessage = function(content) {

            if (content) {

                socket.emit('send message', {
                    username: AuthFactory.getAuth('USER').username,
                    date: moment().format('HH:mm:ss'),
                    message: content,
                    id: AuthFactory.getAuth('USER').id,
                    currentRoom: AuthFactory.getAuth('USER').currentRoom
                });
                
                $scope.content = '';
            }
        };

        function checkSelf(data) {
            return data.id === AuthFactory.getAuth('USER').id;
        }

        socket.on('receive message', function(data) {

            if (AuthFactory.checkAuth('USER')) {

                if (data.currentRoom === AuthFactory.getAuth('USER').currentRoom) {

                    data.isSelf = checkSelf(data);
                    $scope.message.push(data);
                }
            }
        });

        $scope.typing = function() {

            socket.emit('typing', {
                username: AuthFactory.getAuth('USER').username,
                currentRoom: AuthFactory.getAuth('USER').currentRoom
            });
        };

        socket.on('typing', function(data) {

            if (AuthFactory.checkAuth('USER')) {

                if (data.currentRoom === AuthFactory.getAuth('USER').currentRoom) {

                    $scope.typingUsername = data.username;

                    timer && $timeout.cancel(timer);
                    timer = $timeout(function() {
                        $scope.isTyping = false;
                    }, 350);

                    $scope.isTyping = true;
                }
            }
        });
    }])
    .controller('CircleController', ['$scope', '$rootScope', 'AuthFactory', 'FriendFactory', 'RoomFactory', 'NewsFactory', 'socket', '$window', '$location', function($scope, $rootScope, AuthFactory, FriendFactory, RoomFactory, NewsFactory, socket, $window, $location) {
        if (AuthFactory.checkAuth('USER')) {

            FriendFactory.getOne(AuthFactory.getAuth('USER').id, function(data) {
                console.log(data.status); // Get User Info Success

                AuthFactory.setAuth('USER', data.data);
            }, function(error) {
                console.log(error);
            });

            var minWindowSize = 768;
            $scope.isShowSelfInfo = $scope.isShowFriends = $scope.isShowRooms = $window.document.documentElement.clientWidth < minWindowSize ? false : true;

            $scope.isEdit = false;

            $scope.toggleEdit = function() {
                this.isEdit = !this.isEdit;
            };

            $scope.convertIdToUsername = function(input, data) {

                if (AuthFactory.checkAuth('USER')) {

                    if (input === AuthFactory.getAuth('USER').id) {

                        return AuthFactory.getAuth('USER').username;
                    } else {
                        var friends = data || [];
                        var length = friends.length;

                        for (var i=0; i<length; i++) {

                            if (input === friends[i]['_id']) {

                                return friends[i]['username'];
                            }
                        }
                    }
                }
            };

            /*
             * user info area
             */

            $scope.saveUserInfo = function(username, signature) {
                this.isEdit = false;

                FriendFactory.save({
                    userId: AuthFactory.getAuth('USER').id,
                    username: username,
                    signature: signature
                }, function(data) {
                    console.log(data.status); // Save User Info Success

                    var user = AuthFactory.getAuth('USER');
                    user.username = data.data.username;
                    user.signature = data.data.signature;
                    AuthFactory.setAuth('USER', user);

                    $rootScope.username = data.data.username;

                    socket.emit('update friends', AuthFactory.getAuth('USER').id);
                }, function(error) {
                    console.log(error);
                });
            };

            /*
             * friends list
             */

            socket.on('update friends', function(id) {

                if (AuthFactory.checkAuth('USER')) {

                    var user = AuthFactory.getAuth('USER');

                    if (user.id === id || user.friends.indexOf(id) >= 0) {
                        updateFriends();
                    }
                }
            });

            function updateFriends() {

                FriendFactory.getAll(AuthFactory.getAuth('USER').id, function(data) {
                    console.log(data.status); // Get All Friends Success

                    $scope.friends = data.data;
                }, function(error) {
                    console.log(error);
                });
                
                // 防止
                // 当 a hint 中 accept 被接收方点击的时候，如果 a hint 的发送方正处于 circle.html，
                // 如果接收方在 hint.html 页面点击了 accept 并且来到 circle.html 页面更新用用户信息，或者发送 news 时，
                // a hint 发送发接受不到
                FriendFactory.getOne(AuthFactory.getAuth('USER').id, function(data) {
                    console.log(data.status); // Get User Info Success

                    AuthFactory.setAuth('USER', data.data);
                }, function(error) {
                    console.log(error);
                });
            }

            updateFriends();

            $scope.isCreateRoom = false;
            $scope.isChecked = false;
            $scope.members = [];

            $scope.toggleCheck = function(id) {

                if ($scope.members.indexOf(id) >= 0) {
                    var index = $scope.members.indexOf(id);

                    $scope.members.splice(index, 1);
                    this.isChecked = false;
                } else {
                    $scope.members.push(id);
                    this.isChecked = true;
                }
            };

            $scope.finish = function() {
                $scope.members.push(AuthFactory.getAuth('USER').id);

                RoomFactory.create({
                    roomInfo: $scope.roomInfo,
                    createrId: AuthFactory.getAuth('USER').id,
                    createdDate: new Date(),
                    members: $scope.members,
                    currentMembers: []
                }, function(data) {
                    console.log(data.status); // Create Room Success

                    $scope.roomInfo = '';
                    $scope.members = [];
                    $scope.isCreateRoom = false;

                    socket.emit('update rooms', data.data.members);
                }, function(error) {
                    console.log(error);
                });
            };

            /*
             * rooms list
             */

            socket.on('update rooms', function(members) {

                if (AuthFactory.checkAuth('USER').id) {

                    if (members.indexOf(AuthFactory.getAuth('USER').id) >= 0) {

                        updateRooms();
                    }
                }
            });

            function updateRooms() {

                RoomFactory.getRooms(AuthFactory.getAuth('USER').id, function(data) {
                    console.log(data.status); // Get Rooms Success

                    $scope.rooms = data.data;
                }, function(error) {
                    console.log(error);
                });
            }

            updateRooms();

            $scope.join = function(roomId) {

                RoomFactory.join({
                    userId: AuthFactory.getAuth('USER').id,
                    roomId: roomId
                }, function(data) {
                    console.log(data.status); // Join New/Old Room Success

                    FriendFactory.getOne(AuthFactory.getAuth('USER').id, function(data) {
                        AuthFactory.setAuth('USER', data.data); // 更新 user.currentRoom 的值进入浏览器cookies
                        $rootScope.isChatroomAccess = true;

                        socket.emit('update room info', AuthFactory.getAuth('USER').currentRoom);

                        $location.path('/chatroom');
                    }, function(error) {
                        console.log(error);
                    });
                }, function(error) {
                    console.log(error);
                });
            };

            /*
             * write news area
             */

            $scope.page = 1;
            $scope.selfId = AuthFactory.getAuth('USER').id;

            socket.on('update news', function(id) {

                if (AuthFactory.checkAuth('USER')) {
                    var user = AuthFactory.getAuth('USER');

                    if (user.id === id || user.friends.indexOf(id) >= 0) {

                        updateNews($scope.page);
                    }
                }
            });

            function updateNews(page) {

                NewsFactory.getAll(AuthFactory.getAuth('USER').id + '/' + page, function(data) {
                    console.log(data.status); // Get News List Success

                    $scope.newsList = data.data;
                }, function(error) {
                    console.log(error);
                });
            }

            updateNews(1);

            $scope.isMarkdown = false;

            $scope.createNews = function() {

                NewsFactory.create({
                    publishId: AuthFactory.getAuth('USER').id,
                    publishContent: $scope.writeContent,
                    isMarkdown: $scope.isMarkdown
                }, function(data) {
                    console.log(data.status); // Create News Success

                    socket.emit('update news', AuthFactory.getAuth('USER').id);
                    $scope.writeContent = '';
                }, function(error) {
                    console.log(error);
                });

                $scope.isMarkdown = false;
            };

            $scope.saveNews = function(newsId, editContentResult) {
                this.isEdit = false;

                NewsFactory.save({
                    newsId: newsId,
                    publishContent: editContentResult
                }, function(data) {
                    console.log(data.status); // Save News Success

                    socket.emit('update news', AuthFactory.getAuth('USER').id);
                }, function(error) {
                    console.log(error);
                });
            };

            $scope.removeNews = function(newsId) {

                NewsFactory.remove({
                    newsId: newsId
                }, function(data) {
                    console.log(data.status); // Remove News Success

                    socket.emit('update news', AuthFactory.getAuth('USER').id);
                }, function(error) {
                    console.log(error);
                });
            };

            $scope.supportNews = function(newsId) {

                NewsFactory.support({
                    newsId: newsId,
                    supporter: AuthFactory.getAuth('USER').id
                }, function(data) {
                    console.log(data.status); // Support News Success

                    socket.emit('update news', AuthFactory.getAuth('USER').id);
                }, function(error) {
                    console.log(error);
                });
            };

            $scope.hasNext = true;

            $scope.loadNextPage = function() {

                if ($scope.newsList && $scope.newsList.length < $scope.page * 7) {
                    $scope.hasNext = false;
                } else {
                    $scope.hasNext = true;
                    $scope.page = $scope.page + 1;
                    updateNews($scope.page);
                }
            };
        }
    }])
