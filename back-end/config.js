var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/circle');

module.exports.mongoose = mongoose;
