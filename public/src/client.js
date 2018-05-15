/* globals app, ajaxify, socket */

$(document).ready(function () {
	'use strict';

	var intervalId = 0;

	var pollInProgress = false;

	$(window).on('action:ajaxify.end', function (ev, data) {
		if ($('[component="widget/board-stats"]').length) {
			startPolling();
		} else {
			stopPolling();
		}
	});

	function startPolling() {
		stopPolling();
		intervalId = setInterval(function () {
			if (!$('[component="widget/board-stats"]').length) {
				return stopPolling();
			}
			if (pollInProgress) {
				return;
			}
			pollInProgress = true;
			socket.emit('plugins.boardStats.get', {}, function (err, data) {
				if (err) {
					return app.alertError(err.message);
				}
				if (!data) {
					pollInProgress = false;
					return;
                }
                
				app.parseAndTranslate('widgets/board-stats', data, function (html) {
                    var div = $('[component="widget/board-stats"]');
                    div.html(html.html());
                    div.find('.timeago').timeago();
					pollInProgress = false;
				});
			});
		}, 5000);
	}

	function stopPolling() {
		if (intervalId) {
			clearInterval(intervalId);
		}
		pollInProgress = false;
		intervalId = 0;
	}

});