var express = require('express');
var router = express.Router();
var bcrypt = require('bcrypt');
var moment = require('moment');
var markdown = require('markdown').markdown;

var flash = require('../util/flash');
var User = require('../model/user');
var Room = require('../model/room');
var News = require('../model/news');
var Hint = require('../model/hint');

router.route('/login')
.post(function(req, res, next) {
    var temp = {
        email: req.body.email,
        encryptedPassword: req.body.password
    };

    console.log(temp.email, temp.encryptedPassword);
    User.findOne({'email': temp.email}, function(err, user) {
        if (err) {
            return next(err);
        }

        if (!user) {
            res.send(flash(404, 'user not exist'));

            return ;
        }

        bcrypt.compare(temp.encryptedPassword, user.encryptedPassword, function(err, valid) {
            if (err) {
                return next(err);
            }

            if (!valid) {
                res.send(flash(409, 'password not match'));

                return ;
            }

            user.update({'online': true}, function(err) {
                if (err) {
                    return next(err);
                }

                res.send(flash(200, 'Login Success', {
                    username: user.username,
                    email: user.email,
                    signature: user.signature,
                    id: user._id
                }));
            });
        });
    });
});

router.route('/logout')
.post(function(req, res, next) {
    User.findOne({'_id': req.body.id}, function(err, user) {
        if (err) {
            return next(err);
        }

        user.update({'online': false}, function(err) {
            if (err) {
                return next(err);
            }

            res.send(flash(200, 'Logout Success'));
        });
    });
});

router.route('/signin')
.post(function(req, res, next) {
    var temp = {
        username: req.body.username,
        encryptedPassword: req.body.password,
        email: req.body.email,
        signature: req.body.signature,
        hints: 0,
        friends: [],
        online: true,
        currentRoom: ''
    };

    bcrypt.hash(temp.encryptedPassword, 10, function(err, encryptedPassword) {
        if (err) {
            return next(err);
        }

        User.findOne({'email': temp.email}, function(err, user) {
            if (err) {
                return next(err);
            }

            if (user) {
                res.send(flash(409, 'user already exist'));

                return ;
            }

            temp.encryptedPassword = encryptedPassword;
            User.create(temp, function(err, user) {
                if (err) {
                    return next(err);
                }

                res.send(flash(200, 'Signin Success', {
                    username: temp.username,
                    email: temp.email,
                    signature: temp.signature,
                    id: user._id
                }));
            });
        });
    });
});

router.route('/search')
.post(function(req, res, next) {
    var content = req.body.content;
    var pattern = new RegExp('^.*' + content + '.*$');

    User.find({'$or': [{'username': pattern}, {'email': content}]}, {
        '_id': 1,
        'username': 1,
        'signature': 1
    }, function(err, users) {

        if (err) {
            return next(err);
        }

        res.send(flash(200, 'Search Hint Success', users));
    });
});

router.route('/hint')
.post(function(req, res, next) {
    var hint = new Hint({
        targetId: req.body.targetId,
        hintType: req.body.hintType,
        hintContent: req.body.hintContent,
        senderId: req.body.senderId,
        senderName: req.body.senderName,
        date: moment().format('MMMM Do YYYY, h:mm:ss a'),
        mark: req.body.mark,
        accept: req.body.accept
    });

    // 测试一下 hint 是否有值
    Hint.create(hint, function(err, hint) {
        
        if (err) {
            return next(err);
        }

        User.findOne({'_id': req.body.targetId}, function(err, user) {

            if (err) {
                return next(err);
            }

            user.update({'$inc': {'hints': 1}}, function(err) {

                if (err) {
                    return next(err);
                }

                res.send(flash(200, 'Post Hint Success'));
            });
        });
    });
});

router.route('/hints/all/:targetId')
.get(function(req, res, next) {

    Hint.find({'targetId': req.params.targetId}, function(err, hints) {

        if (err) {
            return next(err);
        }

        res.send(flash(200, 'Get All Hints Success', hints));
    });
});

router.route('/hints/count/:targetId/:mark')
.get(function(req, res, next) {

    Hint.count({'targetId': req.params.targetId, 'mark': req.params.mark}, function(err, total) {

        if (err) {
            return next(err);
        }

        res.send(flash(200, 'Get Hint Count Success', total));
    });
});

