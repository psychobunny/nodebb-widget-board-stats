"use strict";

var async = module.parent.require('async');
var nconf = module.parent.require('nconf');
var validator = module.parent.require('validator');

var db = module.parent.require('./database');
var categories = module.parent.require('./categories');
var user = module.parent.require('./user');
var plugins = module.parent.require('./plugins');
var topics = module.parent.require('./topics');
var posts = module.parent.require('./posts');
var groups = module.parent.require('./groups');
var utils = module.parent.require('./utils');

var socketPlugins = module.parent.require('./socket.io/plugins');

var benchpressjs = module.parent.require('benchpressjs');

var app;

var Widget = module.exports;

Widget.init = function(params, callback) {
	app = params.app;
	callback();
};

socketPlugins.boardStats = {};
socketPlugins.boardStats.get = function(socket, tid, callback) {
	getWidgetData(callback);
};


function getWidgetData(callback) {
	async.parallel({
		global: function(next) {
			db.getObjectFields('global', ['topicCount', 'postCount', 'userCount'], next);
		},
		onlineCount: function(next) {
			var now = Date.now();
			db.sortedSetCount('users:online', now - 300000, '+inf', next);
		},
		guestCount: function(next) {
			module.parent.require('./socket.io/admin/rooms').getTotalGuestCount(next);
		},
		latestUser: getLatestUser,
		activeUsers: getActiveUsers,
		mostUsers: Widget.updateAndGetOnlineUsers,
	}, function(err, results) {
		if (err) {
			return callback(err);
		}

		var data = {
			count: utils.makeNumberHumanReadable(parseInt(results.onlineCount, 10) + parseInt(results.guestCount, 10)),
			members: utils.makeNumberHumanReadable(results.onlineCount),
			guests: utils.makeNumberHumanReadable(results.guestCount),
			list: joinUsers(results.activeUsers),
			posts: utils.makeNumberHumanReadable(results.global.postCount ? results.global.postCount : 0),
			topics: utils.makeNumberHumanReadable(results.global.topicCount ? results.global.topicCount : 0),
			registered: utils.makeNumberHumanReadable(results.global.userCount ? results.global.userCount : 0),
			latest: joinUsers(results.latestUser),
			relative_path: nconf.get('relative_path'),
			mostUsers: {
				timestampISO: (new Date(results.mostUsers.timestamp)).toISOString(),
				total: results.mostUsers.total,
			}
		};


		callback(null, data);
	});
}

function getActiveUsers(callback) {
	async.waterfall([
		function (next) {
			user.getUidsFromSet('users:online', 0, 19, next);
		},
		function (uids, next) {
			user.getUsersWithFields(uids, ['username', 'userslug'], 0, next);
		},
	], callback);
}

function getLatestUser(callback) {
	async.waterfall([
		function (next) {
			user.getUidsFromSet('users:joindate', 0, 0, next);
		},
		function (uids, next) {
			user.getUsersWithFields(uids, ['username', 'userslug'], 0, next);
		},
	], callback);
}

function joinUsers(usersData) {
	var str = [];
	for (var i = 0, ii = usersData.length; i < ii; i++) {
		str.push('<a href="' + nconf.get('relative_path') + '/user/' + usersData[i].userslug + '">' + usersData[i].username + '</a>');
	}

	return str.join(', ');
}

Widget.updateAndGetOnlineUsers = function(callback) {
	callback = typeof callback === 'function' ? callback : function() {};

	async.waterfall([
		function (next) {
			var now = Date.now();
			db.sortedSetCount('users:online', now - 300000, '+inf', next);
		},
		function (onlineCount, next) {
			module.parent.require('./socket.io/admin/rooms').getTotalGuestCount(function(err, guestCount) {
				if (err) {
					return next(err);
				}

				next(null, utils.makeNumberHumanReadable(parseInt(onlineCount, 10) + parseInt(guestCount, 10)));
			});
		},
		function (totalUsers, next) {
			db.getObjectFields('plugin:widget-board-stats', ['total', 'timestamp'], function(err, data) {
				if (err) {
					return next(err);
				}

				if (parseInt(data.total || 0, 10) <= parseInt(totalUsers, 10)) {
					data.timestamp = Date.now();
					data.total = totalUsers;
					db.setObject('plugin:widget-board-stats', data, function(err) {
						if (err) {
							return next(err);
						}

						next(null, data);
					});

					return;
				}

				return next(null, data);
			});
		},
	], callback);

};

Widget.renderWidget = function(widget, callback) {
	getWidgetData(function(err, data) {
		if (err) {
			return callback(err);
		}

		app.render('widgets/board-stats', data, callback);
	});
};

Widget.defineWidgets = function(widgets, callback) {
	var widget = {
		widget: "board-stats",
		name: "Board Stats",
		description: "Classical board stats widget in real-time.",
		content: 'admin/board-stats'
	};

	app.render(widget.content, {}, function(err, html) {
		widget.content = html;
		widgets.push(widget);
		callback(err, widgets);
	});
};
