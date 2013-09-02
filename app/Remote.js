Ext.define('TrWeb.Remote', {
  constructor: function(args) {
    this.__defineGetter__('application', function() {
      return args.application;
    });

    var _token;
    this.__defineGetter__('token', function() {
      return _token;
    });
    this.__defineSetter__('token', function(token) {
        _token = token;
    });

    return this;
  },

  ajaxError: function(response, options) {
    if (response.status === 409) {
      this.token = response.getResponseHeader('X-Transmission-Session-Id');
      options.headers['X-Transmission-Session-Id'] = this.token;
      Ext.Ajax.request(options);
      return;
    }

    var error = response.responseText
          ? response.responseText.trim().replace(/(<([^>]+)>)/ig,"")
          : "";
    if (!error.length)
      error = 'Server not responding';

    this.application.fireEvent('stop', error);
  },

  sendRequest: function(data, callback, context) {
    var _this = this;

    Ext.Ajax.request({
      url: '../rpc',
      method: 'POST',
      success: callback,
      scope: context,
      failure: function(response, options) { _this.ajaxError(response, options) },
      headers: { 'X-Transmission-Session-Id': this.token },
      jsonData: data,
      timeout: 1500
    });
  },

  // 3.1 Torrent Action Requests
  actionRequests: function(method, ids) {
    this.sendRequest({
      method: method,
      arguments: { ids: ids }
    });
  },

  torrentStart: function(ids) {
    this.actionRequests('torrent-start', ids);
  },

  torrentStartNow: function(ids) {
    this.actionRequests('torrent-start-now', ids);
  },

  torrentStop: function(ids) {
    this.actionRequests('torrent-stop', ids);
  },

  torrentVerify: function(ids) {
    this.actionRequests('torrent-verify', ids);
  },

  torrentReannounce: function(ids) {
    this.actionRequests('torrent-reannounce', ids);
  },

  // 3.3 Torrent Accessors
  torrentGet: function(ids, fields, callback, context) {
    var data = {
      method: 'torrent-get',
      arguments: { 'fields': fields }
    };
    if (ids)
      data.arguments.ids = ids;

    this.sendRequest(data, function(response) {
      var args = JSON.parse(response.responseText)['arguments'];
      callback.call(context, args['torrents'], args['removed']);
    });
  },

  // 3.6 Moving a Torrent
  torrentSetLocation: function(ids, location, move) {
    this.sendRequest({
      method: 'torrent-set-location',
      arguments: {
        ids: ids,
        location: location,
        move: move
      }
    });
  },

  // 4.2 Session Statistics
  sessionStats: function(callback, context) {
    this.sendRequest({ method: 'session-stats' }, function(response) {
      var args = JSON.parse(response.responseText)['arguments'];
      callback.call(context, args);
    });
  },

  // 4.7 Free Space
  freeSpace: function(path, callback, context) {
    var data = {
      method: 'free-space',
      arguments: { path: path }
    };

    this.sendRequest(data, function(response) {
      var args = JSON.parse(response.responseText)['arguments'];
      callback.call(context, args['path'], args['size-bytes']);
    });
  }
});