router.route('/hint/mark')
.post(function(req, res, next) {

    Hint.findOne({'_id': req.body.id}, function(err, hint) {

        if (err) {
            return next(err);
        }

        hint.update({'mark': true}, function(err) {

            if (err) {
                return next(err);
            }

            User.update({'_id': req.body.targetId}, {'$inc': {'hints': -1}}, function(err) {

                if (err) {
                    return next(err);
                }

                res.send(flash(200, 'Mark Hint Success'));
            });
        });
    });
});

router.route('/hint/accept')
.post(function(req, res, next) {

    Hint.findOne({'_id': req.body.id}, function(err, hint) {

        if (err) {
            return next(err);
        }

        if (!hint.mark) {

            User.update({'_id': req.body.targetId}, {'$inc': {'hints': -1}}, function(err) {

                if (err) {
                    return next(err);
                }
            });
        }

        hint.update({'accept': true, 'mark': true}, function(err) {

            if (err) {
                return next(err);
            }

            res.send(flash(200, 'Accept Hint Success', hint));
        });
    });
});

router.route('/friend/accept')
.post(function(req, res, next) {

    User.findOne({'_id': req.body.senderId}, function(err, user) {

        if (err) {
            return next(err);
        }

        if (user.friends.indexOf(req.body.targetId) < 0) {

            user.update({'$push': {'friends': req.body.targetId}}, function(err) {

                if (err) {
                    return next(err);
                }

                User.findOne({'_id': req.body.targetId}, function(err, user) {

                    if (err) {
                        return next(err);
                    }

                    if (user.friends.indexOf(req.body.senderId) < 0) {

                        user.update({'$push': {'friends': req.body.senderId}}, function(err, user) {

                            if (err) {
                                return next(err);
                            }

                            res.send(flash(200, 'Accept Each Other Success'));
                        });
                    }
                });
            });
        }
    });
});

router.route('/friends/all/:userId')
.get(function(req, res, next) {

    User.findOne({'_id': req.params.userId}, function(err, user) {
        if (err) {
            return next(err);
        }

        User.find({'_id': {'$in': user.friends}}, {
            '_id': 1,
            'username': 1,
            'email': 1,
            'online': 1 }, function(err, users) {
            if (err) {
                return next(err);
            }

            res.send(flash(200, 'Get All Friends Success', users));
        });
    });
});

router.route('/user/:userId')
.get(function(req, res, next) {
    User.findOne({'_id': req.params.userId}, function(err, user) {
        if (err) {
            return next(err);
        }

        res.send(flash(200, 'Get User Info Success', {
            username: user.username,
            email: user.email,
            signature: user.signature,
            id: user._id,
            friends: user.friends,
            currentRoom: user.currentRoom
        }));
    });
});

router.route('/user/save')
.post(function(req, res, next) {
    User.findOne({'_id': req.body.userId}, function(err, user) {
        if (err) {
            return next(err);
        }

        user.update({'username': req.body.username, 'signature': req.body.signature}, function(err) {
            if (err) {
                return next(err);
            }

            User.findOne({'_id': req.body.userId}, function(err, user) {
                if (err) {
                    return next(err);
                }

                res.send(flash(200, 'Save User Info Success', user));
            });
        });
    });
});

router.route('/room/create')
.post(function(req, res, next) {
    var temp = {
        roomInfo: req.body.roomInfo,
        createrId: req.body.createrId,
        createdDate: req.body.createdDate,
        members: req.body.members,
        currentMembers: req.body.currentMembers
    };

    Room.create(temp, function(err, room) {
        if (err) {
            return next(err);
        }

        res.send(flash(200, 'Create Room Success', room));
    });
});

router.route('/rooms/:userId')
.get(function(req, res, next) {
    Room.find({'members': req.params.userId}, function(err, rooms) {
        if (err) {
            return next(err);
        }

        res.send(flash(200, 'Get Rooms Success', rooms));
    });
});

router.route('/room/:roomId')
.get(function(req, res, next) {

    Room.findOne({'_id': req.params.roomId}, function(err, room) {
        
        if (err) {
            return next(err);
        }

        res.send(flash(200, 'Get Room Success', room));
    });
});

