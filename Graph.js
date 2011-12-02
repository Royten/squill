"use import";

from util.browser import $;
import .Widget;

var Graph = exports = Class(Widget, function(supr) {
	this._css = 'cnvs';
	this._type = 'canvas';
	
	this.init = function(opts) {
		params = merge(opts, {tag: 'canvas'});
		supr(this, 'init', arguments);

		this.setSettings(opts.settings || {});

		this._width = opts.width || 400;
		this._height = opts.height || 400;
	};

	this.buildWidget = function() {
		var el = this._el;

		this.initMouseEvents(el);
		this.initKeyEvents(el);
	};

	this._renderBackground = function(ctx) {
		var el = this._el,
			width = el.width,
			height = el.height;

		this._currentWidth = width;
		this._currentHeight = height;

		ctx.fillStyle = this._settings.fillColor;
		ctx.fillRect(0, 0, width, height);
	};

	this._calculateSegments = function(ctx, data) {
		var max = 0,
			maxLabel = 0,
			i, j = data.length,
			k, l;

		for (i = 0; i < j; i++) {
			item = data[i];
			maxLabel = Math.max(ctx.measureText(item.title).width, maxLabel);
			for (k = 0, l = item.points.length; k < l; k++) {
				max = Math.max(item.points[k], max);
			}
		}

		var steps = [0.5, 0.25, 0.2, 0.1],
			stepIndex = 0,
			stepCount,
			factor = 1;

		while (max / (steps[stepIndex] * factor) > 10) {
			stepIndex++;
			if (stepIndex >= steps.length) {
				stepIndex = 0;
				factor *= 10;
			}
		}

		stepCount = Math.ceil(max / (steps[stepIndex] * factor));
		return {
			steps: stepCount,
			step: steps[stepIndex],
			max: stepCount * steps[stepIndex] * factor,
			maxLabel: maxLabel + 4,
			factor: factor
		}
	};

	this._renderHorizontalAxis = function(segmentInfo, ctx, data) {
		var settings = this._settings,
			valueSpace = settings.valueSpace,
			mainPadding = settings.mainPadding,
			width = this._currentWidth - mainPadding * 2 - valueSpace,
			height = this._currentHeight - mainPadding * 2 - segmentInfo.maxLabel,
			step = width / data.length,
			label,
			hasDecimal,
			x, y,
			i, j;

		ctx.strokeStyle = '#F8F8F8';
		for (i = 0; i < 2; i++) {
			x = valueSpace + mainPadding + 0.5 + i * width;
			ctx.beginPath();
			ctx.moveTo(x, mainPadding);
			ctx.lineTo(x, mainPadding + height);
			ctx.stroke();
		}

		ctx.textAlign = 'right';
		ctx.textBaseline = 'top';

		for (i = 0, j = data.length; i < j; i++) {
			x = valueSpace + mainPadding + i * step;
			ctx.fillStyle = '#000000';
			ctx.save();
			ctx.rotate(Math.PI * -0.5);
			ctx.fillText(data[i].title, -(mainPadding + height + 4), x);
			ctx.restore();
			if ((i & 1) === 0) {
				ctx.fillStyle = '#F8F8F8';
				ctx.fillRect(x, mainPadding, step, height);
			}
		}

		ctx.strokeStyle = '#000000';
		ctx.fillStyle = '#000000';

		hasDecimal = false;
		i = height;
		j = 0;
		while (i >= 0) {
			label = (j * segmentInfo.step).toString(10);
			if (label.indexOf('.') !== -1) {
				hasDecimal = true;
				break;
			}
			i = Math.ceil(i - height / segmentInfo.steps);
			j++;
		}

		i = height;
		j = 0;
		while (i >= 0) {
			x = mainPadding + valueSpace;
			y = mainPadding + ~~i + 0.5;
			ctx.beginPath();
			ctx.moveTo(x, y);
			ctx.lineTo(x + width, y);
			ctx.stroke();

			label = (j * segmentInfo.step).toString(10);
			if (hasDecimal && (label.indexOf('.') === -1)) {
				label += '.0';
			}
			ctx.fillText(label, valueSpace + mainPadding - 2, mainPadding + i - 8);

			i = Math.ceil(i - height / segmentInfo.steps);
			j++;
		}

		ctx.textAlign = 'left';

		label = 'x' + segmentInfo.factor;

		i = mainPadding;
		j = mainPadding + height / 2 + (ctx.measureText(label).width + 30) / 2;
		ctx.save();
		ctx.rotate(Math.PI * -0.5);
		ctx.fillText(label, -j - 30, i);
		ctx.restore();

		j -= ctx.measureText(label).width;
		ctx.beginPath();
		ctx.moveTo(i + 7.5, j);
		ctx.lineTo(i + 7.5, j + 26);
		ctx.stroke();

		ctx.beginPath();
		ctx.moveTo(i + 3.5, j + 5.5);
		ctx.lineTo(i + 7.5, j);
		ctx.lineTo(i + 11.5, j + 5.5);
		ctx.stroke();
	};

	this._renderVerticalBars = function(segmentInfo, ctx, data) {
		var settings = this._settings,
			valueSpace = settings.valueSpace,
			mainPadding = settings.mainPadding,
			width = this._currentWidth - mainPadding * 2 - valueSpace,
			height = this._currentHeight - mainPadding * 2 - segmentInfo.maxLabel,
			step = width / data.length,
			barWidth = step - settings.barPadding * 2,
			barWidthSeg,
			barHeight,
			barX,
			item,
			points,
			i, j, k, l;

		ctx.globalAlpha = 0.9;
		for (i = 0, j = data.length; i < j; i++) {
			item = data[i];
			points = item.points;

			l = points.length;
			barWidthSeg = ~~(barWidth / l);
			for (k = 0; k < l; k++) {
				barHeight = item.points[k] / segmentInfo.max * height;
				barX = valueSpace + mainPadding + i * step + settings.barPadding;
				barY = mainPadding + height - barHeight;

				ctx.fillStyle = settings.dataColors[k % settings.dataColors.length];
				ctx.fillRect(barX + k * barWidthSeg, barY, barWidthSeg - 1, barHeight);
			}
		}
		ctx.globalAlpha = 1;
	};

	this._renderVerticalPoints = function(segmentInfo, ctx, data) {
		var settings = this._settings,
			renderPoints = (settings.types.indexOf('points') !== -1),
			renderLines = (settings.types.indexOf('lines') !== -1),
			renderArea = (settings.types.indexOf('area') !== -1),
			valueSpace = settings.valueSpace,
			mainPadding = settings.mainPadding,
			width = this._currentWidth - mainPadding * 2 - valueSpace,
			height = this._currentHeight - mainPadding * 2 - segmentInfo.maxLabel,
			step = width / data.length,
			pointWidth = step - settings.barPadding * 2,
			pointX, pointY,
			points,
			point,
			pointList = [],
			hasLast,
			item,
			i, j, k, l;

		pointYLast = null;

		for (i = 0, j = data.length; i < j; i++) {
			item = data[i];
			points = item.points;

			hasLast = pointYLast !== null;
			if (pointYLast === null) {
				pointYLast = [];
			}
			pointX = ~~(valueSpace + mainPadding + i * step + settings.barPadding + (pointWidth / 2));
			for (k = 0, l = points.length; k < l; k++) {
				pointY = ~~(mainPadding + height - item.points[k] / segmentInfo.max * height);

				if (!pointList[k]) {
					pointList[k] = [];
				}
				pointList[k].push({x: pointX, y: pointY});

				ctx.strokeStyle = settings.dataColors[k % settings.dataColors.length];
				if (renderPoints) {
					ctx.strokeRect(pointX - 4.5, pointY - 4.5, 10, 10);
				}

				if (hasLast && renderLines) {
					ctx.beginPath();
					ctx.moveTo(pointXLast, pointYLast[k]);
					ctx.lineTo(pointX, pointY);
					ctx.stroke();
				}

				pointYLast[k] = pointY;
			}
			pointXLast = pointX;
		}

		if (renderArea) {
			ctx.globalAlpha = 0.05;
			for (i = 0, j = pointList.length; i < j; i++) {
				ctx.beginPath();
				ctx.lineTo(pointList[i][0].x, mainPadding + height);
				for (k = 0, l = pointList[i].length; k < l; k++) {
					point = pointList[i][k];
					ctx.lineTo(point.x, point.y);
				}
				ctx.lineTo(pointList[i][l - 1].x, mainPadding + height);
				ctx.closePath();
				ctx.fillStyle = settings.dataColors[i % settings.dataColors.length];
				ctx.fill();
			}
			ctx.globalAlpha = 1;
		}
	};

	this._renderVerticalAxis = function(segmentInfo, ctx, data) {
		var settings = this._settings,
			valueSpace = settings.valueSpace,
			mainPadding = settings.mainPadding,
			width = this._currentWidth - mainPadding * 2 - segmentInfo.maxLabel,
			height = this._currentHeight - mainPadding * 2 - valueSpace,
			step = height / data.length,
			label,
			hasDecimal,
			x, y,
			i, j;

		ctx.strokeStyle = '#F8F8F8';
		for (i = 0; i < 2; i++) {
			y = mainPadding + 0.5 + i * height;
			ctx.beginPath();
			ctx.moveTo(mainPadding + segmentInfo.maxLabel, y);
			ctx.lineTo(mainPadding + segmentInfo.maxLabel + width, y);
			ctx.stroke();
		}

		ctx.textAlign = 'right';
		ctx.textBaseline = 'top';

		for (i = 0, j = data.length; i < j; i++) {
			y = mainPadding + i * step;
			ctx.fillStyle = '#000000';
			ctx.fillText(data[i].title, mainPadding + segmentInfo.maxLabel - 4, y + 4);
			if ((i & 1) === 0) {
				ctx.fillStyle = '#F8F8F8';
				ctx.fillRect(mainPadding + segmentInfo.maxLabel, y, width, step);
			}
		}

		ctx.textAlign = 'center';

		ctx.strokeStyle = '#000000';
		ctx.fillStyle = '#000000';

		hasDecimal = false;
		i = 0;
		j = 0;
		while (i <= width) {
			label = (j * segmentInfo.step).toString(10);
			if (label.indexOf('.') !== -1) {
				hasDecimal = true;
				break;
			}

			i = Math.floor(i + width / segmentInfo.steps);
			j++;
		}

		i = 0;
		j = 0;
		while (i <= width) {
			x = mainPadding + segmentInfo.maxLabel + ~~i + 0.5;
			y = mainPadding;
			ctx.beginPath();
			ctx.moveTo(x, y);
			ctx.lineTo(x, y + height);
			ctx.stroke();

			label = (j * segmentInfo.step).toString(10);
			if (hasDecimal && (label.indexOf('.') === -1)) {
				label += '.0';
			}
			ctx.fillText(label, mainPadding + segmentInfo.maxLabel + i, mainPadding + height + 2);

			i = Math.floor(i + width / segmentInfo.steps);
			j++;
		}

		ctx.textAlign = 'left';

		label = 'x' + segmentInfo.factor;

		i = mainPadding + width / 2 - (ctx.measureText(label).width + 30) / 2 + segmentInfo.maxLabel;
		j = mainPadding + height + 18;
		ctx.fillText(label, i, j);

		i += ctx.measureText(label).width;
		ctx.beginPath();
		ctx.moveTo(i + 4, j + 7.5);
		ctx.lineTo(i + 30, j + 7.5);
		ctx.stroke();

		ctx.beginPath();
		ctx.moveTo(i + 26, j + 3.5);
		ctx.lineTo(i + 30, j + 7.5);
		ctx.lineTo(i + 26, j + 11.5);
		ctx.stroke();
	}

	this._renderHorizontalBars = function(segmentInfo, ctx, data) {
		var settings = this._settings,
			valueSpace = settings.valueSpace,
			mainPadding = settings.mainPadding,
			width = this._currentWidth - mainPadding * 2 - segmentInfo.maxLabel,
			height = this._currentHeight - mainPadding * 2 - valueSpace,
			step = height / data.length,
			barWidth,
			barHeight = step - settings.barPadding * 2,
			barHeightSeg,
			barX, barY,
			item,
			points,
			i, j, k, l;

		ctx.globalAlpha = 0.9;
		for (i = 0, j = data.length; i < j; i++) {
			item = data[i];
			points = item.points;

			l = points.length;
			barHeightSeg = ~~(barHeight / l);
			for (k = 0; k < l; k++) {
				barWidth = ~~(item.points[k] / segmentInfo.max * width);
				barX = segmentInfo.maxLabel + mainPadding;
				barY = ~~mainPadding + i * step + settings.barPadding;

				ctx.fillStyle = settings.dataColors[k % settings.dataColors.length];
				ctx.fillRect(barX, barY + k * barHeightSeg, barWidth, barHeightSeg - 1);
			}
		}
		ctx.globalAlpha = 1;
	};

	this._renderHorizontalPoints = function(segmentInfo, ctx, data) {
		var settings = this._settings,
			renderPoints = (settings.types.indexOf('points') !== -1),
			renderLines = (settings.types.indexOf('lines') !== -1),
			renderArea = (settings.types.indexOf('area') !== -1),
			valueSpace = settings.valueSpace,
			mainPadding = settings.mainPadding,
			width = this._currentWidth - mainPadding * 2 - segmentInfo.maxLabel,
			height = this._currentHeight - mainPadding * 2 - valueSpace,
			step = height / data.length,
			pointHeight = step - settings.barPadding * 2,
			pointX, pointY,
			points,
			point,
			pointList = [],
			hasLast,
			item,
			i, j, k, l;

		pointXLast = null;

		for (i = 0, j = data.length; i < j; i++) {
			item = data[i];
			points = item.points;

			hasLast = pointXLast !== null;
			if (pointXLast === null) {
				pointXLast = [];
			}
			pointY = ~~(mainPadding + i * step + settings.barPadding + pointHeight / 2);
			for (k = 0, l = points.length; k < l; k++) {
				pointX = ~~(mainPadding + item.points[k] / segmentInfo.max * width + segmentInfo.maxLabel);

				if (!pointList[k]) {
					pointList[k] = [];
				}
				pointList[k].push({x: pointX, y: pointY});

				ctx.strokeStyle = settings.dataColors[k % settings.dataColors.length];
				if (renderPoints) {
					ctx.strokeRect(pointX - 4.5, pointY - 4.5, 10, 10);
				}

				if (hasLast && renderLines) {
					ctx.beginPath();
					ctx.moveTo(pointXLast[k], pointYLast);
					ctx.lineTo(pointX, pointY);
					ctx.stroke();
				}

				pointXLast[k] = pointX;
			}
			pointYLast = pointY;
		}

		if (renderArea) {
			ctx.globalAlpha = 0.05;
			for (i = 0, j = pointList.length; i < j; i++) {
				ctx.beginPath();
				ctx.moveTo(mainPadding + segmentInfo.maxLabel, pointList[i][0].y);
				for (k = 0, l = pointList[i].length; k < l; k++) {
					point = pointList[i][k];
					ctx.lineTo(point.x, point.y);
				}
				ctx.lineTo(mainPadding + segmentInfo.maxLabel, pointList[i][l - 1].y);
				ctx.closePath();
				ctx.fillStyle = settings.dataColors[i % settings.dataColors.length];
				ctx.fill();
			}
			ctx.globalAlpha = 1;
		}
	};

	this.setData = function(data) {
		var el = this._el,
			ctx = el.getContext('2d'),
			settings = this._settings,
			types = settings.types,
			axisRenderMethod = function() {},
			barsRenderMethod = function() {},
			pointsRenderMethod = function() {},
			segmentInfo;

		switch (settings.orientation) {
			case 'horizontal':
				el.width = this._width;
				el.height = data.length * 30 + this._settings.valueSpace;
				axisRenderMethod = bind(this, this._renderVerticalAxis);
				barsRenderMethod = bind(this, this._renderHorizontalBars);
				pointsRenderMethod = bind(this, this._renderHorizontalPoints);
				break;

			case 'vertical':
				el.width = data.length * 30 + this._settings.valueSpace;
				el.height = this._height;
				axisRenderMethod = bind(this, this._renderHorizontalAxis);
				barsRenderMethod = bind(this, this._renderVerticalBars);
				pointsRenderMethod = bind(this, this._renderVerticalPoints);
				break;
		}

		ctx.font = '13px Verdana';

		this._renderBackground(ctx);

		if (data.length) {
			segmentInfo = this._calculateSegments(ctx, data);

			axisRenderMethod(segmentInfo, ctx, data);

			if ((types.indexOf('points') !== -1) || (types.indexOf('area') !== -1) || (types.indexOf('lines') !== -1)) {
				pointsRenderMethod(segmentInfo, ctx, data);
			}
			if (types.indexOf('bars') !== -1) {
				barsRenderMethod(segmentInfo, ctx, data);
			}
		}
	};

	this.setSettings = function(settings) {
		settings.fillColor = settings.fillColor || '#FFFFFF';
		settings.orientation = settings.oriantation || 'horizontal';
		settings.types = settings.types || 'lines';
		settings.barPadding = settings.barPadding || 2;
		settings.mainPadding = settings.mainPadding || 10;
		settings.valueSpace = settings.valueSpace || 40;
		settings.dataColors = settings.dataColors || ['#DD0000', '#00DD00', '#0000DD'];

		this._settings = settings;
	};
});
