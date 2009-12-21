/**
 * Expose an element as a view accessible by URL hash/fragment.
 *
 * @license MIT (See LICENSE for details)
 * @author  Rasmus Andersson <http://hunch.se/>
 */
jQuery.fn.expose = function(path, handler, add_switch_handler) {
	var did_have_index = false;
	var r = this.each(function(){
		jQuery.exposed.expose(this, path, handler, add_switch_handler, function(ent){
			did_have_index = true;
		});
	});
	
	// make sure we get the onhashchange events
	if (jQuery.exposed.initialized === true && !jQuery.exposed._observeHashChange() && did_have_index)
		jQuery.exposed.onHashChange();
	
	return r;
};

/**
 * Expose the app -- call this once when your app is starting (after you've set
 * up all possible entry routes).
 */
jQuery.expose = function(path, handler, add_switch_handler) {
	if (path === undefined) {
		// no arguments: initialize
		if (jQuery.exposed.initialized === true)
			return;
		jQuery.exposed.initialized = true;
		jQuery.exposed._observeHashChange();
	}
	else {
		// expose a handler without attaching it to an element
		if (typeof path !== 'string' && jQuery.exposed._isRegExpObject(path) === false)
			throw new Error('first argument to jQuery.expose must be a string or a RegExp object');
		if (typeof handler !== 'function')
			throw new Error('second argument to jQuery.expose must be a function');
		// when exposing w/o an element, the default value of add_switch_handler is false
		if (add_switch_handler === undefined)
			add_switch_handler = false;
		jQuery.exposed.expose(null, path, handler, add_switch_handler);
	}
	return jQuery;
}

/**
 * This is where mappings and per-session functionality lives.
 */
jQuery.exposed = {
	/** Map of path => element ( => [handler, ...] ) */
	routes: [],
	
	/** Current path */
	path: '',
	
	/** jQuery.expose been called? */
	initialized: false,
	
	expose: function(element, path, handler, add_switch_handler, index_cb) {
		var entry = null;
		
		// parse arguments
		if (typeof element !== 'object')
			element = null;
		if (add_switch_handler === undefined)
			add_switch_handler = true;
		
		// already exists?
		if (element !== null) {
			for (var i in jQuery.exposed.routes) {
				var e = jQuery.exposed.routes[i];
				if (e.element === element) {
					entry = e;
					break;
				}
			}
		}
	
		// create entry if not exists
		if (entry === null) {
			entry = {
				paths: [],
				handlers: [],
				element: element,
				args: []
			};
			jQuery.exposed.routes.push(entry);
		}
	
		// add path and handler
		var did_set_path = false;
		if (typeof path === 'function' && typeof path.test !== 'function') {
			entry.handlers.push(function(){ return path.call(elem); });
		}
		else {
			if (path !== undefined && 
			    (typeof path === 'string' || typeof path.test === 'function'))
			{
				did_set_path = true;
				if (typeof path === 'string')
					path = path.replace(/^#/, '');
				entry.paths.push(path);
			}
			if (typeof handler === 'function')
				entry.handlers.push(handler);
		}
	
		// set path from id (or last resort: "")
		if (did_set_path === false) {
			path = (element.id !== undefined) ? element.id : '';
			if (typeof path === 'string')
				path = path.replace(/^#/, '');
			entry.paths.push(path);
		}
	
		// path is index?
		if ((path === '' || (typeof path.test === 'function' && path.test('') === true))
			&& typeof index_cb === 'function')
		{
			index_cb(entry);
		}
	
		// add switch handler
		if (add_switch_handler)
			entry.handlers.push(jQuery.exposed.switchHandler);
		
		return entry;
	},
	
	_isRegExpObject: function(x) {
		return (typeof x === 'function' && typeof x.test === 'function');
	},
	
	/**
	 * The handler which is responsible for switching views.
	 *
	 * You can simply replace this with your own, before calling
	 * expose() on anything.
	 */
	switchHandler: function() {
		var had_visible = false;
		var q = null;
		for (var k in jQuery.exposed.routes) {
			var r = jQuery.exposed.routes[k];
			if (q === null)
				q = $(r.element);
			else
				q = q.add(r.element);
		}
		q = q.filter(':visible').not(this);
		if (q.length) {
			var inelem = this;
			q.fadeOut(100, function(){
				$(inelem).fadeIn(100);
			});
		}
		else {
			$(this).fadeIn(200);
		}
	},
	
	resolve: function(path) {
		var x = {
			route: null,
			route404: null,
			args: []
		};
		for (var k in jQuery.exposed.routes) {
			var r = jQuery.exposed.routes[k];
			for (var i in r.paths) {
				var pa = r.paths[i];
				var t = typeof pa;
				if (t === 'string') {
					if (pa === path) {
						x.route = r;
						if (r.args)
							x.args = x.args.concat(r.args); // avoid reference
						break;
					}
					else if (pa === '404') {
						x.route404 = r;
					}
				}
				else {
					var m = path.match(pa);
					//console.log(path, pa, m);
					if (m && m.length) {
						x.route = r;
						if (m.length > 1)
							x.args = m.slice(1, m.length);
						if (r.args)
							x.args = x.args.concat(r.args);
						break;
					}
				}
			}
		}
		return x;
	},
	
	triggerRoute: function(x) {
		// no joy
		if (x.route === null) {
			if (x.route404 !== null)
				x.route = x.route404;
			else
				return;
		}
		
		// call handlers
		for (var k in x.route.handlers) {
			try {
				x.route.handlers[k].apply(x.route.element, x.args);
			} catch (e) {
				if (window.console !== undefined)
					console.log('[exposed] error when calling handler', x.route.handlers[k], e);
				throw e;
			}
		}
	},
	
	routeCurrentPath: function() {
		jQuery.exposed.path = decodeURIComponent(document.location.hash.substr(1));
		return jQuery.exposed.resolve(jQuery.exposed.path);
	},
	
	/**
	 * Called when location.hash has changed.
	 */
	onHashChange: function(ev) {
		var x = jQuery.exposed.routeCurrentPath();
		jQuery.exposed.triggerRoute(x);
	},
	
	/// Abstraction of location.hash observation
	_observeHashChange: function() {
		if (jQuery.exposed._prevhash !== undefined)
			return false;
		jQuery.exposed._prevhash = '';
		if ("onhashchange" in window) {
			$(window).bind('hashchange', jQuery.exposed.onHashChange);
		}
		else {
			setInterval(function(){
				if (jQuery.exposed._prevhash != document.location.hash){
					jQuery.exposed._prevhash = document.location.hash;
					jQuery.exposed.onHashChange();
				}
			}, 50);
		}
		if (document.location.hash === '' || document.location.hash != jQuery.exposed._prevhash)
			jQuery.exposed.onHashChange();
		return true;
	}
};