router.route('/room/join')
.post(function(req, res, next) {

    User.findOne({'_id': req.body.userId}, function(err, user) {

        if (err) {
            return next(err);
        }

        if (user.currentRoom !== req.body.roomId) {

            if (user.currentRoom) {

                Room.findOne({'_id': user.currentRoom}, function(err, room) {

                    if (err) {
                        return next(err);
                    }

                    var index = room.currentMembers.indexOf(req.body.userId);
                    room.currentMembers.splice(index, 1);

                    room.save(function(err) {

                        if (err) {

                            return next(err);
                        }
                    });
                });
            }

            Room.findOne({'_id': req.body.roomId}, function(err, room) {

                if (err) {
                    return next(err);
                }

                room.currentMembers.push(req.body.userId);

                room.save(function(err) {

                    if (err) {
                        return next(err);
                    }

                    user.update({'currentRoom': req.body.roomId}, function(err) {

                        if (err) {
                            return next(err)
                        }

                        res.send(flash(200, 'Join New Room Success'));
                    });
                });
            });
        } else {
            res.send(flash(200, 'Join Old Room Success'));
        }
    });
});

router.route('/room/exit')
.post(function(req, res, next) {

    User.findOne({'_id': req.body.userId}, function(err, user) {

        if (err) {
            return next(err);
        }

        Room.findOne({'_id': user.currentRoom}, function(err, room) {

            if (err) {
                return next(err);
            }

            var index = room.currentMembers.indexOf(user._id);
            room.currentMembers.splice(index, 1);

            room.save(function(err) {

                if (err) {
                    return next(err);
                }

                user.update({'currentRoom': ''}, function(err) {
                    
                    if (err) {
                        return next(err);
                    }

                    res.send(flash(200, 'Exit Success'));
                });
            });
        });
    });
});

router.route('/news/create')
.post(function(req, res, next) {
    var temp = {
        publishId: req.body.publishId,
        publishContent: req.body.publishContent,
        date: new Date(),
        isMarkdown: req.body.isMarkdown,
        support: []
    };

    if (temp.isMarkdown) {
        temp.publishContent = markdown.toHTML(temp.publishContent);
    }

    News.create(temp, function(err) {

        if (err) {
            return next(err);
        }

        res.send(flash(200, 'Create News Success'));
    });
});

router.route('/news/all/:userId/:page')
.get(function(req, res, next) {
    var page = req.params.page;
    var limit = 7;

    User.findOne({'_id': req.params.userId}, function(err, user) {

        if (err) {
            return next(err);
        }

        var array = user.friends;
        array.push(req.params.userId);

        News.find({'publishId': {'$in': array}}, function(err, newsList) {

            if (err) {
                return next(err);
            }

            // /news/create 路径中 News.create 创建的消息是按顺序存放和取出的吗？
            newsList = newsList.slice(-page*limit, newsList.length);
            res.send(flash(200, 'Get News List Success', newsList));
        });
    });
});

router.route('/news/save')
.post(function(req, res, next) {

    News.findOne({'_id': req.body.newsId}, function(err, news) {

        if (err) {
            return next(err);
        }
        
        news.publishContent = req.body.publishContent;

        news.save(function(err) {

            if (err) {
                return next(err);
            }

            res.send(flash(200, 'Save News Success'));
        });
    });
});

router.route('/news/remove')
.post(function(req, res, next) {

    News.remove({'_id': req.body.newsId}, function(err) {

        if (err) {
            return next(err);
        }

        res.send(flash(200, 'Remove News Success'));
    });
});

router.route('/news/support')
.post(function(req, res, next) {

    News.findOne({'_id': req.body.newsId}, function(err, news) {

        if (err) {
            return next(err);
        }

        var index = news.support.indexOf(req.body.supporter);

        if (index >= 0) {
            news.support.splice(index, 1);
        } else {
            news.support.push(req.body.supporter);
        }

        news.save(function(err) {

            if (err) {
                return next(err);
            }

            res.send(flash(200, 'Support News Success'));
        });
    });
});

module.exports = router;
