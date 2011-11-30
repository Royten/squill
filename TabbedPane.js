"use import";

from util.browser import $;
import .Widget;
import lib.sort;

var TabbedPane = exports = Class(Widget, function(supr) {	
	this.init = function(opts) {
		opts = opts || {};

		var paneClassName = (opts.paneClassName === undefined) ? 'tabbedPane' : opts.paneClassName,
			containerWrapperClassName = (opts.containerWrapperClassName === undefined) ? 'tabContainerWrapper' : opts.containerWrapperClassName,
			contentsWrapperClassName = (opts.contentsWrapperClassName === undefined) ? 'tabContentsWrapper' : opts.contentsWrapperClassName,
			tabContainerClassName = (opts.tabContainerClassName === undefined) ? 'tabContainer' : opts.tabContainerClassName;

		this._def = {
			className: paneClassName,
			children: [
				{className: containerWrapperClassName, children: [
					{id: 'tabContainer', className: tabContainerClassName}
				]},
				{className: contentsWrapperClassName, children: [
					{id: 'content', className: 'tabContents'}
				]}
			]
		};

		this._panes = [];
		supr(this, 'init', arguments);
	}
	
	this.buildWidget = function() { this._container = this.content; }
	this.getContainer = function() { return this._container || this._el; }
	
	this.addWidget = function(def, target) {
		var el = supr(this, 'addWidget', arguments);
		
		if (el instanceof exports.Pane) {
			this._addPane(el);
			el.hide(); // hack for now!
		}
		
		return el;
	}
	
	this.newPane = function(def) {
		var pane = new exports.Pane(def);
		this.addWidget(pane);
		return pane;
	}
	
	this._addPane = function(pane) {
		var title = pane.getTitle();
		if (title) {
			this._panes[title] = pane;
		}
		
		this._panes.push(pane);
		lib.sort(this._panes, function(pane) { return pane._sortIndex; });
		this.tabContainer.appendChild(pane.tab);
		$.onEvent(pane.tab, 'mousedown', this, 'showPane', pane);
		if (!this._selectedTab) { this.showPane(pane); }
		return this;
	}
	
	this.getTabs = function() { return this._tabs; }
	this.getPanes = function() { return this._panes; }
	
	this.write = function(buffer) {
		this._currentPane.innerHTML = String(buffer);
	}
	
	this.selectPane = this.showPane = function(pane) {
		var tab = pane.tab;
		$.removeClass(this._selectedTab, 'selected');
		$.addClass(tab, 'selected');
		this._selectedTab = tab;
		if (this._selectedPane) { this._selectedPane.hide(); }
		
		this._selectedPane = pane;
		pane.show();
		this.publish('ShowPane', pane);
	}
});

exports.Pane = Class(Widget, function(supr) {
	var sortID = 0;

	this.getTitle = function() { return this._opts.title; }
	this.init = function(opts) {
		this._sortIndex = ++sortID;

		this._def = {
			className: (opts.tabPaneClassName === undefined) ? 'tabPane' : opts.tabPaneClassName,
			style: {
				display: 'none'
			}
		}

		this.tab =  $({
			text: opts.title,
			tagName: 'a',
			className: 'tab'
		});
		
		supr(this, 'init', arguments);
	}
	
	this.setSortIndex = function(sortIndex) { this._sortIndex = sortIndex; }
});
