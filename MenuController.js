"use import";

import lib.PubSub;
import util.Animation as Animation;
from util.browser import $;
import .Widget;

exports = Class(Widget, function(supr) {
	this._def = {className: 'menuController'};
	
	this.init = function(opts) {
		supr(this, 'init', arguments);
		this._stack = [];
		this.controller = opts.controller;
	}
	
	this.getCurrentView = function() {
		if (!this._stack.length) { return null; }
		return this._stack[this._stack.length - 1];
	}
	
	this.push = function(view, dontAnimate) {
		for (var i = 0, v; v = this._stack[i]; ++i) {
			if (view == v) {
				this.popTo(view);
				return;
			}
		}
		
		// don't animate the first (base) view of a stackview unless explicitly asked to
		if (!this._stack[0] && dontAnimate !== false) {
			dontAnimate = true;
		}
		
		view.menuController = this;
		view.controller = this.controller;
		
		var current = this.getCurrentView();
		this._stack.push(view);
		this._show(view, dontAnimate);
		if (current) { this._hide(current, dontAnimate); }
		return view;
	}
	
	this._hide = function(view, dontAnimate, backward) {
		var el = view.getElement(),
			w = el.offsetWidth,
			onFinish = bind(this, function() {
				$.remove(el);
				view.onHide();
				this.publish('DidHide', view);
			});
		
		view.onBeforeHide();
		if (!dontAnimate) {
			new Animation({
				transition: Animation.easeInOut,
				duration: 500,
				subject: function(t) {
					el.style.left = t * (backward ? 1 : -1) * w + 'px';
				},
				onFinish: onFinish
			}).seekTo(1);
		} else {
			onFinish();
		}
	}
	
	this._show = function(view, dontAnimate, backward) {
		// hidden side effect: will build the menu for menus that haven't been built yet
		var el = view.getElement();
		
		el.style.visibility = 'hidden';
		this.getElement().appendChild(el);
		
		var onFinish = bind(this, function() {
			el.style.left = '0px';
			el.style.visibility = 'visible';
			view.onShow();
			this.publish('DidShow', view);
		});
		
		var w = el.offsetWidth;
		view.onBeforeShow();
		if (!dontAnimate) {
			el.style.left = (backward ? -1 : 1) * w + 'px';
			el.style.visibility = 'visible';
			new Animation({
				transition: Animation.easeInOut,
				duration: 500,
				subject: function(t) {
					el.style.left = (1 - t) * (backward ? -1 : 1) * w + 'px';
				},
				onFinish: onFinish
			}).seekTo(1);
		} else {
			onFinish();
		}
	}
	
	this.fadeOut = function(dontAnimate) {
		var view = this._stack[this._stack.length - 1],
			el = this.getElement();
		
		if (view) { view.onBeforeHide(); }
		
		var onFinish = bind(this, function() {
			this._parent = el.parentNode;
			$.remove(el);
			if (view) { view.onHide(); }
		});
		
		if (!dontAnimate) {
			new Animation({
				duration: 250,
				subject: function(t) {
					$.style(el, {opacity: 1 - t});
				},
				onFinish: onFinish
			}).seekTo(1);
		} else {
			onFinish();
		}
	}

	this.fadeIn = function(dontAnimate) {
		var view = this._stack[this._stack.length - 1],
			el = this.getElement(),
			onFinish = function() {
				$.style(el, {opacity: 1});
				if (view) { view.onShow(); }
			};
		
		$.style(el, {opacity: 0});
		this._parent.appendChild(el);
		
		if (view) { view.onBeforeShow(); }
		if (!dontAnimate) {
			new Animation({
				duration: 250,
				subject: function(t) {
					$.style(el, {opacity: t});
				},
				onFinish: onFinish
			}).seekTo(1);
		} else {
			onFinish();
		}
	}
	
	this.popTo = function(view, dontAnimate) {
		var n = this._stack.length;
		if (n && this._stack[n - 1] != view) {
			this.subscribeOnce('DidPop', this, 'popTo', view, dontAnimate);
			this.pop(dontAnimate);
		}
	}
	
	this.pop = function(dontAnimate) {
		if (!this._stack.length) { return false; }
		
		var view = this._stack.pop();
		this._hide(view, dontAnimate, true);
		
		if (this._stack.length) {
			this._show(this._stack[this._stack.length - 1], dontAnimate, true);
		}
		
		return view;
	}
	
	this.popAll = function(dontAnimate) {
		while (this._stack[1]) {
			this.pop(dontAnimate);
		}
	}
});