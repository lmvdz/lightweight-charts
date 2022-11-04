/*!
 * @license
 * TradingView Lightweight Charts v3.8.0-dev+202211041912
 * Copyright (c) 2020 TradingView, Inc.
 * Licensed under Apache License 2.0 https://www.apache.org/licenses/LICENSE-2.0
 */
(function () {
    'use strict';

    var Point = /** @class */ (function () {
        function Point(x, y) {
            this.x = x;
            this.y = y;
        }
        Point.prototype.add = function (point) {
            return new Point(this.x + point.x, this.y + point.y);
        };
        Point.prototype.addScaled = function (point, scale) {
            return new Point(this.x + scale * point.x, this.y + scale * point.y);
        };
        Point.prototype.subtract = function (point) {
            return new Point(this.x - point.x, this.y - point.y);
        };
        Point.prototype.dotProduct = function (point) {
            return this.x * point.x + this.y * point.y;
        };
        Point.prototype.crossProduct = function (point) {
            return this.x * point.y - this.y * point.x;
        };
        Point.prototype.signedAngle = function (point) {
            return Math.atan2(this.crossProduct(point), this.dotProduct(point));
        };
        Point.prototype.angle = function (point) {
            return Math.acos(this.dotProduct(point) / (this.length() * point.length()));
        };
        Point.prototype.length = function () {
            return Math.sqrt(this.x * this.x + this.y * this.y);
        };
        Point.prototype.scaled = function (scale) {
            return new Point(this.x * scale, this.y * scale);
        };
        Point.prototype.normalized = function () {
            return this.scaled(1 / this.length());
        };
        Point.prototype.transposed = function () {
            return new Point(-this.y, this.x);
        };
        Point.prototype.clone = function () {
            return new Point(this.x, this.y);
        };
        return Point;
    }());
    var Box = /** @class */ (function () {
        function Box(a, b) {
            this._internal_min = new Point(Math.min(a.x, b.x), Math.min(a.y, b.y));
            this._internal_max = new Point(Math.max(a.x, b.x), Math.max(a.y, b.y));
        }
        return Box;
    }());
    var HalfPlane = /** @class */ (function () {
        function HalfPlane(edge, isPositive) {
            this._internal_edge = edge;
            this._internal_isPositive = isPositive;
        }
        return HalfPlane;
    }());
    function equalPoints(a, b) {
        return a.x === b.x && a.y === b.y;
    }
    function line(a, b, c) {
        return { _internal_a: a, _internal_b: b, _internal_c: c };
    }
    function lineThroughPoints(a, b) {
        if (equalPoints(a, b)) {
            throw new Error('Points should be distinct');
        }
        return line(a.y - b.y, b.x - a.x, a.x * b.y - b.x * a.y);
    }
    function lineSegment(a, b) {
        if (equalPoints(a, b)) {
            throw new Error('Points of a segment should be distinct');
        }
        return [a, b];
    }
    function halfPlaneThroughPoint(edge, point) {
        return new HalfPlane(edge, edge._internal_a * point.x + edge._internal_b * point.y + edge._internal_c > 0);
    }
    function pointInHalfPlane(point, halfPlane) {
        var edge = halfPlane._internal_edge;
        return edge._internal_a * point.x + edge._internal_b * point.y + edge._internal_c > 0 === halfPlane._internal_isPositive;
    }

    function addPoint(array, point) {
        for (var i = 0; i < array.length; i++) {
            if (equalPoints(array[i], point)) {
                return false;
            }
        }
        array.push(point);
        return true;
    }
    function intersectLineAndBox(line, box) {
        if (line._internal_a === 0) {
            var l = -line._internal_c / line._internal_b;
            return box._internal_min.y <= l && l <= box._internal_max.y ? lineSegment(new Point(box._internal_min.x, l), new Point(box._internal_max.x, l)) : null;
        }
        if (line._internal_b === 0) {
            var h = -line._internal_c / line._internal_a;
            return box._internal_min.x <= h && h <= box._internal_max.x ? lineSegment(new Point(h, box._internal_min.y), new Point(h, box._internal_max.y)) : null;
        }
        var points = [];
        var u = function (value) {
            var i = -(line._internal_c + line._internal_a * value) / line._internal_b;
            if (box._internal_min.y <= i && i <= box._internal_max.y) {
                addPoint(points, new Point(value, i));
            }
        };
        var p = function (value) {
            var s = -(line._internal_c + line._internal_b * value) / line._internal_a;
            if (box._internal_min.x <= s && s <= box._internal_max.x) {
                addPoint(points, new Point(s, value));
            }
        };
        u(box._internal_min.x);
        p(box._internal_min.y);
        u(box._internal_max.x);
        p(box._internal_max.y);
        switch (points.length) {
            case 0:
                return null;
            case 1:
                return points[0];
            case 2:
                return equalPoints(points[0], points[1]) ? points[0] : lineSegment(points[0], points[1]);
        }
        throw new Error('We should have at most two intersection points');
    }
    function intersectRayAndBox(point0, point1, box) {
        var s = intersectLineSegments(point0, point1, box._internal_min, new Point(box._internal_max.x, box._internal_min.y));
        var n = intersectLineSegments(point0, point1, new Point(box._internal_max.x, box._internal_min.y), box._internal_max);
        var a = intersectLineSegments(point0, point1, box._internal_max, new Point(box._internal_min.x, box._internal_max.y));
        var c = intersectLineSegments(point0, point1, new Point(box._internal_min.x, box._internal_max.y), box._internal_min);
        var h = [];
        if (null !== s && s >= 0) {
            h.push(s);
        }
        if (null !== n && n >= 0) {
            h.push(n);
        }
        if (null !== a && a >= 0) {
            h.push(a);
        }
        if (null !== c && c >= 0) {
            h.push(c);
        }
        if (0 === h.length) {
            return null;
        }
        h.sort(function (e, t) { return e - t; });
        var d = pointInBox(point0, box) ? h[0] : h[h.length - 1];
        return point0.addScaled(point1.subtract(point0), d);
    }
    function intersectLineSegments(point0, point1, point2, point3) {
        var z = (function (e, t, i, s) {
            var r = t.subtract(e);
            var n = s.subtract(i);
            var o = r.x * n.y - r.y * n.x;
            if (Math.abs(o) < 1e-6) {
                return null;
            }
            var a = e.subtract(i);
            return (a.y * n.x - a.x * n.y) / o;
        })(point0, point1, point2, point3);
        if (null === z) {
            return null;
        }
        var o = point1.subtract(point0).scaled(z).add(point0);
        var a = distanceToSegment(point2, point3, o);
        return Math.abs(a._internal_distance) < 1e-6 ? z : null;
    }
    function intersectLineSegmentAndBox(segment, box) {
        var i = segment[0].x;
        var s = segment[0].y;
        var n = segment[1].x;
        var o = segment[1].y;
        var a = box._internal_min.x;
        var l = box._internal_min.y;
        var c = box._internal_max.x;
        var h = box._internal_max.y;
        function d(n1, n2, n3, n4, n5, n6) {
            var z = 0;
            if (n1 < n3) {
                z |= 1;
            }
            else if (n1 > n5) {
                z |= 2;
            }
            if (n2 < n4) {
                z |= 4;
            }
            else if (n2 > n6) {
                z |= 8;
            }
            return z;
        }
        var check = false;
        for (var u = d(i, s, a, l, c, h), p = d(n, o, a, l, c, h), m = 0;;) {
            if (m > 1e3) {
                throw new Error('Cohen - Sutherland algorithm: infinity loop');
            }
            m++;
            if (!(u | p)) {
                check = true;
                break;
            }
            if (u & p) {
                break;
            }
            var g = u || p;
            var f = void 0;
            var v = void 0;
            if (8 & g) {
                f = i + (n - i) * (h - s) / (o - s);
                v = h;
            }
            else if (4 & g) {
                f = i + (n - i) * (l - s) / (o - s);
                v = l;
            }
            else if (2 & g) {
                v = s + (o - s) * (c - i) / (n - i);
                f = c;
            }
            else {
                v = s + (o - s) * (a - i) / (n - i);
                f = a;
            }
            if (g === u) {
                i = f;
                s = v;
                u = d(i, s, a, l, c, h);
            }
            else {
                n = f;
                o = v;
                p = d(n, o, a, l, c, h);
            }
        }
        return check ? equalPoints(new Point(i, s), new Point(n, o)) ? new Point(i, s) : lineSegment(new Point(i, s), new Point(n, o)) : null;
    }
    function distanceToLine(point0, point1, point2) {
        var s = point1.subtract(point0);
        var r = point2.subtract(point0).dotProduct(s) / s.dotProduct(s);
        return { _internal_coeff: r, _internal_distance: point0.addScaled(s, r).subtract(point2).length() };
    }
    function distanceToSegment(point0, point1, point2) {
        var lineDist = distanceToLine(point0, point1, point2);
        if (0 <= lineDist._internal_coeff && lineDist._internal_coeff <= 1) {
            return lineDist;
        }
        var n = point0.subtract(point2).length();
        var o = point1.subtract(point2).length();
        return n < o ? { _internal_coeff: 0, _internal_distance: n } : { _internal_coeff: 1, _internal_distance: o };
    }
    function pointInBox(point, box) {
        return point.x >= box._internal_min.x && point.x <= box._internal_max.x && point.y >= box._internal_min.y && point.y <= box._internal_max.y;
    }
    function pointInPolygon(point, polygon) {
        var x = point.x;
        var y = point.y;
        var isInside = false;
        for (var j = polygon.length - 1, i = 0; i < polygon.length; i++) {
            var curr = polygon[i];
            var prev = polygon[j];
            j = i;
            if ((curr.y < y && prev.y >= y || prev.y < y && curr.y >= y) && curr.x + (y - curr.y) / (prev.y - curr.y) * (prev.x - curr.x) < x) {
                isInside = !isInside;
            }
        }
        return isInside;
    }
    function pointInTriangle(point, end0, end1, end2) {
        var middle = end0.add(end1).scaled(0.5).add(end2).scaled(0.5);
        return intersectLineSegments(end0, end1, middle, point) === null
            && intersectLineSegments(end1, end2, middle, point) === null
            && intersectLineSegments(end2, end0, middle, point) === null;
    }
    function intersectLines(line0, line1) {
        var c = line0._internal_a * line1._internal_b - line1._internal_a * line0._internal_b;
        if (Math.abs(c) < 1e-6) {
            return null;
        }
        var x = (line0._internal_b * line1._internal_c - line1._internal_b * line0._internal_c) / c;
        var y = (line1._internal_a * line0._internal_c - line0._internal_a * line1._internal_c) / c;
        return new Point(x, y);
    }
    function intersectPolygonAndHalfPlane(points, halfPlane) {
        var intersectionPoints = [];
        for (var i = 0; i < points.length; ++i) {
            var current = points[i];
            var next = points[(i + 1) % points.length];
            var line = lineThroughPoints(current, next);
            if (pointInHalfPlane(current, halfPlane)) {
                addPointToPointsSet(intersectionPoints, current);
                if (!pointInHalfPlane(next, halfPlane)) {
                    var lineIntersection = intersectLines(line, halfPlane._internal_edge);
                    if (lineIntersection !== null) {
                        addPointToPointsSet(intersectionPoints, lineIntersection);
                    }
                }
            }
            else if (pointInHalfPlane(next, halfPlane)) {
                var lineIntersection = intersectLines(line, halfPlane._internal_edge);
                if (lineIntersection !== null) {
                    addPointToPointsSet(intersectionPoints, lineIntersection);
                }
            }
        }
        return intersectionPoints.length >= 3 ? intersectionPoints : null;
    }
    function addPointToPointsSet(points, point) {
        if (points.length <= 0 || !(equalPoints(points[points.length - 1], point) && equalPoints(points[0], point))) {
            points.push(point);
            return false;
        }
        return true;
    }
    function pointInCircle(point, edge0, distance) {
        return (point.x - edge0.x) * (point.x - edge0.x) + (point.y - edge0.y) * (point.y - edge0.y) <= distance * distance;
    }

    /**
     * Represents the possible line types.
     */
    var LineType;
    (function (LineType) {
        /**
         * A line.
         */
        LineType[LineType["Simple"] = 0] = "Simple";
        /**
         * A stepped line.
         */
        LineType[LineType["WithSteps"] = 1] = "WithSteps";
        /**
         * A stepped line.
         */
        LineType[LineType["WithStepsUpsideDown"] = 2] = "WithStepsUpsideDown";
    })(LineType || (LineType = {}));
    /**
     * Represents the possible line caps.
     */
    var LineEnd;
    (function (LineEnd) {
        /**
         * No cap.
         */
        LineEnd[LineEnd["Normal"] = 0] = "Normal";
        /**
         * Arrow cap.
         */
        LineEnd[LineEnd["Arrow"] = 1] = "Arrow";
        /**
         * Circle cap.
         */
        LineEnd[LineEnd["Circle"] = 2] = "Circle";
    })(LineEnd || (LineEnd = {}));
    /**
     * Represents the possible line styles.
     */
    var LineStyle;
    (function (LineStyle) {
        /**
         * A solid line.
         */
        LineStyle[LineStyle["Solid"] = 0] = "Solid";
        /**
         * A dotted line.
         */
        LineStyle[LineStyle["Dotted"] = 1] = "Dotted";
        /**
         * A dashed line.
         */
        LineStyle[LineStyle["Dashed"] = 2] = "Dashed";
        /**
         * A dashed line with bigger dashes.
         */
        LineStyle[LineStyle["LargeDashed"] = 3] = "LargeDashed";
        /**
         * A dottled line with more space between dots.
         */
        LineStyle[LineStyle["SparseDotted"] = 4] = "SparseDotted";
        /**
         * A dashed line with less space between dots.
         */
        LineStyle[LineStyle["SmallDashed"] = 5] = "SmallDashed";
    })(LineStyle || (LineStyle = {}));
    function computeDashPattern(ctx) {
        return [
            [ctx.lineWidth, 2 * ctx.lineWidth],
            [5 * ctx.lineWidth, 6 * ctx.lineWidth],
            [6 * ctx.lineWidth, 6 * ctx.lineWidth],
            [ctx.lineWidth, 4 * ctx.lineWidth],
            [2 * ctx.lineWidth, ctx.lineWidth],
        ][ctx.lineStyle - 1] || [];
    }
    function setLineStyle(ctx, style) {
        ctx.lineStyle = style;
        var dashPattern = computeDashPattern(ctx);
        setLineDash(ctx, dashPattern);
    }
    function setLineDash(ctx, dashPattern) {
        if (ctx.setLineDash) {
            ctx.setLineDash(dashPattern);
        }
        else if (ctx.mozDash !== undefined) {
            ctx.mozDash = dashPattern;
        }
        else if (ctx.webkitLineDash !== undefined) {
            ctx.webkitLineDash = dashPattern;
        }
    }
    function drawHorizontalLine(ctx, y, left, right) {
        ctx.beginPath();
        var correction = (ctx.lineWidth % 2) ? 0.5 : 0;
        ctx.moveTo(left, y + correction);
        ctx.lineTo(right, y + correction);
        ctx.stroke();
    }
    function drawVerticalLine(ctx, x, top, bottom) {
        ctx.beginPath();
        var correction = (ctx.lineWidth % 2) ? 0.5 : 0;
        ctx.moveTo(x + correction, top);
        ctx.lineTo(x + correction, bottom);
        ctx.stroke();
    }
    function drawSolidLine(ctx, x1, y1, x2, y2) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }
    function drawDashedLine(ctx, x1, y1, x2, y2) {
        ctx.save();
        ctx.beginPath();
        var dashPattern = computeDashPattern(ctx);
        setLineDash(ctx, dashPattern);
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.restore();
    }
    function drawLine(ctx, x1, y1, x2, y2) {
        if (!isFinite(x1) || !isFinite(y1) || !isFinite(x2) || !isFinite(y2)) {
            return;
        }
        if (ctx.lineStyle !== 0 /* Solid */) {
            drawDashedLine(ctx, x1, y1, x2, y2);
        }
        else {
            drawSolidLine(ctx, x1, y1, x2, y2);
        }
    }
    function strokeInPixel(ctx, drawFunction) {
        ctx.save();
        if (ctx.lineWidth % 2) {
            ctx.translate(0.5, 0.5);
        }
        drawFunction();
        ctx.restore();
    }
    function extendAndClipLineSegment(point0, point1, width, height, extendLeft, extendRight) {
        if (equalPoints(point0, point1)) {
            return null;
        }
        var topLeft = new Point(0, 0);
        var bottomRight = new Point(width, height);
        if (extendLeft) {
            if (extendRight) {
                var points = intersectLineAndBox(lineThroughPoints(point0, point1), new Box(topLeft, bottomRight));
                return Array.isArray(points) ? points : null;
            }
            else {
                var point = intersectRayAndBox(point1, point0, new Box(topLeft, bottomRight));
                return point === null || equalPoints(point1, point) ? null : lineSegment(point1, point);
            }
        }
        if (extendRight) {
            var point = intersectRayAndBox(point0, point1, new Box(topLeft, bottomRight));
            return point === null || equalPoints(point0, point) ? null : lineSegment(point0, point);
        }
        else {
            var points = intersectLineSegmentAndBox(lineSegment(point0, point1), new Box(topLeft, bottomRight));
            return Array.isArray(points) ? points : null;
        }
    }
    function drawCircleEnd(point, ctx, width, pixelRatio) {
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(point.x * pixelRatio, point.y * pixelRatio, width * pixelRatio, 0, 2 * Math.PI, false);
        ctx.fill();
        ctx.restore();
    }
    function drawArrowEnd(point0, point1, ctx, width, pixelRatio) {
        if (point1.subtract(point0).length() < 1) {
            return;
        }
        var arrowPoints = getArrowPoints(point0, point1, width);
        for (var e = 0; e < arrowPoints.length; ++e) {
            var first = arrowPoints[e][0];
            var second = arrowPoints[e][1];
            drawLine(ctx, first.x * pixelRatio, first.y * pixelRatio, second.x * pixelRatio, second.y * pixelRatio);
        }
    }
    function getArrowPoints(point0, point1, width) {
        var r = 0.5 * width;
        var n = Math.sqrt(2);
        var o = point1.subtract(point0);
        var a = o.normalized();
        var l = 5 * width;
        var c = 1 * r;
        if (l * n * 0.2 <= c) {
            return [];
        }
        var h = a.scaled(l);
        var d = point1.subtract(h);
        var u = a.transposed();
        var p = 1 * l;
        var z = u.scaled(p);
        var m = d.add(z);
        var g = d.subtract(z);
        var f = m.subtract(point1).normalized().scaled(c);
        var v = g.subtract(point1).normalized().scaled(c);
        var S = point1.add(f);
        var y = point1.add(v);
        var b = r * (n - 1);
        var w = u.scaled(b);
        var C = Math.min(l - 1 * r / n, r * n * 1);
        var P = a.scaled(C);
        var T = point1.subtract(w);
        var x = point1.add(w);
        var I = point1.subtract(P);
        return [[m, S], [g, y], [T, I.subtract(w)], [x, I.add(w)]];
    }

    /**
     * Checks an assertion. Throws if the assertion is failed.
     *
     * @param condition - Result of the assertion evaluation
     * @param message - Text to include in the exception message
     */
    function assert(condition, message) {
        if (!condition) {
            throw new Error('Assertion failed' + (message ? ': ' + message : ''));
        }
    }
    function ensureDefined(value) {
        if (value === undefined) {
            throw new Error('Value is undefined');
        }
        return value;
    }
    function ensureNotNull(value) {
        if (value === null) {
            throw new Error('Value is null');
        }
        return value;
    }
    function ensure(value) {
        return ensureNotNull(ensureDefined(value));
    }
    /**
     * Compile time check for never
     */
    function ensureNever(value) { }

    /**
     * Note this object should be explicitly marked as public so that dts-bundle-generator does not mangle the property names.
     *
     * @public
     * @see https://developer.mozilla.org/en-US/docs/Web/CSS/color_value
     */
    var namedColorRgbHexStrings = {
        // The order of properties in this Record is not important for the internal logic.
        // It's just GZIPped better when props follows this order.
        // Please add new colors to the end of the record.
        khaki: '#f0e68c',
        azure: '#f0ffff',
        aliceblue: '#f0f8ff',
        ghostwhite: '#f8f8ff',
        gold: '#ffd700',
        goldenrod: '#daa520',
        gainsboro: '#dcdcdc',
        gray: '#808080',
        green: '#008000',
        honeydew: '#f0fff0',
        floralwhite: '#fffaf0',
        lightblue: '#add8e6',
        lightcoral: '#f08080',
        lemonchiffon: '#fffacd',
        hotpink: '#ff69b4',
        lightyellow: '#ffffe0',
        greenyellow: '#adff2f',
        lightgoldenrodyellow: '#fafad2',
        limegreen: '#32cd32',
        linen: '#faf0e6',
        lightcyan: '#e0ffff',
        magenta: '#f0f',
        maroon: '#800000',
        olive: '#808000',
        orange: '#ffa500',
        oldlace: '#fdf5e6',
        mediumblue: '#0000cd',
        transparent: '#0000',
        lime: '#0f0',
        lightpink: '#ffb6c1',
        mistyrose: '#ffe4e1',
        moccasin: '#ffe4b5',
        midnightblue: '#191970',
        orchid: '#da70d6',
        mediumorchid: '#ba55d3',
        mediumturquoise: '#48d1cc',
        orangered: '#ff4500',
        royalblue: '#4169e1',
        powderblue: '#b0e0e6',
        red: '#f00',
        coral: '#ff7f50',
        turquoise: '#40e0d0',
        white: '#fff',
        whitesmoke: '#f5f5f5',
        wheat: '#f5deb3',
        teal: '#008080',
        steelblue: '#4682b4',
        bisque: '#ffe4c4',
        aquamarine: '#7fffd4',
        aqua: '#0ff',
        sienna: '#a0522d',
        silver: '#c0c0c0',
        springgreen: '#00ff7f',
        antiquewhite: '#faebd7',
        burlywood: '#deb887',
        brown: '#a52a2a',
        beige: '#f5f5dc',
        chocolate: '#d2691e',
        chartreuse: '#7fff00',
        cornflowerblue: '#6495ed',
        cornsilk: '#fff8dc',
        crimson: '#dc143c',
        cadetblue: '#5f9ea0',
        tomato: '#ff6347',
        fuchsia: '#f0f',
        blue: '#00f',
        salmon: '#fa8072',
        blanchedalmond: '#ffebcd',
        slateblue: '#6a5acd',
        slategray: '#708090',
        thistle: '#d8bfd8',
        tan: '#d2b48c',
        cyan: '#0ff',
        darkblue: '#00008b',
        darkcyan: '#008b8b',
        darkgoldenrod: '#b8860b',
        darkgray: '#a9a9a9',
        blueviolet: '#8a2be2',
        black: '#000',
        darkmagenta: '#8b008b',
        darkslateblue: '#483d8b',
        darkkhaki: '#bdb76b',
        darkorchid: '#9932cc',
        darkorange: '#ff8c00',
        darkgreen: '#006400',
        darkred: '#8b0000',
        dodgerblue: '#1e90ff',
        darkslategray: '#2f4f4f',
        dimgray: '#696969',
        deepskyblue: '#00bfff',
        firebrick: '#b22222',
        forestgreen: '#228b22',
        indigo: '#4b0082',
        ivory: '#fffff0',
        lavenderblush: '#fff0f5',
        feldspar: '#d19275',
        indianred: '#cd5c5c',
        lightgreen: '#90ee90',
        lightgrey: '#d3d3d3',
        lightskyblue: '#87cefa',
        lightslategray: '#789',
        lightslateblue: '#8470ff',
        snow: '#fffafa',
        lightseagreen: '#20b2aa',
        lightsalmon: '#ffa07a',
        darksalmon: '#e9967a',
        darkviolet: '#9400d3',
        mediumpurple: '#9370d8',
        mediumaquamarine: '#66cdaa',
        skyblue: '#87ceeb',
        lavender: '#e6e6fa',
        lightsteelblue: '#b0c4de',
        mediumvioletred: '#c71585',
        mintcream: '#f5fffa',
        navajowhite: '#ffdead',
        navy: '#000080',
        olivedrab: '#6b8e23',
        palevioletred: '#d87093',
        violetred: '#d02090',
        yellow: '#ff0',
        yellowgreen: '#9acd32',
        lawngreen: '#7cfc00',
        pink: '#ffc0cb',
        paleturquoise: '#afeeee',
        palegoldenrod: '#eee8aa',
        darkolivegreen: '#556b2f',
        darkseagreen: '#8fbc8f',
        darkturquoise: '#00ced1',
        peachpuff: '#ffdab9',
        deeppink: '#ff1493',
        violet: '#ee82ee',
        palegreen: '#98fb98',
        mediumseagreen: '#3cb371',
        peru: '#cd853f',
        saddlebrown: '#8b4513',
        sandybrown: '#f4a460',
        rosybrown: '#bc8f8f',
        purple: '#800080',
        seagreen: '#2e8b57',
        seashell: '#fff5ee',
        papayawhip: '#ffefd5',
        mediumslateblue: '#7b68ee',
        plum: '#dda0dd',
        mediumspringgreen: '#00fa9a',
    };
    function normalizeRgbComponent(component) {
        if (component < 0) {
            return 0;
        }
        if (component > 255) {
            return 255;
        }
        // NaN values are treated as 0
        return (Math.round(component) || 0);
    }
    function normalizeAlphaComponent(component) {
        return (!(component <= 0) && !(component > 0) ? 0 :
            component < 0 ? 0 :
                component > 1 ? 1 :
                    // limit the precision of all numbers to at most 4 digits in fractional part
                    Math.round(component * 10000) / 10000);
    }
    /**
     * @example
     * #fb0
     * @example
     * #f0f
     * @example
     * #f0fa
     */
    var shortHexRe = /^#([0-9a-f])([0-9a-f])([0-9a-f])([0-9a-f])?$/i;
    /**
     * @example
     * #00ff00
     * @example
     * #336699
     * @example
     * #336699FA
     */
    var hexRe = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/i;
    /**
     * @example
     * rgb(123, 234, 45)
     * @example
     * rgb(255,234,245)
     */
    var rgbRe = /^rgb\(\s*(-?\d{1,10})\s*,\s*(-?\d{1,10})\s*,\s*(-?\d{1,10})\s*\)$/;
    /**
     * @example
     * rgba(123, 234, 45, 1)
     * @example
     * rgba(255,234,245,0.1)
     */
    var rgbaRe = /^rgba\(\s*(-?\d{1,10})\s*,\s*(-?\d{1,10})\s*,\s*(-?\d{1,10})\s*,\s*(-?[\d]{0,10}(?:\.\d+)?)\s*\)$/;
    function colorStringToRgba(colorString) {
        colorString = colorString.toLowerCase();
        // eslint-disable-next-line no-restricted-syntax
        if (colorString in namedColorRgbHexStrings) {
            colorString = namedColorRgbHexStrings[colorString];
        }
        {
            var matches = rgbaRe.exec(colorString) || rgbRe.exec(colorString);
            if (matches) {
                return [
                    normalizeRgbComponent(parseInt(matches[1], 10)),
                    normalizeRgbComponent(parseInt(matches[2], 10)),
                    normalizeRgbComponent(parseInt(matches[3], 10)),
                    normalizeAlphaComponent((matches.length < 5 ? 1 : parseFloat(matches[4]))),
                ];
            }
        }
        {
            var matches = hexRe.exec(colorString);
            if (matches) {
                return [
                    normalizeRgbComponent(parseInt(matches[1], 16)),
                    normalizeRgbComponent(parseInt(matches[2], 16)),
                    normalizeRgbComponent(parseInt(matches[3], 16)),
                    1,
                ];
            }
        }
        {
            var matches = shortHexRe.exec(colorString);
            if (matches) {
                return [
                    normalizeRgbComponent(parseInt(matches[1], 16) * 0x11),
                    normalizeRgbComponent(parseInt(matches[2], 16) * 0x11),
                    normalizeRgbComponent(parseInt(matches[3], 16) * 0x11),
                    1,
                ];
            }
        }
        throw new Error("Cannot parse color: ".concat(colorString));
    }
    function rgbaToGrayscale(rgbValue) {
        // Originally, the NTSC RGB to YUV formula
        // perfected by @eugene-korobko's black magic
        var redComponentGrayscaleWeight = 0.199;
        var greenComponentGrayscaleWeight = 0.687;
        var blueComponentGrayscaleWeight = 0.114;
        return (redComponentGrayscaleWeight * rgbValue[0] +
            greenComponentGrayscaleWeight * rgbValue[1] +
            blueComponentGrayscaleWeight * rgbValue[2]);
    }
    function applyAlpha(color, alpha) {
        // special case optimization
        if (color === 'transparent') {
            return color;
        }
        var originRgba = colorStringToRgba(color);
        var originAlpha = originRgba[3];
        return "rgba(".concat(originRgba[0], ", ").concat(originRgba[1], ", ").concat(originRgba[2], ", ").concat(alpha * originAlpha, ")");
    }
    function generateContrastColors(backgroundColor) {
        var rgb = colorStringToRgba(backgroundColor);
        return {
            _internal_background: "rgb(".concat(rgb[0], ", ").concat(rgb[1], ", ").concat(rgb[2], ")"),
            _internal_foreground: rgbaToGrayscale(rgb) > 160 ? 'black' : 'white',
        };
    }
    function gradientColorAtPercent(topColor, bottomColor, percent) {
        var _a = colorStringToRgba(topColor), topR = _a[0], topG = _a[1], topB = _a[2], topA = _a[3];
        var _b = colorStringToRgba(bottomColor), bottomR = _b[0], bottomG = _b[1], bottomB = _b[2], bottomA = _b[3];
        var resultRgba = [
            normalizeRgbComponent(topR + percent * (bottomR - topR)),
            normalizeRgbComponent(topG + percent * (bottomG - topG)),
            normalizeRgbComponent(topB + percent * (bottomB - topB)),
            normalizeAlphaComponent(topA + percent * (bottomA - topA)),
        ];
        return "rgba(".concat(resultRgba[0], ", ").concat(resultRgba[1], ", ").concat(resultRgba[2], ", ").concat(resultRgba[3], ")");
    }

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */
    /* global Reflect, Promise */

    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };

    function __extends(d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    }

    var __assign = function() {
        __assign = Object.assign || function __assign(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
            }
            return t;
        };
        return __assign.apply(this, arguments);
    };

    function __rest(s, e) {
        var t = {};
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
            t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
                if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                    t[p[i]] = s[p[i]];
            }
        return t;
    }

    function __spreadArray(to, from, pack) {
        if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
            if (ar || !(i in from)) {
                if (!ar) ar = Array.prototype.slice.call(from, 0, i);
                ar[i] = from[i];
            }
        }
        return to.concat(ar || Array.prototype.slice.call(from));
    }

    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
    var Delegate = /** @class */ (function () {
        function Delegate() {
            this._private__listeners = [];
        }
        Delegate.prototype.subscribe = function (callback, linkedObject, singleshot) {
            var listener = {
                _internal_callback: callback,
                _internal_linkedObject: linkedObject,
                _internal_singleshot: singleshot === true,
            };
            this._private__listeners.push(listener);
        };
        Delegate.prototype.unsubscribe = function (callback) {
            var index = this._private__listeners.findIndex(function (listener) { return callback === listener._internal_callback; });
            if (index > -1) {
                this._private__listeners.splice(index, 1);
            }
        };
        Delegate.prototype.unsubscribeAll = function (linkedObject) {
            this._private__listeners = this._private__listeners.filter(function (listener) { return listener._internal_linkedObject !== linkedObject; });
        };
        Delegate.prototype.fire = function (param1, param2) {
            var listenersSnapshot = __spreadArray([], this._private__listeners, true);
            this._private__listeners = this._private__listeners.filter(function (listener) { return !listener._internal_singleshot; });
            listenersSnapshot.forEach(function (listener) { return listener._internal_callback(param1, param2); });
        };
        Delegate.prototype.hasListeners = function () {
            return this._private__listeners.length > 0;
        };
        Delegate.prototype.destroy = function () {
            this._private__listeners = [];
        };
        return Delegate;
    }());

    /* eslint-disable @typescript-eslint/no-explicit-any */
    /* eslint-disable @typescript-eslint/ban-types */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function merge(dst) {
        var sources = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            sources[_i - 1] = arguments[_i];
        }
        for (var _a = 0, sources_1 = sources; _a < sources_1.length; _a++) {
            var src = sources_1[_a];
            // eslint-disable-next-line no-restricted-syntax
            for (var i in src) {
                if (src[i] === undefined) {
                    continue;
                }
                if ('object' !== typeof src[i] || dst[i] === undefined) {
                    dst[i] = src[i];
                }
                else {
                    merge(dst[i], src[i]);
                }
            }
        }
        return dst;
    }
    function isNumber(value) {
        return (typeof value === 'number') && (isFinite(value));
    }
    function isInteger(value) {
        return (typeof value === 'number') && ((value % 1) === 0);
    }
    function isString(value) {
        return typeof value === 'string';
    }
    function isBoolean(value) {
        return typeof value === 'boolean';
    }
    function clone(object) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        var o = object;
        if (!o || 'object' !== typeof o) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return o;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        var c;
        if (Array.isArray(o)) {
            c = [];
        }
        else {
            c = {};
        }
        var p;
        var v;
        // eslint-disable-next-line no-restricted-syntax
        for (p in o) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call,no-prototype-builtins
            if (o.hasOwnProperty(p)) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                v = o[p];
                if (v && 'object' === typeof v) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    c[p] = clone(v);
                }
                else {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    c[p] = v;
                }
            }
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return c;
    }
    function notNull(t) {
        return t !== null;
    }
    function undefinedIfNull(t) {
        return (t === null) ? undefined : t;
    }

    /**
     * Default font family.
     * Must be used to generate font string when font is not specified.
     */
    var defaultFontFamily = "'Trebuchet MS', Roboto, Ubuntu, sans-serif";
    /**
     * Generates a font string, which can be used to set in canvas' font property.
     * If no family provided, {@link defaultFontFamily} will be used.
     *
     * @param size - Font size in pixels.
     * @param family - Optional font family.
     * @param style - Optional font style.
     * @returns The font string.
     */
    function makeFont(size, family, style) {
        if (style !== undefined) {
            style = "".concat(style, " ");
        }
        else {
            style = '';
        }
        if (family === undefined) {
            family = defaultFontFamily;
        }
        return "".concat(style).concat(size, "px ").concat(family);
    }

    var defaultReplacementRe = /[2-9]/g;
    var TextWidthCache = /** @class */ (function () {
        function TextWidthCache(size) {
            if (size === void 0) { size = 50; }
            this._private__cache = new Map();
            /** Current index in the "cyclic buffer" */
            this._private__keysIndex = 0;
            // A trick to keep array PACKED_ELEMENTS
            this._private__keys = Array.from(new Array(size));
        }
        TextWidthCache.prototype.reset = function () {
            this._private__cache.clear();
            this._private__keys.fill(undefined);
            // We don't care where exactly the _keysIndex points,
            // so there's no point in resetting it
        };
        TextWidthCache.prototype.measureText = function (ctx, text, optimizationReplacementRe) {
            var re = optimizationReplacementRe || defaultReplacementRe;
            var cacheString = String(text).replace(re, '0');
            var width = this._private__cache.get(cacheString);
            if (width === undefined) {
                width = ctx.measureText(cacheString).width;
                if (width === 0 && text.length !== 0) {
                    // measureText can return 0 in FF depending on a canvas size, don't cache it
                    return 0;
                }
                // A cyclic buffer is used to keep track of the cache keys and to delete
                // the oldest one before a new one is inserted.
                // ├──────┬──────┬──────┬──────┤
                // │ foo  │ bar  │      │      │
                // ├──────┴──────┴──────┴──────┤
                //                 ↑ index
                // Eventually, the index reach the end of an array and roll-over to 0.
                // ├──────┬──────┬──────┬──────┤
                // │ foo  │ bar  │ baz  │ quux │
                // ├──────┴──────┴──────┴──────┤
                //   ↑ index = 0
                // After that the oldest value will be overwritten.
                // ├──────┬──────┬──────┬──────┤
                // │ WOOT │ bar  │ baz  │ quux │
                // ├──────┴──────┴──────┴──────┤
                //          ↑ index = 1
                var oldestKey = this._private__keys[this._private__keysIndex];
                if (oldestKey !== undefined) {
                    this._private__cache.delete(oldestKey);
                }
                // Set a newest key in place of the just deleted one
                this._private__keys[this._private__keysIndex] = cacheString;
                // Advance the index so it always points the oldest value
                this._private__keysIndex = (this._private__keysIndex + 1) % this._private__keys.length;
                this._private__cache.set(cacheString, width);
            }
            return width;
        };
        return TextWidthCache;
    }());

    var PriceAxisRendererOptionsProvider = /** @class */ (function () {
        function PriceAxisRendererOptionsProvider(chartModel) {
            this._private__rendererOptions = {
                borderSize: 1 /* BorderSize */,
                tickLength: 4 /* TickLength */,
                widthCache: new TextWidthCache(),
                fontSize: NaN,
                font: '',
                fontFamily: '',
                color: '',
                paddingBottom: 0,
                paddingInner: 0,
                paddingOuter: 0,
                paddingTop: 0,
                baselineOffset: 0,
                align: 'left',
            };
            this._private__chartModel = chartModel;
        }
        PriceAxisRendererOptionsProvider.prototype.options = function () {
            var rendererOptions = this._private__rendererOptions;
            var currentFontSize = this._private__fontSize();
            var currentFontFamily = this._private__fontFamily();
            if (rendererOptions.fontSize !== currentFontSize || rendererOptions.fontFamily !== currentFontFamily) {
                rendererOptions.fontSize = currentFontSize;
                rendererOptions.fontFamily = currentFontFamily;
                rendererOptions.font = makeFont(currentFontSize, currentFontFamily);
                rendererOptions.paddingTop = Math.floor(currentFontSize / 3.5);
                rendererOptions.paddingBottom = rendererOptions.paddingTop;
                rendererOptions.paddingInner = Math.max(Math.ceil(currentFontSize / 2 - rendererOptions.tickLength / 2), 0);
                rendererOptions.paddingOuter = Math.ceil(currentFontSize / 2 + rendererOptions.tickLength / 2);
                rendererOptions.baselineOffset = Math.round(currentFontSize / 10);
                rendererOptions.widthCache.reset();
            }
            rendererOptions.color = this._private__textColor();
            return this._private__rendererOptions;
        };
        PriceAxisRendererOptionsProvider.prototype._private__textColor = function () {
            return this._private__chartModel.options().layout.textColor;
        };
        PriceAxisRendererOptionsProvider.prototype._private__fontSize = function () {
            return this._private__chartModel.options().layout.fontSize;
        };
        PriceAxisRendererOptionsProvider.prototype._private__fontFamily = function () {
            return this._private__chartModel.options().layout.fontFamily;
        };
        return PriceAxisRendererOptionsProvider;
    }());

    var CompositeRenderer = /** @class */ (function () {
        function CompositeRenderer() {
            this._private__renderers = [];
            this._private__globalAlpha = 1;
        }
        CompositeRenderer.prototype._internal_setRenderers = function (renderers) {
            this._private__renderers = renderers;
        };
        CompositeRenderer.prototype._internal_setGlobalAlpha = function (value) {
            this._private__globalAlpha = value;
        };
        CompositeRenderer.prototype._internal_append = function (renderer) {
            var _a;
            (_a = this._private__renderers) === null || _a === void 0 ? void 0 : _a.push(renderer);
        };
        CompositeRenderer.prototype._internal_insert = function (renderer, index) {
            this._private__renderers.splice(index, 0, renderer);
        };
        CompositeRenderer.prototype._internal_clear = function () {
            this._private__renderers.length = 0;
        };
        CompositeRenderer.prototype._internal_isEmpty = function () {
            return this._private__renderers.length === 0;
        };
        CompositeRenderer.prototype.draw = function (ctx, renderParams) {
            for (var i = 0; i < this._private__renderers.length; i++) {
                ctx.save();
                ctx.globalAlpha = this._private__globalAlpha;
                this._private__renderers[i].draw(ctx, renderParams);
                ctx.restore();
            }
        };
        CompositeRenderer.prototype.drawBackground = function (ctx, renderParams) {
            ctx.save();
            ctx.globalAlpha = this._private__globalAlpha;
            for (var i = 0; i < this._private__renderers.length; i++) {
                var renderer = this._private__renderers[i];
                if (renderer.drawBackground) {
                    renderer.drawBackground(ctx, renderParams);
                }
            }
            ctx.restore();
        };
        CompositeRenderer.prototype.hitTest = function (point, renderParams) {
            var result = null;
            for (var i = this._private__renderers.length - 1; i >= 0; i--) {
                var renderer = this._private__renderers[i];
                if (renderer.hitTest) {
                    result = renderer.hitTest(point, renderParams) || null;
                }
                if (result) {
                    break;
                }
            }
            return result;
        };
        return CompositeRenderer;
    }());

    var ScaledRenderer = /** @class */ (function () {
        function ScaledRenderer() {
        }
        ScaledRenderer.prototype.draw = function (ctx, renderParams) {
            var pixelRatio = renderParams.pixelRatio;
            ctx.save();
            // actually we must be sure that this scaling applied only once at the same time
            // currently ScaledRenderer could be only nodes renderer (not top-level renderers like CompositeRenderer or something)
            // so this "constraint" is fulfilled for now
            ctx.scale(pixelRatio, pixelRatio);
            this._internal__drawImpl(ctx, renderParams);
            ctx.restore();
        };
        ScaledRenderer.prototype.drawBackground = function (ctx, renderParams) {
            var pixelRatio = renderParams.pixelRatio;
            ctx.save();
            // actually we must be sure that this scaling applied only once at the same time
            // currently ScaledRenderer could be only nodes renderer (not top-level renderers like CompositeRenderer or something)
            // so this "constraint" is fulfilled for now
            ctx.scale(pixelRatio, pixelRatio);
            this._internal__drawBackgroundImpl(ctx, renderParams);
            ctx.restore();
        };
        ScaledRenderer.prototype._internal__drawBackgroundImpl = function (ctx, renderParams) { };
        return ScaledRenderer;
    }());

    var PaneRendererMarks = /** @class */ (function (_super) {
        __extends(PaneRendererMarks, _super);
        function PaneRendererMarks() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this._internal__data = null;
            return _this;
        }
        PaneRendererMarks.prototype._internal_setData = function (data) {
            this._internal__data = data;
        };
        PaneRendererMarks.prototype._internal__drawImpl = function (ctx) {
            if (this._internal__data === null || this._internal__data._internal_visibleRange === null) {
                return;
            }
            var visibleRange = this._internal__data._internal_visibleRange;
            var data = this._internal__data;
            var draw = function (radius) {
                ctx.beginPath();
                for (var i = visibleRange.to - 1; i >= visibleRange.from; --i) {
                    var point = data._internal_items[i];
                    ctx.moveTo(point.x, point.y);
                    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
                }
                ctx.fill();
            };
            ctx.fillStyle = data._internal_backColor;
            draw(data._internal_radius + 2);
            ctx.fillStyle = data._internal_lineColor;
            draw(data._internal_radius);
        };
        return PaneRendererMarks;
    }(ScaledRenderer));

    function createEmptyMarkerData() {
        return {
            _internal_items: [{
                    x: 0,
                    y: 0,
                    time: 0,
                    price: 0,
                }],
            _internal_lineColor: '',
            _internal_backColor: '',
            _internal_radius: 0,
            _internal_visibleRange: null,
        };
    }
    var rangeForSinglePoint = { from: 0, to: 1 };
    var CrosshairMarksPaneView = /** @class */ (function () {
        function CrosshairMarksPaneView(chartModel, crosshair) {
            this._private__compositeRenderer = new CompositeRenderer();
            this._private__markersRenderers = [];
            this._private__markersData = [];
            this._private__validated = new Map();
            this._private__chartModel = chartModel;
            this._private__crosshair = crosshair;
            this._private__compositeRenderer._internal_setRenderers(this._private__markersRenderers);
        }
        CrosshairMarksPaneView.prototype.update = function (updateType) {
            var serieses = this._private__chartModel.serieses();
            if (serieses.length !== this._private__markersRenderers.length) {
                this._private__markersData = serieses.map(createEmptyMarkerData);
                this._private__markersRenderers = this._private__markersData.map(function (data) {
                    var res = new PaneRendererMarks();
                    res._internal_setData(data);
                    return res;
                });
                this._private__compositeRenderer._internal_setRenderers(this._private__markersRenderers);
            }
            this._private__validated.clear();
        };
        CrosshairMarksPaneView.prototype.renderer = function (height, width, pane) {
            var renderers = this._private__validated.get(pane);
            if (!renderers) {
                renderers = this._private__updateImpl(pane, height);
                this._private__validated.set(pane, renderers);
                var compositeRenderer_1 = new CompositeRenderer();
                compositeRenderer_1._internal_setRenderers(renderers);
                return compositeRenderer_1;
            }
            var compositeRenderer = new CompositeRenderer();
            compositeRenderer._internal_setRenderers(renderers);
            return compositeRenderer;
            // return this._compositeRenderer;
        };
        CrosshairMarksPaneView.prototype._private__updateImpl = function (pane, height) {
            var _this = this;
            var serieses = this._private__chartModel.serieses()
                .map(function (datasource, index) { return [datasource, index]; })
                .filter(function (entry) { return pane.dataSources().includes(entry[0]); });
            var timePointIndex = this._private__crosshair.appliedIndex();
            var timeScale = this._private__chartModel.timeScale();
            return serieses.map(function (_a) {
                var _b;
                var s = _a[0], index = _a[1];
                var data = _this._private__markersData[index];
                var seriesData = s.markerDataAtIndex(timePointIndex);
                if (seriesData === null || !s.visible()) {
                    data._internal_visibleRange = null;
                }
                else {
                    var firstValue = ensureNotNull(s.firstValue());
                    data._internal_lineColor = seriesData.backgroundColor;
                    data._internal_radius = seriesData.radius;
                    data._internal_items[0].price = seriesData.price;
                    data._internal_items[0].y = s.priceScale().priceToCoordinate(seriesData.price, firstValue.value);
                    data._internal_backColor = (_b = seriesData.borderColor) !== null && _b !== void 0 ? _b : _this._private__chartModel.backgroundColorAtYPercentFromTop(data._internal_items[0].y / height);
                    data._internal_items[0].time = timePointIndex;
                    data._internal_items[0].x = timeScale.indexToCoordinate(timePointIndex);
                    data._internal_visibleRange = rangeForSinglePoint;
                }
                return _this._private__markersRenderers[index];
            });
        };
        return CrosshairMarksPaneView;
    }());

    var CrosshairRenderer = /** @class */ (function () {
        function CrosshairRenderer(data) {
            this._private__data = data;
        }
        CrosshairRenderer.prototype.draw = function (ctx, renderParams) {
            if (this._private__data === null) {
                return;
            }
            var pixelRatio = renderParams.pixelRatio;
            var vertLinesVisible = this._private__data._internal_vertLine._internal_visible;
            var horzLinesVisible = this._private__data._internal_horzLine._internal_visible;
            if (!vertLinesVisible && !horzLinesVisible) {
                return;
            }
            ctx.save();
            var x = Math.round(this._private__data._internal_x * pixelRatio);
            var y = Math.round(this._private__data._internal_y * pixelRatio);
            var w = Math.ceil(this._private__data._internal_w * pixelRatio);
            var h = Math.ceil(this._private__data._internal_h * pixelRatio);
            ctx.lineCap = 'butt';
            if (vertLinesVisible && x >= 0) {
                ctx.lineWidth = Math.floor(this._private__data._internal_vertLine._internal_lineWidth * pixelRatio);
                ctx.strokeStyle = this._private__data._internal_vertLine._internal_color;
                ctx.fillStyle = this._private__data._internal_vertLine._internal_color;
                setLineStyle(ctx, this._private__data._internal_vertLine._internal_lineStyle);
                drawVerticalLine(ctx, x, 0, h);
            }
            if (horzLinesVisible && y >= 0) {
                ctx.lineWidth = Math.floor(this._private__data._internal_horzLine._internal_lineWidth * pixelRatio);
                ctx.strokeStyle = this._private__data._internal_horzLine._internal_color;
                ctx.fillStyle = this._private__data._internal_horzLine._internal_color;
                setLineStyle(ctx, this._private__data._internal_horzLine._internal_lineStyle);
                drawHorizontalLine(ctx, y, 0, w);
            }
            ctx.restore();
        };
        return CrosshairRenderer;
    }());

    var CrosshairPaneView = /** @class */ (function () {
        function CrosshairPaneView(source) {
            this._private__validated = new Map();
            this._private__rendererData = {
                _internal_vertLine: {
                    _internal_lineWidth: 1,
                    _internal_lineStyle: 0,
                    _internal_color: '',
                    _internal_visible: false,
                },
                _internal_horzLine: {
                    _internal_lineWidth: 1,
                    _internal_lineStyle: 0,
                    _internal_color: '',
                    _internal_visible: false,
                },
                _internal_w: 0,
                _internal_h: 0,
                _internal_x: 0,
                _internal_y: 0,
            };
            this._private__renderer = new CrosshairRenderer(this._private__rendererData);
            this._private__source = source;
        }
        CrosshairPaneView.prototype._internal_update = function () {
            this._private__validated.clear();
        };
        CrosshairPaneView.prototype.renderer = function (height, width, pane) {
            this._private__updateImpl(pane);
            // TODO rendererData needs to be cached per pane.
            /* if (!this._validated.get(pane)) {
                this._updateImpl(pane);
                this._validated.set(pane, true);
            } else {
                console.warn(`unexpected validated renderer, height: ${pane.height()}`);
            }*/
            return this._private__renderer;
        };
        CrosshairPaneView.prototype._private__updateImpl = function (renderingPane) {
            var visible = this._private__source.visible();
            var pane = ensureNotNull(this._private__source.pane());
            var crosshairOptions = pane.model().options().crosshair;
            var data = this._private__rendererData;
            data._internal_horzLine._internal_visible = visible && this._private__source.horzLineVisible(renderingPane);
            data._internal_vertLine._internal_visible = visible && this._private__source.vertLineVisible();
            data._internal_horzLine._internal_lineWidth = crosshairOptions.horzLine.width;
            data._internal_horzLine._internal_lineStyle = crosshairOptions.horzLine.style;
            data._internal_horzLine._internal_color = crosshairOptions.horzLine.color;
            data._internal_vertLine._internal_lineWidth = crosshairOptions.vertLine.width;
            data._internal_vertLine._internal_lineStyle = crosshairOptions.vertLine.style;
            data._internal_vertLine._internal_color = crosshairOptions.vertLine.color;
            data._internal_w = renderingPane.width();
            data._internal_h = renderingPane.height();
            data._internal_x = this._private__source.appliedX();
            data._internal_y = this._private__source.appliedY();
        };
        return CrosshairPaneView;
    }());

    /**
     * Fills rectangle's inner border (so, all the filled area is limited by the [x, x + width]*[y, y + height] region)
     * ```
     * (x, y)
     * O***********************|*****
     * |        border         |  ^
     * |   *****************   |  |
     * |   |               |   |  |
     * | b |               | b |  h
     * | o |               | o |  e
     * | r |               | r |  i
     * | d |               | d |  g
     * | e |               | e |  h
     * | r |               | r |  t
     * |   |               |   |  |
     * |   *****************   |  |
     * |        border         |  v
     * |***********************|*****
     * |                       |
     * |<------- width ------->|
     * ```
     *
     * @param ctx - Context to draw on
     * @param x - Left side of the target rectangle
     * @param y - Top side of the target rectangle
     * @param width - Width of the target rectangle
     * @param height - Height of the target rectangle
     * @param borderWidth - Width of border to fill, must be less than width and height of the target rectangle
     */
    function fillRectInnerBorder(ctx, x, y, width, height, borderWidth) {
        // horizontal (top and bottom) edges
        ctx.fillRect(x + borderWidth, y, width - borderWidth * 2, borderWidth);
        ctx.fillRect(x + borderWidth, y + height - borderWidth, width - borderWidth * 2, borderWidth);
        // vertical (left and right) edges
        ctx.fillRect(x, y, borderWidth, height);
        ctx.fillRect(x + width - borderWidth, y, borderWidth, height);
    }
    function drawScaled(ctx, pixelRatio, func) {
        ctx.save();
        ctx.scale(pixelRatio, pixelRatio);
        func();
        ctx.restore();
    }
    function clearRect(ctx, x, y, w, h, clearColor) {
        ctx.save();
        ctx.globalCompositeOperation = 'copy';
        ctx.fillStyle = clearColor;
        ctx.fillRect(x, y, w, h);
        ctx.restore();
    }
    // eslint-disable-next-line max-params
    function clearRectWithGradient(ctx, x, y, w, h, topColor, bottomColor) {
        ctx.save();
        ctx.globalCompositeOperation = 'copy';
        var gradient = ctx.createLinearGradient(0, 0, 0, h);
        gradient.addColorStop(0, topColor);
        gradient.addColorStop(1, bottomColor);
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, w, h);
        ctx.restore();
    }

    var PriceAxisViewRenderer = /** @class */ (function () {
        function PriceAxisViewRenderer(data, commonData) {
            this._internal_setData(data, commonData);
        }
        PriceAxisViewRenderer.prototype._internal_setData = function (data, commonData) {
            this._private__data = data;
            this._private__commonData = commonData;
        };
        PriceAxisViewRenderer.prototype.draw = function (ctx, rendererOptions, renderParams) {
            if (!this._private__data._internal_visible) {
                return;
            }
            ctx.font = rendererOptions.font;
            var tickSize = (this._private__data._internal_tickVisible || !this._private__data._internal_moveTextToInvisibleTick) ? rendererOptions.tickLength : 0;
            var horzBorder = rendererOptions.borderSize;
            var paddingTop = rendererOptions.paddingTop;
            var paddingBottom = rendererOptions.paddingBottom;
            var paddingInner = rendererOptions.paddingInner;
            var paddingOuter = rendererOptions.paddingOuter;
            var text = this._private__data._internal_text;
            var textWidth = Math.ceil(rendererOptions.widthCache.measureText(ctx, text));
            var baselineOffset = rendererOptions.baselineOffset;
            var totalHeight = rendererOptions.fontSize + paddingTop + paddingBottom;
            var halfHeigth = Math.ceil(totalHeight * 0.5);
            var totalWidth = horzBorder + textWidth + paddingInner + paddingOuter + tickSize;
            var yMid = this._private__commonData._internal_coordinate;
            if (this._private__commonData._internal_fixedCoordinate) {
                yMid = this._private__commonData._internal_fixedCoordinate;
            }
            yMid = Math.round(yMid);
            var yTop = yMid - halfHeigth;
            var yBottom = yTop + totalHeight;
            var alignRight = rendererOptions.align === 'right';
            var pixelRatio = renderParams.pixelRatio;
            var width = renderParams.cssWidth;
            var xInside = alignRight ? width : 0;
            var rightScaled = Math.ceil(width * pixelRatio);
            var xOutside = xInside;
            var xTick;
            var xText;
            ctx.fillStyle = this._private__commonData._internal_background;
            ctx.lineWidth = 1;
            ctx.lineCap = 'butt';
            if (text) {
                if (alignRight) {
                    // 2               1
                    //
                    //              6  5
                    //
                    // 3               4
                    xOutside = xInside - totalWidth;
                    xTick = xInside - tickSize;
                    xText = xOutside + paddingOuter;
                }
                else {
                    // 1               2
                    //
                    // 6  5
                    //
                    // 4               3
                    xOutside = xInside + totalWidth;
                    xTick = xInside + tickSize;
                    xText = xInside + horzBorder + tickSize + paddingInner;
                }
                var tickHeight = Math.max(1, Math.floor(pixelRatio));
                var horzBorderScaled = Math.max(1, Math.floor(horzBorder * pixelRatio));
                var xInsideScaled = alignRight ? rightScaled : 0;
                var yTopScaled = Math.round(yTop * pixelRatio);
                var xOutsideScaled = Math.round(xOutside * pixelRatio);
                var yMidScaled = Math.round(yMid * pixelRatio) - Math.floor(pixelRatio * 0.5);
                var yBottomScaled = yMidScaled + tickHeight + (yMidScaled - yTopScaled);
                var xTickScaled = Math.round(xTick * pixelRatio);
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(xInsideScaled, yTopScaled);
                ctx.lineTo(xOutsideScaled, yTopScaled);
                ctx.lineTo(xOutsideScaled, yBottomScaled);
                ctx.lineTo(xInsideScaled, yBottomScaled);
                ctx.fill();
                // draw border
                ctx.fillStyle = this._private__data._internal_borderColor;
                ctx.fillRect(alignRight ? rightScaled - horzBorderScaled : 0, yTopScaled, horzBorderScaled, yBottomScaled - yTopScaled);
                if (this._private__data._internal_tickVisible) {
                    ctx.fillStyle = this._private__commonData._internal_color;
                    ctx.fillRect(xInsideScaled, yMidScaled, xTickScaled - xInsideScaled, tickHeight);
                }
                ctx.textAlign = 'left';
                ctx.fillStyle = this._private__commonData._internal_color;
                drawScaled(ctx, pixelRatio, function () {
                    ctx.fillText(text, xText, yBottom - paddingBottom - baselineOffset);
                });
                ctx.restore();
            }
        };
        PriceAxisViewRenderer.prototype._internal_height = function (rendererOptions, useSecondLine) {
            if (!this._private__data._internal_visible) {
                return 0;
            }
            return rendererOptions.fontSize + rendererOptions.paddingTop + rendererOptions.paddingBottom;
        };
        return PriceAxisViewRenderer;
    }());

    var PriceAxisLabelView = /** @class */ (function () {
        function PriceAxisLabelView(ctor) {
            this._private__commonRendererData = {
                _internal_coordinate: 0,
                _internal_color: '#FFF',
                _internal_background: '#000',
            };
            this._private__axisRendererData = {
                _internal_text: '',
                _internal_visible: false,
                _internal_tickVisible: false,
                _internal_moveTextToInvisibleTick: false,
                _internal_borderColor: '',
            };
            this._private__paneRendererData = {
                _internal_text: '',
                _internal_visible: false,
                _internal_tickVisible: false,
                _internal_moveTextToInvisibleTick: true,
                _internal_borderColor: '',
            };
            this._private__invalidated = true;
            this._private__axisRenderer = new (ctor || PriceAxisViewRenderer)(this._private__axisRendererData, this._private__commonRendererData);
            this._private__paneRenderer = new (ctor || PriceAxisViewRenderer)(this._private__paneRendererData, this._private__commonRendererData);
        }
        PriceAxisLabelView.prototype._internal_text = function () {
            this._private__updateRendererDataIfNeeded();
            return this._private__axisRendererData._internal_text;
        };
        PriceAxisLabelView.prototype._internal_coordinate = function () {
            this._private__updateRendererDataIfNeeded();
            return this._private__commonRendererData._internal_coordinate;
        };
        PriceAxisLabelView.prototype.update = function () {
            this._private__invalidated = true;
        };
        PriceAxisLabelView.prototype._internal_height = function (rendererOptions, useSecondLine) {
            if (useSecondLine === void 0) { useSecondLine = false; }
            return Math.max(this._private__axisRenderer._internal_height(rendererOptions, useSecondLine), this._private__paneRenderer._internal_height(rendererOptions, useSecondLine));
        };
        PriceAxisLabelView.prototype._internal_getFixedCoordinate = function () {
            return this._private__commonRendererData._internal_fixedCoordinate || 0;
        };
        PriceAxisLabelView.prototype._internal_setFixedCoordinate = function (value) {
            this._private__commonRendererData._internal_fixedCoordinate = value;
        };
        PriceAxisLabelView.prototype._internal_isVisible = function () {
            this._private__updateRendererDataIfNeeded();
            return this._private__axisRendererData._internal_visible || this._private__paneRendererData._internal_visible;
        };
        PriceAxisLabelView.prototype.renderer = function () {
            this._private__updateRendererDataIfNeeded();
            this._private__axisRenderer._internal_setData(this._private__axisRendererData, this._private__commonRendererData);
            this._private__paneRenderer._internal_setData(this._private__paneRendererData, this._private__commonRendererData);
            return this._private__axisRenderer;
        };
        PriceAxisLabelView.prototype._internal_paneRenderer = function () {
            this._private__updateRendererDataIfNeeded();
            this._private__axisRenderer._internal_setData(this._private__axisRendererData, this._private__commonRendererData);
            this._private__paneRenderer._internal_setData(this._private__paneRendererData, this._private__commonRendererData);
            return this._private__paneRenderer;
        };
        PriceAxisLabelView.prototype._private__updateRendererDataIfNeeded = function () {
            if (this._private__invalidated) {
                this._private__axisRendererData._internal_tickVisible = false;
                this._private__paneRendererData._internal_tickVisible = false;
                this._internal__updateRendererData(this._private__axisRendererData, this._private__paneRendererData, this._private__commonRendererData);
            }
        };
        return PriceAxisLabelView;
    }());

    var CrosshairPriceAxisLabelView = /** @class */ (function (_super) {
        __extends(CrosshairPriceAxisLabelView, _super);
        function CrosshairPriceAxisLabelView(source, priceScale, valueProvider) {
            var _this = _super.call(this) || this;
            _this._private__source = source;
            _this._private__priceScale = priceScale;
            _this._private__valueProvider = valueProvider;
            return _this;
        }
        CrosshairPriceAxisLabelView.prototype._internal__updateRendererData = function (axisRendererData, paneRendererData, commonRendererData) {
            axisRendererData._internal_visible = false;
            var options = this._private__source.options().horzLine;
            if (!options.labelVisible) {
                return;
            }
            var firstValue = this._private__priceScale.firstValue();
            if (!this._private__source.visible() || this._private__priceScale.isEmpty() || (firstValue === null)) {
                return;
            }
            var colors = generateContrastColors(options.labelBackgroundColor);
            commonRendererData._internal_background = colors._internal_background;
            commonRendererData._internal_color = colors._internal_foreground;
            var value = this._private__valueProvider(this._private__priceScale);
            commonRendererData._internal_coordinate = value._internal_coordinate;
            axisRendererData._internal_text = this._private__priceScale.formatPrice(value._internal_price, firstValue);
            axisRendererData._internal_visible = true;
        };
        return CrosshairPriceAxisLabelView;
    }(PriceAxisLabelView));

    var optimizationReplacementRe = /[1-9]/g;
    var TimeAxisLabelRenderer = /** @class */ (function () {
        function TimeAxisLabelRenderer() {
            this._private__data = null;
        }
        TimeAxisLabelRenderer.prototype._internal_setData = function (data) {
            this._private__data = data;
        };
        TimeAxisLabelRenderer.prototype.draw = function (ctx, rendererOptions, renderParams) {
            var _this = this;
            if (this._private__data === null || this._private__data._internal_visible === false || this._private__data._internal_text.length === 0) {
                return;
            }
            ctx.font = rendererOptions.font;
            var pixelRatio = renderParams.pixelRatio;
            var textWidth = Math.round(rendererOptions.widthCache.measureText(ctx, this._private__data._internal_text, optimizationReplacementRe));
            if (textWidth <= 0) {
                return;
            }
            ctx.save();
            var horzMargin = rendererOptions.paddingHorizontal;
            var labelWidth = textWidth + 2 * horzMargin;
            var labelWidthHalf = labelWidth / 2;
            var timeScaleWidth = this._private__data._internal_width;
            var coordinate = this._private__data._internal_coordinate;
            var x1 = Math.floor(coordinate - labelWidthHalf) + 0.5;
            if (x1 < 0) {
                coordinate = coordinate + Math.abs(0 - x1);
                x1 = Math.floor(coordinate - labelWidthHalf) + 0.5;
            }
            else if (x1 + labelWidth > timeScaleWidth) {
                coordinate = coordinate - Math.abs(timeScaleWidth - (x1 + labelWidth));
                x1 = Math.floor(coordinate - labelWidthHalf) + 0.5;
            }
            var x2 = x1 + labelWidth;
            var y1 = 0;
            var y2 = (y1 +
                rendererOptions.borderSize +
                rendererOptions.paddingTop +
                rendererOptions.fontSize +
                rendererOptions.paddingBottom);
            ctx.fillStyle = this._private__data._internal_background;
            var x1scaled = Math.round(x1 * pixelRatio);
            var y1scaled = Math.round(y1 * pixelRatio);
            var x2scaled = Math.round(x2 * pixelRatio);
            var y2scaled = Math.round(y2 * pixelRatio);
            ctx.fillRect(x1scaled, y1scaled, x2scaled - x1scaled, y2scaled - y1scaled);
            if (this._private__data._internal_tickVisible) {
                var tickX = Math.round(this._private__data._internal_coordinate * pixelRatio);
                var tickTop = y1scaled;
                var tickBottom = Math.round((tickTop + rendererOptions.borderSize + rendererOptions.tickLength) * pixelRatio);
                ctx.fillStyle = this._private__data._internal_color;
                var tickWidth = Math.max(1, Math.floor(pixelRatio));
                var tickOffset = Math.floor(pixelRatio * 0.5);
                ctx.fillRect(tickX - tickOffset, tickTop, tickWidth, tickBottom - tickTop);
            }
            var yText = y2 - rendererOptions.baselineOffset - rendererOptions.paddingBottom;
            ctx.textAlign = 'left';
            ctx.fillStyle = this._private__data._internal_color;
            drawScaled(ctx, renderParams.pixelRatio, function () {
                ctx.fillText(ensureNotNull(_this._private__data)._internal_text, x1 + horzMargin, yText);
            });
            ctx.restore();
        };
        return TimeAxisLabelRenderer;
    }());

    var TimeAxisLabelView = /** @class */ (function () {
        function TimeAxisLabelView(model) {
            this._internal__renderer = new TimeAxisLabelRenderer();
            this._internal__invalidated = true;
            this._internal__rendererData = {
                _internal_background: '',
                _internal_coordinate: 0,
                _internal_color: '',
                _internal_text: '',
                _internal_width: 0,
                _internal_visible: false,
                _internal_tickVisible: false,
            };
            this._internal__model = model;
            this._internal__renderer._internal_setData(this._internal__rendererData);
        }
        TimeAxisLabelView.prototype.update = function () {
            this._internal__invalidated = true;
        };
        TimeAxisLabelView.prototype.renderer = function () {
            if (this._internal__invalidated) {
                this._internal__updateImpl();
            }
            this._internal__invalidated = false;
            return this._internal__renderer;
        };
        TimeAxisLabelView.prototype._internal__updateImpl = function () {
            this._internal__rendererData._internal_visible = false;
            if (this._internal__model.timeScale().isEmpty()) {
                return;
            }
            var background = this._internal__getBackgroundColor();
            if (background === null) {
                return;
            }
            var timestamp = this._internal__getTime();
            if (timestamp === null) {
                return;
            }
            var colors = generateContrastColors(background);
            this._internal__rendererData._internal_background = colors._internal_background;
            this._internal__rendererData._internal_color = colors._internal_foreground;
            this._internal__rendererData._internal_coordinate = this._internal__model.timeScale().timeToCoordinate({ timestamp: timestamp });
            this._internal__rendererData._internal_text = this._internal__model.timeScale().formatDateTime({ timestamp: timestamp });
            this._internal__rendererData._internal_width = this._internal__model.timeScale().width();
            this._internal__rendererData._internal_visible = true;
            this._internal__invalidated = false;
        };
        return TimeAxisLabelView;
    }());

    var CrosshairTimeAxisLabelView = /** @class */ (function (_super) {
        __extends(CrosshairTimeAxisLabelView, _super);
        function CrosshairTimeAxisLabelView(crosshair, model, valueProvider) {
            var _this = _super.call(this, model) || this;
            _this._internal__crosshair = crosshair;
            _this._internal__valueProvider = valueProvider;
            return _this;
        }
        CrosshairTimeAxisLabelView.prototype._internal__getTime = function () {
            var currentTime = this._internal__model.timeScale().floatIndexToTime(this._internal__crosshair.appliedIndex());
            return currentTime;
        };
        CrosshairTimeAxisLabelView.prototype._internal__getBackgroundColor = function () {
            return '#4c525e';
        };
        CrosshairTimeAxisLabelView.prototype._internal__updateImpl = function () {
            this._internal__rendererData._internal_visible = false;
            var options = this._internal__crosshair.options().vertLine;
            if (!options.labelVisible) {
                return;
            }
            _super.prototype._internal__updateImpl.call(this);
        };
        return CrosshairTimeAxisLabelView;
    }(TimeAxisLabelView));

    var source = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    function randomHashN(count) {
        var hash = '';
        for (var i = 0; i < count; ++i) {
            var index = Math.floor(Math.random() * source.length);
            hash += source[index];
        }
        return hash;
    }

    var DataSource = /** @class */ (function () {
        function DataSource() {
            this._priceScale = null;
            this._private__id = randomHashN(6);
            this._private__zorder = 0;
        }
        DataSource.prototype.id = function () {
            return this._private__id;
        };
        DataSource.prototype.setId = function (id) {
            this._private__id = id;
        };
        DataSource.prototype.zorder = function () {
            return this._private__zorder;
        };
        DataSource.prototype.setZorder = function (zorder) {
            this._private__zorder = zorder;
        };
        DataSource.prototype.priceScale = function () {
            return this._priceScale;
        };
        DataSource.prototype.setPriceScale = function (priceScale) {
            this._priceScale = priceScale;
        };
        DataSource.prototype.timeAxisViews = function () {
            return [];
        };
        DataSource.prototype.visible = function () {
            return true;
        };
        return DataSource;
    }());

    /**
     * Represents the crosshair mode.
     */
    var CrosshairMode;
    (function (CrosshairMode) {
        /**
         * This mode allows crosshair to move freely on the chart.
         */
        CrosshairMode[CrosshairMode["Normal"] = 0] = "Normal";
        /**
         * This mode sticks crosshair's horizontal line to the price value of a single-value series or to the close price of OHLC-based series.
         */
        CrosshairMode[CrosshairMode["Magnet"] = 1] = "Magnet";
    })(CrosshairMode || (CrosshairMode = {}));
    var Crosshair = /** @class */ (function (_super) {
        __extends(Crosshair, _super);
        function Crosshair(model, options) {
            var _this = _super.call(this) || this;
            _this._private__pane = null;
            _this._private__price = NaN;
            _this._private__index = 0;
            _this._private__visible = true;
            _this._private__priceAxisViews = new Map();
            _this._private__subscribed = false;
            _this._private__x = NaN;
            _this._private__y = NaN;
            _this._private__originX = NaN;
            _this._private__originY = NaN;
            _this._private__model = model;
            _this._private__options = options;
            _this._private__markersPaneView = new CrosshairMarksPaneView(model, _this);
            var valuePriceProvider = function (rawPriceProvider, rawCoordinateProvider) {
                return function (priceScale) {
                    var coordinate = rawCoordinateProvider();
                    var rawPrice = rawPriceProvider();
                    if (priceScale === ensureNotNull(_this._private__pane).defaultPriceScale()) {
                        // price must be defined
                        return { _internal_price: rawPrice, _internal_coordinate: coordinate };
                    }
                    else {
                        // always convert from coordinate
                        var firstValue = ensureNotNull(priceScale.firstValue());
                        var price = priceScale.coordinateToPrice(coordinate, firstValue);
                        return { _internal_price: price, _internal_coordinate: coordinate };
                    }
                };
            };
            var valueTimeProvider = function (rawIndexProvider, rawCoordinateProvider) {
                return function () {
                    return {
                        _internal_time: _this._private__model.timeScale().indexToTime(rawIndexProvider()),
                        _internal_coordinate: rawCoordinateProvider(),
                    };
                };
            };
            // for current position always return both price and coordinate
            _this._private__currentPosPriceProvider = valuePriceProvider(function () { return _this._private__price; }, function () { return _this._private__y; });
            var currentPosTimeProvider = valueTimeProvider(function () { return _this._private__index; }, function () { return _this.appliedX(); });
            _this._private__timeAxisView = new CrosshairTimeAxisLabelView(_this, model, currentPosTimeProvider);
            _this._private__paneView = new CrosshairPaneView(_this);
            return _this;
        }
        Crosshair.prototype.options = function () {
            return this._private__options;
        };
        Crosshair.prototype.saveOriginCoord = function (x, y) {
            this._private__originX = x;
            this._private__originY = y;
        };
        Crosshair.prototype.clearOriginCoord = function () {
            this._private__originX = NaN;
            this._private__originY = NaN;
        };
        Crosshair.prototype.originCoordX = function () {
            return this._private__originX;
        };
        Crosshair.prototype.originCoordY = function () {
            return this._private__originY;
        };
        Crosshair.prototype.setPosition = function (index, price, pane) {
            if (!this._private__subscribed) {
                this._private__subscribed = true;
            }
            this._private__visible = true;
            this._private__tryToUpdateViews(index, price, pane);
        };
        Crosshair.prototype.appliedIndex = function () {
            return this._private__index;
        };
        Crosshair.prototype.appliedX = function () {
            return this._private__x;
        };
        Crosshair.prototype.appliedY = function () {
            return this._private__y;
        };
        Crosshair.prototype.visible = function () {
            return this._private__visible;
        };
        Crosshair.prototype.clearPosition = function () {
            this._private__visible = false;
            this._private__setIndexToLastSeriesBarIndex();
            this._private__price = NaN;
            this._private__x = NaN;
            this._private__y = NaN;
            this._private__pane = null;
            this.clearOriginCoord();
        };
        Crosshair.prototype.paneViews = function () {
            return this._private__pane !== null ? [this._private__paneView, this._private__markersPaneView] : [];
        };
        Crosshair.prototype.horzLineVisible = function (pane) {
            return pane === this._private__pane && this._private__options.horzLine.visible;
        };
        Crosshair.prototype.vertLineVisible = function () {
            return this._private__options.vertLine.visible;
        };
        Crosshair.prototype.priceAxisViews = function (pane, priceScale) {
            if (!this._private__visible || this._private__pane !== pane) {
                this._private__priceAxisViews.clear();
            }
            var views = [];
            if (this._private__pane === pane) {
                views.push(this._private__createPriceAxisViewOnDemand(this._private__priceAxisViews, priceScale, this._private__currentPosPriceProvider));
            }
            return views;
        };
        Crosshair.prototype.timeAxisViews = function () {
            return this._private__visible ? [this._private__timeAxisView] : [];
        };
        Crosshair.prototype.pane = function () {
            return this._private__pane;
        };
        Crosshair.prototype.updateAllViews = function () {
            this._private__paneView._internal_update();
            this._private__priceAxisViews.forEach(function (value) { return value.update(); });
            this._private__timeAxisView.update();
            this._private__markersPaneView.update();
        };
        Crosshair.prototype._private__priceScaleByPane = function (pane) {
            if (pane && !pane.defaultPriceScale().isEmpty()) {
                return pane.defaultPriceScale();
            }
            return null;
        };
        Crosshair.prototype._private__tryToUpdateViews = function (index, price, pane) {
            if (this._private__tryToUpdateData(index, price, pane)) {
                this.updateAllViews();
            }
        };
        Crosshair.prototype._private__tryToUpdateData = function (newIndex, newPrice, newPane) {
            var oldX = this._private__x;
            var oldY = this._private__y;
            var oldPrice = this._private__price;
            var oldIndex = this._private__index;
            var oldPane = this._private__pane;
            var priceScale = this._private__priceScaleByPane(newPane);
            this._private__index = newIndex;
            this._private__x = isNaN(newIndex) ? NaN : this._private__model.timeScale().indexToCoordinate(newIndex);
            this._private__pane = newPane;
            var firstValue = priceScale !== null ? priceScale.firstValue() : null;
            if (priceScale !== null && firstValue !== null) {
                this._private__price = newPrice;
                this._private__y = priceScale.priceToCoordinate(newPrice, firstValue);
            }
            else {
                this._private__price = NaN;
                this._private__y = NaN;
            }
            return (oldX !== this._private__x || oldY !== this._private__y || oldIndex !== this._private__index ||
                oldPrice !== this._private__price || oldPane !== this._private__pane);
        };
        Crosshair.prototype._private__setIndexToLastSeriesBarIndex = function () {
            var lastIndexes = this._private__model.serieses()
                .map(function (s) { return s.bars().lastIndex(); })
                .filter(notNull);
            var lastBarIndex = (lastIndexes.length === 0) ? null : Math.max.apply(Math, lastIndexes);
            this._private__index = lastBarIndex !== null ? lastBarIndex : NaN;
        };
        Crosshair.prototype._private__createPriceAxisViewOnDemand = function (map, priceScale, valueProvider) {
            var view = map.get(priceScale);
            if (view === undefined) {
                view = new CrosshairPriceAxisLabelView(this, priceScale, valueProvider);
                map.set(priceScale, view);
            }
            return view;
        };
        return Crosshair;
    }(DataSource));

    function isDefaultPriceScale(priceScaleId) {
        return priceScaleId === "left" /* Left */ || priceScaleId === "right" /* Right */;
    }

    function mergePaneInvalidation(beforeValue, newValue) {
        if (beforeValue === undefined) {
            return newValue;
        }
        var level = Math.max(beforeValue.level, newValue.level);
        var autoScale = beforeValue.autoScale || newValue.autoScale;
        return { level: level, autoScale: autoScale };
    }
    var InvalidateMask = /** @class */ (function () {
        function InvalidateMask(globalLevel) {
            this._private__invalidatedPanes = new Map();
            this._private__timeScaleInvalidations = [];
            this._private__globalLevel = globalLevel;
        }
        InvalidateMask.prototype.invalidatePane = function (paneIndex, invalidation) {
            var prevValue = this._private__invalidatedPanes.get(paneIndex);
            var newValue = mergePaneInvalidation(prevValue, invalidation);
            this._private__invalidatedPanes.set(paneIndex, newValue);
        };
        InvalidateMask.prototype.fullInvalidation = function () {
            return this._private__globalLevel;
        };
        InvalidateMask.prototype.invalidateForPane = function (paneIndex) {
            var paneInvalidation = this._private__invalidatedPanes.get(paneIndex);
            if (paneInvalidation === undefined) {
                return {
                    level: this._private__globalLevel,
                };
            }
            return {
                level: Math.max(this._private__globalLevel, paneInvalidation.level),
                autoScale: paneInvalidation.autoScale,
            };
        };
        InvalidateMask.prototype.setFitContent = function () {
            // modifies both bar spacing and right offset
            this._private__timeScaleInvalidations = [{ type: 0 /* FitContent */ }];
        };
        InvalidateMask.prototype.applyRange = function (range) {
            // modifies both bar spacing and right offset
            this._private__timeScaleInvalidations = [{ type: 1 /* ApplyRange */, value: range }];
        };
        InvalidateMask.prototype.resetTimeScale = function () {
            // modifies both bar spacing and right offset
            this._private__timeScaleInvalidations = [{ type: 4 /* Reset */ }];
        };
        InvalidateMask.prototype.setBarSpacing = function (barSpacing) {
            this._private__timeScaleInvalidations.push({ type: 2 /* ApplyBarSpacing */, value: barSpacing });
        };
        InvalidateMask.prototype.setRightOffset = function (offset) {
            this._private__timeScaleInvalidations.push({ type: 3 /* ApplyRightOffset */, value: offset });
        };
        InvalidateMask.prototype.timeScaleInvalidations = function () {
            return this._private__timeScaleInvalidations;
        };
        InvalidateMask.prototype.merge = function (other) {
            var _this = this;
            for (var _i = 0, _a = other._private__timeScaleInvalidations; _i < _a.length; _i++) {
                var tsInvalidation = _a[_i];
                this._private__applyTimeScaleInvalidation(tsInvalidation);
            }
            this._private__globalLevel = Math.max(this._private__globalLevel, other._private__globalLevel);
            other._private__invalidatedPanes.forEach(function (invalidation, index) {
                _this.invalidatePane(index, invalidation);
            });
        };
        InvalidateMask.prototype._private__applyTimeScaleInvalidation = function (invalidation) {
            switch (invalidation.type) {
                case 0 /* FitContent */:
                    this.setFitContent();
                    break;
                case 1 /* ApplyRange */:
                    this.applyRange(invalidation.value);
                    break;
                case 2 /* ApplyBarSpacing */:
                    this.setBarSpacing(invalidation.value);
                    break;
                case 3 /* ApplyRightOffset */:
                    this.setRightOffset(invalidation.value);
                    break;
                case 4 /* Reset */:
                    this.resetTimeScale();
                    break;
            }
        };
        return InvalidateMask;
    }());

    /* eslint-disable @typescript-eslint/naming-convention */
    var TextDefaults = {
        value: '',
        padding: 0,
        wordWrapWidth: 0,
        forceTextAlign: false,
        forceCalculateMaxLineWidth: false,
        alignment: "left" /* Left */,
        font: { family: defaultFontFamily, color: '#2962ff', size: 12, bold: false, italic: false },
        box: { scale: 1, angle: 0, alignment: { vertical: "bottom" /* Bottom */, horizontal: "left" /* Left */ } },
    };
    var TrendLineOptionDefaults = {
        visible: true,
        line: {
            width: 1,
            color: '#2962ff',
            style: 0 /* Solid */,
            extend: { left: false, right: false },
            end: { left: 0 /* Normal */, right: 0 /* Normal */ },
        },
        text: TextDefaults,
    };
    var HorizontalLineOptionDefaults = {
        visible: true,
        line: {
            width: 1,
            color: '#2962ff',
            style: 0 /* Solid */,
            extend: { left: true, right: true },
            end: { left: 0 /* Normal */, right: 0 /* Normal */ },
        },
        text: TextDefaults,
    };
    var ParallelChannelOptionDefaults = {
        visible: true,
        showMiddleLine: true,
        extend: { left: false, right: false },
        background: { color: applyAlpha('#2962ff', 0.2) },
        middleLine: { width: 1, color: '#2962ff', style: 2 /* Dashed */ },
        channelLine: { width: 1, color: '#2962ff', style: 0 /* Solid */ },
    };
    var FibRetracementOptionDefaults = {
        visible: true,
        extend: { left: false, right: false },
        line: { width: 1, style: 0 /* Solid */ },
        levels: [
            { color: '#787b86', coeff: 0 },
            { color: '#f23645', coeff: 0.236 },
            { color: '#81c784', coeff: 0.382 },
            { color: '#4caf50', coeff: 0.5 },
            { color: '#089981', coeff: 0.618 },
            { color: '#64b5f6', coeff: 0.786 },
            { color: '#787b86', coeff: 1 },
            { color: '#2962ff', coeff: 1.618 },
            { color: '#f23645', coeff: 2.618 },
            { color: '#9c27b0', coeff: 3.618 },
            { color: '#e91e63', coeff: 4.236 },
        ],
    };
    var BrushOptionDefaults = {
        visible: true,
        line: {
            width: 1,
            color: '#00bcd4',
            join: "round" /* Round */,
            style: 0 /* Solid */,
            end: { left: 0 /* Normal */, right: 0 /* Normal */ },
        },
    };
    var RectangleOptionDefaults = {
        visible: true,
        rectangle: {
            extend: { left: false, right: false },
            background: { color: applyAlpha('#9c27b0', 0.2) },
            border: { width: 1, style: 0 /* Solid */, color: '#9c27b0' },
        },
        text: TextDefaults,
    };
    var TriangleOptionDefaults = {
        visible: true,
        triangle: {
            background: { color: applyAlpha('#f57c00', 0.2) },
            border: { width: 1, style: 0 /* Solid */, color: '#f57c00' },
        },
    };
    var VerticalLineOptionDefaults = {
        visible: true,
        text: TextDefaults,
        line: { width: 1, color: '#2962ff', style: 0 /* Solid */ },
    };
    var PathOptionDefaults = {
        visible: true,
        line: {
            width: 1,
            color: '#2962ff',
            style: 0 /* Solid */,
            end: { left: 0 /* Normal */, right: 1 /* Arrow */ },
        },
    };
    var CrossLineOptionDefaults = {
        visible: true,
        line: { width: 1, color: '#2962ff', style: 0 /* Solid */ },
    };
    var HighlighterOptionDefaults = {
        visible: true,
        line: { color: applyAlpha('#f23645', 0.15) },
    };
    var TextOptionDefaults = {
        visible: true,
        text: merge(clone(TextDefaults), { value: 'Text' }),
    };
    /** @public */
    var LineToolsOptionDefaults = {
        Ray: merge(clone(TrendLineOptionDefaults), { line: { extend: { right: true } } }),
        Arrow: merge(clone(TrendLineOptionDefaults), { line: { end: { right: 1 /* Arrow */ } } }),
        ExtendedLine: merge(clone(TrendLineOptionDefaults), { line: { extend: { right: true, left: true } } }),
        HorizontalRay: merge(clone(HorizontalLineOptionDefaults), { line: { extend: { left: false } } }),
        FibRetracement: FibRetracementOptionDefaults,
        ParallelChannel: ParallelChannelOptionDefaults,
        HorizontalLine: HorizontalLineOptionDefaults,
        VerticalLine: VerticalLineOptionDefaults,
        Highlighter: HighlighterOptionDefaults,
        CrossLine: CrossLineOptionDefaults,
        TrendLine: TrendLineOptionDefaults,
        Rectangle: RectangleOptionDefaults,
        Triangle: TriangleOptionDefaults,
        Brush: BrushOptionDefaults,
        Path: PathOptionDefaults,
        Text: TextOptionDefaults,
    };

    var PriceAxisBackgroundRenderer = /** @class */ (function () {
        function PriceAxisBackgroundRenderer() {
            this._private__data = null;
        }
        PriceAxisBackgroundRenderer.prototype._internal_setData = function (data) {
            this._private__data = data;
        };
        PriceAxisBackgroundRenderer.prototype.drawBackground = function (ctx, rendererOptions, renderParams) {
            if (this._private__data === null || this._private__data._internal_visible === false) {
                return;
            }
            var _a = this._private__data, y = _a._internal_coordinate, height = _a._internal_height, color = _a._internal_color;
            var width = ctx.canvas.clientWidth;
            drawScaled(ctx, renderParams.pixelRatio, function () {
                ctx.fillStyle = color;
                ctx.fillRect(0, y, width, height);
            });
        };
        return PriceAxisBackgroundRenderer;
    }());

    var LineToolPriceAxisBackgroundView = /** @class */ (function () {
        function LineToolPriceAxisBackgroundView(lineTool) {
            this._internal__renderer = new PriceAxisBackgroundRenderer();
            this._internal__invalidated = true;
            this._internal__rendererData = {
                _internal_color: 'rgba(41, 98, 255, 0.25)',
                _internal_visible: false,
                _internal_coordinate: 0,
                _internal_height: 0,
            };
            this._internal__source = lineTool;
            this._internal__model = lineTool.model();
            this._internal__renderer._internal_setData(this._internal__rendererData);
        }
        LineToolPriceAxisBackgroundView.prototype.update = function () {
            this._internal__invalidated = true;
        };
        LineToolPriceAxisBackgroundView.prototype.renderer = function () {
            if (this._internal__invalidated) {
                this._internal__updateImpl();
            }
            this._internal__invalidated = false;
            return this._internal__renderer;
        };
        LineToolPriceAxisBackgroundView.prototype._internal__updateImpl = function () {
            this._internal__rendererData._internal_visible = false;
            var priceScale = this._internal__source.priceScale();
            if (!priceScale || priceScale.isEmpty()) {
                return;
            }
            if (!this._internal__source.selected()) {
                return;
            }
            var x = this._internal__source.priceAxisPoints().map(function (point) {
                return priceScale.priceToCoordinate(point.price, point.price);
            });
            var max = Math.max.apply(Math, x);
            var min = Math.min.apply(Math, x);
            this._internal__rendererData._internal_coordinate = min;
            this._internal__rendererData._internal_height = max - min;
            this._internal__rendererData._internal_visible = true;
            this._internal__invalidated = false;
        };
        return LineToolPriceAxisBackgroundView;
    }());

    var LineToolPriceAxisLabelView = /** @class */ (function (_super) {
        __extends(LineToolPriceAxisLabelView, _super);
        function LineToolPriceAxisLabelView(lineTool, pointIndex) {
            var _this = _super.call(this) || this;
            _this._internal__active = false;
            _this._internal__active = false;
            _this._internal__source = lineTool;
            _this._internal__pointIndex = pointIndex;
            return _this;
        }
        LineToolPriceAxisLabelView.prototype._internal_setActive = function (active) {
            this._internal__active = active;
        };
        LineToolPriceAxisLabelView.prototype._internal__updateRendererData = function (axisRenderData, paneRenderData, commonRendererData) {
            var _a;
            axisRenderData._internal_visible = false;
            var chartModel = this._internal__source.model();
            if (!chartModel.timeScale() || chartModel.timeScale().isEmpty()) {
                return;
            }
            var background = this._internal__getBackgroundColor();
            if (background === null) {
                return;
            }
            var priceScale = this._internal__source.priceScale();
            if (priceScale === null || priceScale.isEmpty()) {
                return;
            }
            if (chartModel.timeScale().visibleStrictRange() === null) {
                return;
            }
            var points = this._internal__source.priceAxisPoints();
            if (points.length <= this._internal__pointIndex) {
                return;
            }
            var point = points[this._internal__pointIndex];
            if (!isFinite(point.price)) {
                return;
            }
            var ownerSource = this._internal__source.ownerSource();
            var firstValue = null !== ownerSource ? ownerSource.firstValue() : null;
            if (null === firstValue) {
                return;
            }
            commonRendererData._internal_background = background;
            commonRendererData._internal_color = generateContrastColors(commonRendererData._internal_background)._internal_foreground;
            commonRendererData._internal_coordinate = priceScale.priceToCoordinate(point.price, firstValue.value);
            axisRenderData._internal_text = ((_a = this._internal__source.priceScale()) === null || _a === void 0 ? void 0 : _a.formatPrice(point.price, firstValue.value)) || '';
            axisRenderData._internal_visible = true;
        };
        LineToolPriceAxisLabelView.prototype._internal__getBackgroundColor = function () {
            return this._internal__source.priceAxisLabelColor();
        };
        return LineToolPriceAxisLabelView;
    }(PriceAxisLabelView));

    var TimeAxisBackgroundRenderer = /** @class */ (function () {
        function TimeAxisBackgroundRenderer() {
            this._private__data = null;
        }
        TimeAxisBackgroundRenderer.prototype._internal_setData = function (data) {
            this._private__data = data;
        };
        TimeAxisBackgroundRenderer.prototype.drawBackground = function (ctx, rendererOptions, renderParams) {
            if (this._private__data === null || this._private__data._internal_visible === false) {
                return;
            }
            var _a = this._private__data, x = _a._internal_coordinate, width = _a._internal_width, color = _a._internal_color;
            var height = ctx.canvas.clientHeight;
            drawScaled(ctx, renderParams.pixelRatio, function () {
                ctx.fillStyle = color;
                ctx.fillRect(x, 0, width, height);
            });
        };
        return TimeAxisBackgroundRenderer;
    }());

    var LineToolTimeAxisBackgroundView = /** @class */ (function () {
        function LineToolTimeAxisBackgroundView(lineTool) {
            this._internal__renderer = new TimeAxisBackgroundRenderer();
            this._internal__invalidated = true;
            this._internal__rendererData = {
                _internal_color: 'rgba(41, 98, 255, 0.25)',
                _internal_visible: false,
                _internal_coordinate: 0,
                _internal_width: 0,
            };
            this._internal__source = lineTool;
            this._internal__model = lineTool.model();
            this._internal__renderer._internal_setData(this._internal__rendererData);
        }
        LineToolTimeAxisBackgroundView.prototype.update = function () {
            this._internal__invalidated = true;
        };
        LineToolTimeAxisBackgroundView.prototype.renderer = function () {
            if (this._internal__invalidated) {
                this._internal__updateImpl();
            }
            this._internal__invalidated = false;
            return this._internal__renderer;
        };
        LineToolTimeAxisBackgroundView.prototype._internal__updateImpl = function () {
            var _this = this;
            this._internal__rendererData._internal_visible = false;
            if (this._internal__model.timeScale().isEmpty()) {
                return;
            }
            if (!this._internal__source.selected()) {
                return;
            }
            var y = this._internal__source.timeAxisPoints().map(function (point) {
                return _this._internal__model.timeScale().timeToCoordinate({ timestamp: point.timestamp });
            });
            var max = Math.max.apply(Math, y);
            var min = Math.min.apply(Math, y);
            this._internal__rendererData._internal_coordinate = min;
            this._internal__rendererData._internal_width = max - min;
            this._internal__rendererData._internal_visible = true;
            this._internal__invalidated = false;
        };
        return LineToolTimeAxisBackgroundView;
    }());

    var LineToolTimeAxisLabelView = /** @class */ (function (_super) {
        __extends(LineToolTimeAxisLabelView, _super);
        function LineToolTimeAxisLabelView(lineTool, pointIndex) {
            var _this = _super.call(this, lineTool.model()) || this;
            _this._internal__source = lineTool;
            _this._internal__pointIndex = pointIndex;
            return _this;
        }
        LineToolTimeAxisLabelView.prototype._internal__getBackgroundColor = function () {
            return this._internal__source.timeAxisLabelColor();
        };
        LineToolTimeAxisLabelView.prototype._internal__getTime = function () {
            var points = this._internal__source.timeAxisPoints();
            return points.length <= this._internal__pointIndex ? null : points[this._internal__pointIndex].timestamp;
        };
        return LineToolTimeAxisLabelView;
    }(TimeAxisLabelView));

    var LineTool = /** @class */ (function (_super) {
        __extends(LineTool, _super);
        function LineTool(model, options, points) {
            if (points === void 0) { points = []; }
            var _this = _super.call(this) || this;
            _this._pointChanged = new Delegate();
            _this._pointAdded = new Delegate();
            _this._priceAxisViews = [];
            _this._timeAxisViews = [];
            _this._paneViews = [];
            _this._hovered = false;
            _this._selected = false;
            _this._finished = false;
            _this._editing = false;
            _this._ownerSource = null;
            _this._lastPoint = null;
            _this._points = [];
            _this._model = model;
            _this._points = points;
            _this._options = options;
            for (var i = 0; i < _this.pointsCount(); i++) {
                _this._priceAxisViews.push(new LineToolPriceAxisLabelView(_this, i));
                _this._timeAxisViews.push(new LineToolTimeAxisLabelView(_this, i));
            }
            if (_this.pointsCount() > 1) {
                _this._priceAxisViews.push(new LineToolPriceAxisBackgroundView(_this));
                _this._timeAxisViews.push(new LineToolTimeAxisBackgroundView(_this));
            }
            // TODO: iosif change to use the ownerSourceId
            // this._ownerSource = model.serieses().find((series: IPriceDataSource) => series.id() === this._options.ownerSourceId) || null;
            _this._ownerSource = model.serieses()[0];
            _this._finished = _this._points.length >= (_this.pointsCount() === -1 ? 2 : _this.pointsCount());
            return _this;
        }
        LineTool.prototype.finished = function () {
            return this._finished;
        };
        LineTool.prototype.tryFinish = function () {
            if (this._points.length >= Math.max(1, this.pointsCount())) {
                this._finished = true;
                this._selected = true;
                this._lastPoint = null;
                this.model().updateSource(this);
            }
        };
        LineTool.prototype.points = function () {
            var points = __spreadArray(__spreadArray([], this._points, true), (this._lastPoint ? [this._lastPoint] : []), true);
            return this.pointsCount() === -1 ? points : points.slice(0, this.pointsCount());
        };
        LineTool.prototype.addPoint = function (point) {
            this._points.push(point);
        };
        LineTool.prototype.getPoint = function (index) {
            return this.points()[index] || null;
        };
        LineTool.prototype.setPoint = function (index, point) {
            this._points[index].price = point.price;
            this._points[index].timestamp = point.timestamp;
        };
        LineTool.prototype.setPoints = function (points) {
            this._points = points;
        };
        LineTool.prototype.setLastPoint = function (point) {
            this._lastPoint = point;
        };
        LineTool.prototype.pointToScreenPoint = function (linePoint) {
            var _a, _b;
            var baseValue = ((_b = (_a = this.ownerSource()) === null || _a === void 0 ? void 0 : _a.firstValue()) === null || _b === void 0 ? void 0 : _b.value) || 0;
            var priceScale = this.priceScale();
            var timeScale = this.timeScale();
            if (!priceScale || priceScale.isEmpty() || timeScale.isEmpty()) {
                return null;
            }
            var x = timeScale.timeToCoordinate({ timestamp: linePoint.timestamp });
            var y = priceScale.priceToCoordinate(linePoint.price, baseValue);
            return new Point(x, y);
        };
        LineTool.prototype.screenPointToPoint = function (point) {
            var _a, _b;
            var baseValue = ((_b = (_a = this.ownerSource()) === null || _a === void 0 ? void 0 : _a.firstValue()) === null || _b === void 0 ? void 0 : _b.value) || 0;
            var priceScale = this.priceScale();
            var timeScale = this.timeScale();
            if (!priceScale) {
                return null;
            }
            var price = priceScale.coordinateToPrice(point.y, baseValue);
            var timestamp = timeScale.coordinateToTime(point.x).timestamp;
            return { price: price, timestamp: timestamp };
        };
        LineTool.prototype.state = function () {
            return { id: this.id(), type: this._toolType, options: this._options };
        };
        LineTool.prototype.priceScale = function () {
            // TODO: iosif update to use the onwer source price scale
            return this._model.panes()[0].rightPriceScale();
            // return this._ownerSource ? this._ownerSource.priceScale() : null;
        };
        LineTool.prototype.timeScale = function () {
            return this._model.timeScale();
        };
        LineTool.prototype.ownerSource = function () {
            return this._ownerSource;
        };
        LineTool.prototype.options = function () {
            return this._options;
        };
        LineTool.prototype.visible = function () {
            return this._options.visible;
        };
        LineTool.prototype.applyOptions = function (options) {
            merge(this._options, options);
            this.model().updateSource(this);
            this._paneViews.forEach(function (paneView) {
                paneView.update('options');
            });
        };
        LineTool.prototype.paneViews = function (pane) {
            return this._paneViews;
        };
        LineTool.prototype.updateAllViews = function () {
            if (!this.options().visible) {
                return;
            }
            this._updateAllPaneViews();
            for (var i = 0; i < this._priceAxisViews.length; i++) {
                this._priceAxisViews[i].update();
            }
            for (var i = 0; i < this._timeAxisViews.length; i++) {
                this._timeAxisViews[i].update();
            }
        };
        LineTool.prototype.hovered = function () {
            return this._hovered;
        };
        LineTool.prototype.setHovered = function (hovered) {
            var changed = hovered !== this._hovered;
            this._hovered = hovered;
            return changed;
        };
        LineTool.prototype.selected = function () {
            return this._selected;
        };
        LineTool.prototype.setSelected = function (selected) {
            var changed = selected !== this._selected;
            this._selected = selected;
            if (changed) {
                this.updateAllViews();
            }
            return changed;
        };
        LineTool.prototype.editing = function () {
            return this._editing;
        };
        LineTool.prototype.setEditing = function (editing) {
            var changed = editing !== this._editing;
            this._editing = editing;
            return changed;
        };
        LineTool.prototype.model = function () {
            return this._model;
        };
        LineTool.prototype.toolType = function () {
            return this._toolType;
        };
        LineTool.prototype.destroy = function () { };
        LineTool.prototype.timeAxisPoints = function () {
            return this.points();
        };
        LineTool.prototype.priceAxisPoints = function () {
            return this.points();
        };
        LineTool.prototype.timeAxisLabelColor = function () {
            return this.selected() ? '#2962FF' : null;
        };
        LineTool.prototype.priceAxisLabelColor = function () {
            return this.selected() ? '#2962FF' : null;
        };
        LineTool.prototype.timeAxisViews = function () {
            return this._timeAxisViews;
        };
        LineTool.prototype.priceAxisViews = function () {
            return this._priceAxisViews;
        };
        LineTool.prototype.lineDrawnWithPressedButton = function () {
            return false;
        };
        LineTool.prototype.hasMagnet = function () {
            return true;
        };
        LineTool.prototype._setPaneViews = function (paneViews) {
            this._paneViews = paneViews;
        };
        LineTool.prototype._updateAllPaneViews = function () {
            this._paneViews.forEach(function (paneView) { return paneView.update(); });
        };
        return LineTool;
    }(DataSource));

    function deepCopy(value) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        var copy;
        if (typeof value != 'object' ||
            value === null ||
            typeof value.nodeType == 'number') {
            copy = value;
        }
        else if (value instanceof Date) {
            copy = new Date(value.valueOf());
        }
        else if (Array.isArray(value)) {
            copy = [];
            for (var i = 0; i < value.length; i++) {
                if (Object.prototype.hasOwnProperty.call(value, i)) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    copy[i] = deepCopy(value[i]);
                }
            }
        }
        else {
            copy = {};
            Object.keys(value).forEach(function (key) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                copy[key] = deepCopy(value[key]);
            });
        }
        return copy;
    }

    var HitTestResult = /** @class */ (function () {
        function HitTestResult(type, data) {
            this._private__type = type;
            this._private__data = data || null;
        }
        HitTestResult.prototype.type = function () {
            return this._private__type;
        };
        HitTestResult.prototype.data = function () {
            return this._private__data;
        };
        return HitTestResult;
    }());
    var HitTestType;
    (function (HitTestType) {
        HitTestType[HitTestType["Regular"] = 1] = "Regular";
        HitTestType[HitTestType["MovePoint"] = 2] = "MovePoint";
        HitTestType[HitTestType["MovePointBackground"] = 3] = "MovePointBackground";
        HitTestType[HitTestType["ChangePoint"] = 4] = "ChangePoint";
        HitTestType[HitTestType["Custom"] = 5] = "Custom";
    })(HitTestType || (HitTestType = {}));

    function optimalBarWidth(barSpacing, pixelRatio) {
        return Math.floor(barSpacing * 0.3 * pixelRatio);
    }
    function optimalCandlestickWidth(barSpacing, pixelRatio) {
        var barSpacingSpecialCaseFrom = 2.5;
        var barSpacingSpecialCaseTo = 4;
        var barSpacingSpecialCaseCoeff = 3;
        if (barSpacing >= barSpacingSpecialCaseFrom && barSpacing <= barSpacingSpecialCaseTo) {
            return Math.floor(barSpacingSpecialCaseCoeff * pixelRatio);
        }
        // coeff should be 1 on small barspacing and go to 0.8 while groing bar spacing
        var barSpacingReducingCoeff = 0.2;
        var coeff = 1 - barSpacingReducingCoeff * Math.atan(Math.max(barSpacingSpecialCaseTo, barSpacing) - barSpacingSpecialCaseTo) / (Math.PI * 0.5);
        var res = Math.floor(barSpacing * coeff * pixelRatio);
        var scaledBarSpacing = Math.floor(barSpacing * pixelRatio);
        var optimal = Math.min(res, scaledBarSpacing);
        return Math.max(Math.floor(pixelRatio), optimal);
    }
    var interactionTolerance = {
        _internal_line: 3,
        _internal_minDistanceBetweenPoints: 5,
        _internal_series: 2,
        _internal_curve: 3,
        _internal_anchor: 2,
        _internal_esd: 0,
    };

    var SegmentRenderer = /** @class */ (function () {
        function SegmentRenderer() {
            this._internal__data = null;
            this._internal__hitTest = new HitTestResult(HitTestType.MovePoint);
        }
        SegmentRenderer.prototype._internal_setData = function (data) {
            this._internal__data = data;
        };
        SegmentRenderer.prototype._internal_setHitTest = function (hitTest) {
            this._internal__hitTest = hitTest;
        };
        SegmentRenderer.prototype.draw = function (ctx, renderParams) {
            if (!this._internal__data || this._internal__data._internal_points.length < 2) {
                return;
            }
            var pixelRatio = renderParams.pixelRatio;
            var lineWidth = this._internal__data._internal_line.width || 1;
            var lineColor = this._internal__data._internal_line.color || 'white';
            var lineStyle = this._internal__data._internal_line.style || 0 /* Solid */;
            ctx.lineCap = 'butt';
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = Math.max(1, Math.floor(lineWidth * pixelRatio));
            setLineStyle(ctx, lineStyle);
            var point0 = this._internal__data._internal_points[0];
            var point1 = this._internal__data._internal_points[1];
            this._private__drawEnds(ctx, [point0, point1], lineWidth, pixelRatio);
            var line = this._private__extendAndClipLineSegment(point0, point1, renderParams);
            if (line !== null && lineWidth > 0) {
                if (line[0].x === line[1].x) {
                    drawVerticalLine(ctx, Math.round(line[0].x * pixelRatio), line[0].y * pixelRatio, line[1].y * pixelRatio);
                }
                else if (line[0].y === line[1].y) {
                    drawHorizontalLine(ctx, Math.round(line[0].y * pixelRatio), line[0].x * pixelRatio, line[1].x * pixelRatio);
                }
                else {
                    drawLine(ctx, line[0].x * pixelRatio, line[0].y * pixelRatio, line[1].x * pixelRatio, line[1].y * pixelRatio);
                }
            }
        };
        SegmentRenderer.prototype.hitTest = function (point, renderParams) {
            if (this._internal__data === null || this._internal__data._internal_points.length < 2) {
                return null;
            }
            var tolerance = interactionTolerance._internal_line;
            var line = this._private__extendAndClipLineSegment(this._internal__data._internal_points[0], this._internal__data._internal_points[1], renderParams);
            if (null !== line && distanceToSegment(line[0], line[1], point)._internal_distance <= tolerance) {
                return this._internal__hitTest;
            }
            return null;
        };
        SegmentRenderer.prototype._private__extendAndClipLineSegment = function (end0, end1, renderParams) {
            var _a, _b;
            var data = ensureNotNull(this._internal__data);
            return extendAndClipLineSegment(end0, end1, renderParams.cssWidth, renderParams.cssHeight, !!((_a = data._internal_line.extend) === null || _a === void 0 ? void 0 : _a.left), !!((_b = data._internal_line.extend) === null || _b === void 0 ? void 0 : _b.right));
        };
        SegmentRenderer.prototype._private__drawEnds = function (ctx, points, width, pixelRatio) {
            var _a, _b;
            var data = ensureNotNull(this._internal__data);
            switch ((_a = data._internal_line.end) === null || _a === void 0 ? void 0 : _a.left) {
                case 1 /* Arrow */:
                    drawArrowEnd(points[1], points[0], ctx, width, pixelRatio);
                    break;
                case 2 /* Circle */:
                    drawCircleEnd(points[0], ctx, width, pixelRatio);
            }
            switch ((_b = data._internal_line.end) === null || _b === void 0 ? void 0 : _b.right) {
                case 1 /* Arrow */:
                    drawArrowEnd(points[0], points[1], ctx, width, pixelRatio);
                    break;
                case 2 /* Circle */:
                    drawCircleEnd(points[1], ctx, width, pixelRatio);
            }
        };
        return SegmentRenderer;
    }());

    function drawRoundRect(ctx, x, y, width, height, radius) {
        var a;
        var b;
        var c;
        var d;
        if (Array.isArray(radius)) {
            if (2 === radius.length) {
                var e = Math.max(0, radius[0]);
                var t = Math.max(0, radius[1]);
                a = e;
                b = e;
                c = t;
                d = t;
            }
            else {
                if (4 !== radius.length) {
                    throw new Error('Wrong border radius - it should be like css border radius');
                }
                a = Math.max(0, radius[0]);
                b = Math.max(0, radius[1]);
                c = Math.max(0, radius[2]);
                d = Math.max(0, radius[3]);
            }
        }
        else {
            var e = Math.max(0, radius);
            a = e;
            b = e;
            c = e;
            d = e;
        }
        ctx.beginPath();
        ctx.moveTo(x + a, y);
        ctx.lineTo(x + width - b, y);
        if (b !== 0) {
            ctx.arcTo(x + width, y, x + width, y + b, b);
        }
        ctx.lineTo(x + width, y + height - c);
        if (c !== 0) {
            ctx.arcTo(x + width, y + height, x + width - c, y + height, c);
        }
        ctx.lineTo(x + d, y + height);
        if (d !== 0) {
            ctx.arcTo(x, y + height, x, y + height - d, d);
        }
        ctx.lineTo(x, y + a);
        if (a !== 0) {
            ctx.arcTo(x, y, x + a, y, a);
        }
    }
    // eslint-disable-next-line max-params
    function fillRectWithBorder(ctx, point0, point1, backgroundColor, borderColor, borderWidth, borderStyle, borderAlign, extendLeft, extendRight, containerWidth) {
        if (borderWidth === void 0) { borderWidth = 0; }
        var x1 = extendLeft ? 0 : point0.x;
        var x2 = extendRight ? containerWidth : point1.x;
        if (backgroundColor !== undefined) {
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(x1, point0.y, x2 - x1, point1.y - point0.y);
        }
        if (borderColor !== undefined && borderWidth > 0) {
            ctx.beginPath();
            setLineStyle(ctx, borderStyle || 0 /* Solid */);
            var topLeft = new Point(0, 0);
            var topRight = new Point(0, 0);
            var bottomRight = new Point(0, 0);
            var bottomLeft = new Point(0, 0);
            switch (borderAlign) {
                case 'outer':
                    {
                        var halfBordeWidth = 0.5 * borderWidth;
                        bottomRight = new Point(0, halfBordeWidth);
                        bottomLeft = new Point(0, halfBordeWidth);
                        topLeft = new Point(halfBordeWidth, -borderWidth);
                        topRight = new Point(halfBordeWidth, -borderWidth);
                        break;
                    }
                case 'center':
                    {
                        var e = borderWidth % 2 ? 0.5 : 0;
                        var t = borderWidth % 2 ? 0.5 : 1;
                        var halfBordeWidth = 0.5 * borderWidth;
                        bottomRight = new Point(halfBordeWidth - e, -e);
                        bottomLeft = new Point(t + halfBordeWidth, -e);
                        topLeft = new Point(-e, e + halfBordeWidth);
                        topRight = new Point(t, e + halfBordeWidth);
                        break;
                    }
                case 'inner':
                    {
                        var halfBordeWidth = 0.5 * borderWidth;
                        bottomRight = new Point(0, -halfBordeWidth);
                        bottomLeft = new Point(1, -halfBordeWidth);
                        topLeft = new Point(-halfBordeWidth, borderWidth);
                        topRight = new Point(1 - halfBordeWidth, borderWidth);
                        break;
                    }
            }
            ctx.lineWidth = borderWidth;
            ctx.strokeStyle = borderColor;
            ctx.moveTo(x1 - bottomRight.x, point0.y - bottomRight.y);
            ctx.lineTo(x2 + bottomLeft.x, point0.y - bottomLeft.y);
            ctx.moveTo(point1.x + topRight.x, point0.y + topRight.y);
            ctx.lineTo(point1.x + topRight.x, point1.y - topRight.y);
            ctx.moveTo(x1 - bottomRight.x, point1.y + bottomRight.y);
            ctx.lineTo(x2 + bottomLeft.x, point1.y + bottomLeft.y);
            ctx.moveTo(point0.x - topLeft.x, point0.y + topLeft.y);
            ctx.lineTo(point0.x - topLeft.x, point1.y - topLeft.y);
            ctx.stroke();
        }
    }

    var TextRenderer = /** @class */ (function () {
        function TextRenderer(data, hitTest) {
            this._internal__internalData = null;
            this._internal__polygonPoints = null;
            this._internal__linesInfo = null;
            this._internal__fontInfo = null;
            this._internal__boxSize = null;
            this._internal__data = null;
            this._internal__hitTest = hitTest || new HitTestResult(HitTestType.MovePoint);
            if (data !== undefined) {
                this._internal_setData(data);
            }
        }
        TextRenderer.prototype._internal_setData = function (data) {
            // eslint-disable-next-line complexity
            function checkUnchanged(before, after) {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21, _22, _23, _24, _25, _26, _27, _28, _29, _30, _31, _32, _33, _34, _35, _36, _37, _38, _39, _40, _41, _42, _43, _44, _45, _46, _47, _48, _49, _50, _51, _52, _53, _54, _55, _56, _57, _58, _59, _60, _61, _62, _63, _64, _65, _66, _67, _68, _69, _70, _71, _72, _73, _74, _75, _76, _77, _78, _79, _80, _81, _82, _83, _84, _85, _86, _87, _88, _89, _90, _91, _92, _93, _94, _95, _96, _97;
                if (null === before || null === after) {
                    return null === before === (null === after);
                }
                if (before._internal_points === undefined !== (after._internal_points === undefined)) {
                    return false;
                }
                if (before._internal_points !== undefined && after._internal_points !== undefined) {
                    if (before._internal_points.length !== after._internal_points.length) {
                        return false;
                    }
                    for (var i = 0; i < before._internal_points.length; ++i) {
                        if (before._internal_points[i].x !== after._internal_points[i].x || before._internal_points[i].y !== after._internal_points[i].y) {
                            return false;
                        }
                    }
                }
                return ((_a = before._internal_text) === null || _a === void 0 ? void 0 : _a.forceCalculateMaxLineWidth) === ((_b = after._internal_text) === null || _b === void 0 ? void 0 : _b.forceCalculateMaxLineWidth)
                    && ((_c = before._internal_text) === null || _c === void 0 ? void 0 : _c.forceTextAlign) === ((_d = after._internal_text) === null || _d === void 0 ? void 0 : _d.forceTextAlign)
                    && ((_e = before._internal_text) === null || _e === void 0 ? void 0 : _e.wordWrapWidth) === ((_f = after._internal_text) === null || _f === void 0 ? void 0 : _f.wordWrapWidth)
                    && ((_g = before._internal_text) === null || _g === void 0 ? void 0 : _g.padding) === ((_h = after._internal_text) === null || _h === void 0 ? void 0 : _h.padding)
                    && ((_j = before._internal_text) === null || _j === void 0 ? void 0 : _j.value) === ((_k = after._internal_text) === null || _k === void 0 ? void 0 : _k.value)
                    && ((_l = before._internal_text) === null || _l === void 0 ? void 0 : _l.alignment) === ((_m = after._internal_text) === null || _m === void 0 ? void 0 : _m.alignment)
                    && ((_p = (_o = before._internal_text) === null || _o === void 0 ? void 0 : _o.font) === null || _p === void 0 ? void 0 : _p.bold) === ((_r = (_q = after._internal_text) === null || _q === void 0 ? void 0 : _q.font) === null || _r === void 0 ? void 0 : _r.bold)
                    && ((_t = (_s = before._internal_text) === null || _s === void 0 ? void 0 : _s.font) === null || _t === void 0 ? void 0 : _t.size) === ((_v = (_u = after._internal_text) === null || _u === void 0 ? void 0 : _u.font) === null || _v === void 0 ? void 0 : _v.size)
                    && ((_x = (_w = before._internal_text) === null || _w === void 0 ? void 0 : _w.font) === null || _x === void 0 ? void 0 : _x.family) === ((_z = (_y = after._internal_text) === null || _y === void 0 ? void 0 : _y.font) === null || _z === void 0 ? void 0 : _z.family)
                    && ((_1 = (_0 = before._internal_text) === null || _0 === void 0 ? void 0 : _0.font) === null || _1 === void 0 ? void 0 : _1.italic) === ((_3 = (_2 = after._internal_text) === null || _2 === void 0 ? void 0 : _2.font) === null || _3 === void 0 ? void 0 : _3.italic)
                    && ((_5 = (_4 = before._internal_text) === null || _4 === void 0 ? void 0 : _4.box) === null || _5 === void 0 ? void 0 : _5.angle) === ((_7 = (_6 = after._internal_text) === null || _6 === void 0 ? void 0 : _6.box) === null || _7 === void 0 ? void 0 : _7.angle)
                    && ((_9 = (_8 = before._internal_text) === null || _8 === void 0 ? void 0 : _8.box) === null || _9 === void 0 ? void 0 : _9.scale) === ((_11 = (_10 = after._internal_text) === null || _10 === void 0 ? void 0 : _10.box) === null || _11 === void 0 ? void 0 : _11.scale)
                    && ((_14 = (_13 = (_12 = before._internal_text) === null || _12 === void 0 ? void 0 : _12.box) === null || _13 === void 0 ? void 0 : _13.offset) === null || _14 === void 0 ? void 0 : _14.x) === ((_17 = (_16 = (_15 = after._internal_text) === null || _15 === void 0 ? void 0 : _15.box) === null || _16 === void 0 ? void 0 : _16.offset) === null || _17 === void 0 ? void 0 : _17.x)
                    && ((_20 = (_19 = (_18 = before._internal_text) === null || _18 === void 0 ? void 0 : _18.box) === null || _19 === void 0 ? void 0 : _19.offset) === null || _20 === void 0 ? void 0 : _20.y) === ((_23 = (_22 = (_21 = after._internal_text) === null || _21 === void 0 ? void 0 : _21.box) === null || _22 === void 0 ? void 0 : _22.offset) === null || _23 === void 0 ? void 0 : _23.y)
                    && ((_25 = (_24 = before._internal_text) === null || _24 === void 0 ? void 0 : _24.box) === null || _25 === void 0 ? void 0 : _25.maxHeight) === ((_27 = (_26 = after._internal_text) === null || _26 === void 0 ? void 0 : _26.box) === null || _27 === void 0 ? void 0 : _27.maxHeight)
                    && ((_30 = (_29 = (_28 = before._internal_text) === null || _28 === void 0 ? void 0 : _28.box) === null || _29 === void 0 ? void 0 : _29.padding) === null || _30 === void 0 ? void 0 : _30.x) === ((_33 = (_32 = (_31 = after._internal_text) === null || _31 === void 0 ? void 0 : _31.box) === null || _32 === void 0 ? void 0 : _32.padding) === null || _33 === void 0 ? void 0 : _33.x)
                    && ((_36 = (_35 = (_34 = before._internal_text) === null || _34 === void 0 ? void 0 : _34.box) === null || _35 === void 0 ? void 0 : _35.padding) === null || _36 === void 0 ? void 0 : _36.y) === ((_39 = (_38 = (_37 = after._internal_text) === null || _37 === void 0 ? void 0 : _37.box) === null || _38 === void 0 ? void 0 : _38.padding) === null || _39 === void 0 ? void 0 : _39.y)
                    && ((_42 = (_41 = (_40 = before._internal_text) === null || _40 === void 0 ? void 0 : _40.box) === null || _41 === void 0 ? void 0 : _41.alignment) === null || _42 === void 0 ? void 0 : _42.vertical) === ((_45 = (_44 = (_43 = after._internal_text) === null || _43 === void 0 ? void 0 : _43.box) === null || _44 === void 0 ? void 0 : _44.alignment) === null || _45 === void 0 ? void 0 : _45.vertical)
                    && ((_48 = (_47 = (_46 = before._internal_text) === null || _46 === void 0 ? void 0 : _46.box) === null || _47 === void 0 ? void 0 : _47.alignment) === null || _48 === void 0 ? void 0 : _48.horizontal) === ((_51 = (_50 = (_49 = after._internal_text) === null || _49 === void 0 ? void 0 : _49.box) === null || _50 === void 0 ? void 0 : _50.alignment) === null || _51 === void 0 ? void 0 : _51.horizontal)
                    && ((_55 = (_54 = (_53 = (_52 = before._internal_text) === null || _52 === void 0 ? void 0 : _52.box) === null || _53 === void 0 ? void 0 : _53.background) === null || _54 === void 0 ? void 0 : _54.inflation) === null || _55 === void 0 ? void 0 : _55.x) === ((_59 = (_58 = (_57 = (_56 = after._internal_text) === null || _56 === void 0 ? void 0 : _56.box) === null || _57 === void 0 ? void 0 : _57.background) === null || _58 === void 0 ? void 0 : _58.inflation) === null || _59 === void 0 ? void 0 : _59.x)
                    && ((_63 = (_62 = (_61 = (_60 = before._internal_text) === null || _60 === void 0 ? void 0 : _60.box) === null || _61 === void 0 ? void 0 : _61.background) === null || _62 === void 0 ? void 0 : _62.inflation) === null || _63 === void 0 ? void 0 : _63.y) === ((_67 = (_66 = (_65 = (_64 = after._internal_text) === null || _64 === void 0 ? void 0 : _64.box) === null || _65 === void 0 ? void 0 : _65.background) === null || _66 === void 0 ? void 0 : _66.inflation) === null || _67 === void 0 ? void 0 : _67.y)
                    && ((_70 = (_69 = (_68 = before._internal_text) === null || _68 === void 0 ? void 0 : _68.box) === null || _69 === void 0 ? void 0 : _69.border) === null || _70 === void 0 ? void 0 : _70.highlight) === ((_73 = (_72 = (_71 = after._internal_text) === null || _71 === void 0 ? void 0 : _71.box) === null || _72 === void 0 ? void 0 : _72.border) === null || _73 === void 0 ? void 0 : _73.highlight)
                    && ((_76 = (_75 = (_74 = before._internal_text) === null || _74 === void 0 ? void 0 : _74.box) === null || _75 === void 0 ? void 0 : _75.border) === null || _76 === void 0 ? void 0 : _76.radius) === ((_79 = (_78 = (_77 = after._internal_text) === null || _77 === void 0 ? void 0 : _77.box) === null || _78 === void 0 ? void 0 : _78.border) === null || _79 === void 0 ? void 0 : _79.radius)
                    && ((_82 = (_81 = (_80 = before._internal_text) === null || _80 === void 0 ? void 0 : _80.box) === null || _81 === void 0 ? void 0 : _81.shadow) === null || _82 === void 0 ? void 0 : _82.offset) === ((_85 = (_84 = (_83 = after._internal_text) === null || _83 === void 0 ? void 0 : _83.box) === null || _84 === void 0 ? void 0 : _84.shadow) === null || _85 === void 0 ? void 0 : _85.offset)
                    && ((_88 = (_87 = (_86 = before._internal_text) === null || _86 === void 0 ? void 0 : _86.box) === null || _87 === void 0 ? void 0 : _87.shadow) === null || _88 === void 0 ? void 0 : _88.color) === ((_91 = (_90 = (_89 = after._internal_text) === null || _89 === void 0 ? void 0 : _89.box) === null || _90 === void 0 ? void 0 : _90.shadow) === null || _91 === void 0 ? void 0 : _91.color)
                    && ((_94 = (_93 = (_92 = before._internal_text) === null || _92 === void 0 ? void 0 : _92.box) === null || _93 === void 0 ? void 0 : _93.shadow) === null || _94 === void 0 ? void 0 : _94.blur) === ((_97 = (_96 = (_95 = after._internal_text) === null || _95 === void 0 ? void 0 : _95.box) === null || _96 === void 0 ? void 0 : _96.shadow) === null || _97 === void 0 ? void 0 : _97.blur);
            }
            if (checkUnchanged(this._internal__data, data)) {
                this._internal__data = data;
            }
            else {
                this._internal__data = data;
                this._internal__polygonPoints = null;
                this._internal__internalData = null;
                this._internal__linesInfo = null;
                this._internal__fontInfo = null;
                this._internal__boxSize = null;
            }
        };
        TextRenderer.prototype.hitTest = function (point) {
            if (this._internal__data === null || this._internal__data._internal_points === undefined || this._internal__data._internal_points.length === 0) {
                return null;
            }
            else if (pointInPolygon(point, this._private__getPolygonPoints())) {
                return this._internal__hitTest;
            }
            else {
                return null;
            }
        };
        TextRenderer.prototype._internal_doesIntersectWithBox = function (box) {
            if (this._internal__data === null || this._internal__data._internal_points === undefined || this._internal__data._internal_points.length === 0) {
                return false;
            }
            else {
                return pointInBox(this._internal__data._internal_points[0], box);
            }
        };
        TextRenderer.prototype._internal_measure = function () {
            if (this._internal__data === null) {
                return { _internal_width: 0, _internal_height: 0 };
            }
            return this._private__getBoxSize();
        };
        TextRenderer.prototype._internal_rect = function () {
            if (this._internal__data === null) {
                return { _internal_x: 0, _internal_y: 0, _internal_width: 0, _internal_height: 0 };
            }
            var internalData = this._private__getInternalData();
            return { _internal_x: internalData._internal_boxLeft, _internal_y: internalData._internal_boxTop, _internal_width: internalData._internal_boxWidth, _internal_height: internalData._internal_boxHeight };
        };
        TextRenderer.prototype._internal_isOutOfScreen = function (width, height) {
            if (null === this._internal__data || void 0 === this._internal__data._internal_points || 0 === this._internal__data._internal_points.length) {
                return true;
            }
            var internalData = this._private__getInternalData();
            if (internalData._internal_boxLeft + internalData._internal_boxWidth < 0 || internalData._internal_boxLeft > width) {
                var screenBox_1 = new Box(new Point(0, 0), new Point(width, height));
                return this._private__getPolygonPoints().every(function (point) { return !pointInBox(point, screenBox_1); });
            }
            return false;
        };
        TextRenderer.prototype._internal_setPoints = function (points, hitTest) {
            ensureNotNull(this._internal__data)._internal_points = points;
            this._internal__hitTest = hitTest || new HitTestResult(HitTestType.MovePoint);
        };
        TextRenderer.prototype._internal_fontStyle = function () {
            return this._internal__data === null ? '' : this._private__getFontInfo()._internal_fontStyle;
        };
        TextRenderer.prototype._internal_wordWrap = function (test, wrapWidth, font) {
            return textWrap(test, font || this._internal_fontStyle(), wrapWidth);
        };
        // eslint-disable-next-line complexity
        TextRenderer.prototype.draw = function (ctx, renderParams) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6;
            if (this._internal__data === null || this._internal__data._internal_points === undefined || this._internal__data._internal_points.length === 0) {
                return;
            }
            if (this._internal_isOutOfScreen(renderParams.cssWidth, renderParams.cssHeight)) {
                return;
            }
            var textData = this._internal__data._internal_text;
            var pixelRatio = renderParams.pixelRatio;
            var internalData = this._private__getInternalData();
            var pivot = this._private__getRotationPoint().scaled(pixelRatio);
            ctx.save();
            ctx.translate(pivot.x, pivot.y);
            ctx.rotate(((_a = textData.box) === null || _a === void 0 ? void 0 : _a.angle) || 0);
            ctx.translate(-pivot.x, -pivot.y);
            var fontSize = this._private__getFontInfo()._internal_fontSize;
            ctx.textAlign = internalData._internal_textAlign;
            ctx.textBaseline = 'middle';
            ctx.font = this._internal_fontStyle();
            var scaledTop = Math.round(internalData._internal_boxTop * pixelRatio);
            var scaledLeft = Math.round(internalData._internal_boxLeft * pixelRatio);
            var scaledRight = scaledLeft + Math.round(internalData._internal_boxWidth * pixelRatio);
            var scaledBottom = scaledTop + Math.round(internalData._internal_boxHeight * pixelRatio);
            if (((_c = (_b = textData.box) === null || _b === void 0 ? void 0 : _b.background) === null || _c === void 0 ? void 0 : _c.color) || ((_e = (_d = textData.box) === null || _d === void 0 ? void 0 : _d.border) === null || _e === void 0 ? void 0 : _e.color) || ((_g = (_f = textData.box) === null || _f === void 0 ? void 0 : _f.border) === null || _g === void 0 ? void 0 : _g.highlight) && textData.wordWrapWidth) {
                var borderWidth = Math.round((((_j = (_h = textData.box) === null || _h === void 0 ? void 0 : _h.border) === null || _j === void 0 ? void 0 : _j.width) || Math.max(fontSize / 12, 1)) * pixelRatio);
                var halfBorderWidth = borderWidth / 2;
                var ctxUpdated = false;
                if ((_k = textData.box) === null || _k === void 0 ? void 0 : _k.shadow) {
                    var _7 = (_l = textData.box) === null || _l === void 0 ? void 0 : _l.shadow, color = _7.color, blur_1 = _7.blur, offset = _7.offset;
                    ctx.save();
                    ctx.shadowColor = color;
                    ctx.shadowBlur = blur_1;
                    ctx.shadowOffsetX = (offset === null || offset === void 0 ? void 0 : offset.x) || 0;
                    ctx.shadowOffsetY = (offset === null || offset === void 0 ? void 0 : offset.y) || 0;
                    ctxUpdated = true;
                }
                if ((_m = textData.box.border) === null || _m === void 0 ? void 0 : _m.radius) {
                    if ((_o = textData.box.background) === null || _o === void 0 ? void 0 : _o.color) {
                        var radius = ((_q = (_p = textData.box) === null || _p === void 0 ? void 0 : _p.border) === null || _q === void 0 ? void 0 : _q.radius) * pixelRatio;
                        drawRoundRect(ctx, scaledLeft, scaledTop, scaledRight - scaledLeft, scaledBottom - scaledTop, radius);
                        ctx.fillStyle = (_s = (_r = textData.box) === null || _r === void 0 ? void 0 : _r.background) === null || _s === void 0 ? void 0 : _s.color;
                        ctx.fill();
                        if (ctxUpdated) {
                            ctx.restore();
                            ctxUpdated = false;
                        }
                    }
                    if ((_t = textData.box.border) === null || _t === void 0 ? void 0 : _t.color) {
                        var radius = ((_v = (_u = textData.box) === null || _u === void 0 ? void 0 : _u.border) === null || _v === void 0 ? void 0 : _v.radius) * pixelRatio + borderWidth;
                        drawRoundRect(ctx, scaledLeft - halfBorderWidth, scaledTop - halfBorderWidth, scaledRight - scaledLeft + borderWidth, scaledBottom - scaledTop + borderWidth, radius);
                        ctx.strokeStyle = textData.box.border.color;
                        ctx.lineWidth = borderWidth;
                        if (ctxUpdated) {
                            ctx.restore();
                            ctxUpdated = false;
                        }
                    }
                }
                else if ((_w = textData.box.background) === null || _w === void 0 ? void 0 : _w.color) {
                    ctx.fillStyle = textData.box.background.color;
                    ctx.fillRect(scaledLeft, scaledTop, scaledRight - scaledLeft, scaledBottom - scaledTop);
                    if (ctxUpdated) {
                        ctx.restore();
                        ctxUpdated = false;
                    }
                }
                else if (((_y = (_x = textData.box) === null || _x === void 0 ? void 0 : _x.border) === null || _y === void 0 ? void 0 : _y.color) || ((_0 = (_z = textData.box) === null || _z === void 0 ? void 0 : _z.border) === null || _0 === void 0 ? void 0 : _0.highlight)) {
                    var usedBorderWidth = void 0;
                    if ((_2 = (_1 = textData.box) === null || _1 === void 0 ? void 0 : _1.border) === null || _2 === void 0 ? void 0 : _2.color) {
                        ctx.strokeStyle = (_4 = (_3 = textData.box) === null || _3 === void 0 ? void 0 : _3.border) === null || _4 === void 0 ? void 0 : _4.color;
                        usedBorderWidth = borderWidth;
                    }
                    else {
                        ctx.strokeStyle = (_5 = textData.font) === null || _5 === void 0 ? void 0 : _5.color;
                        setLineStyle(ctx, 2 /* Dashed */);
                        usedBorderWidth = Math.max(1, Math.floor(pixelRatio));
                    }
                    ctx.lineWidth = usedBorderWidth;
                    ctx.beginPath();
                    ctx.moveTo(scaledLeft - usedBorderWidth / 2, scaledTop - usedBorderWidth / 2);
                    ctx.lineTo(scaledLeft - usedBorderWidth / 2, scaledBottom + usedBorderWidth / 2);
                    ctx.lineTo(scaledRight + usedBorderWidth / 2, scaledBottom + usedBorderWidth / 2);
                    ctx.lineTo(scaledRight + usedBorderWidth / 2, scaledTop - usedBorderWidth / 2);
                    ctx.lineTo(scaledLeft - usedBorderWidth / 2, scaledTop - usedBorderWidth / 2);
                    ctx.stroke();
                    if (ctxUpdated) {
                        ctx.restore();
                    }
                }
            }
            ctx.fillStyle = (_6 = textData.font) === null || _6 === void 0 ? void 0 : _6.color;
            var lines = this._private__getLinesInfo()._internal_lines;
            var extraSpace = 0.05 * fontSize;
            var linePadding = getScaledPadding(this._internal__data);
            var x = (scaledLeft + Math.round(internalData._internal_textStart * pixelRatio)) / pixelRatio;
            var y = (scaledTop + Math.round((internalData._internal_textTop + extraSpace) * pixelRatio)) / pixelRatio;
            var _loop_1 = function (line) {
                // eslint-disable-next-line @typescript-eslint/no-loop-func
                drawScaled(ctx, pixelRatio, function () { return ctx.fillText(line, x, y); });
                y += fontSize + linePadding;
            };
            for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
                var line = lines_1[_i];
                _loop_1(line);
            }
            ctx.restore();
        };
        // eslint-disable-next-line complexity
        TextRenderer.prototype._private__getInternalData = function () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w;
            if (this._internal__internalData !== null) {
                return this._internal__internalData;
            }
            var data = ensureNotNull(this._internal__data);
            var paddingX = getScaledBoxPaddingX(data);
            var paddingY = getScaledBoxPaddingY(data);
            var inflationPaddingX = getScaledBackgroundInflationX(data) + paddingX;
            var inflationPaddingY = getScaledBackgroundInflationY(data) + paddingY;
            var anchor = ensureDefined(data._internal_points)[0];
            var boxSize = this._private__getBoxSize();
            var boxWidth = boxSize._internal_width;
            var boxHeight = boxSize._internal_height;
            var anchorY = anchor.y;
            var anchorX = anchor.x;
            switch ((_c = (_b = (_a = data._internal_text) === null || _a === void 0 ? void 0 : _a.box) === null || _b === void 0 ? void 0 : _b.alignment) === null || _c === void 0 ? void 0 : _c.vertical) {
                case "bottom" /* Bottom */:
                    anchorY -= boxHeight + (((_f = (_e = (_d = data._internal_text) === null || _d === void 0 ? void 0 : _d.box) === null || _e === void 0 ? void 0 : _e.offset) === null || _f === void 0 ? void 0 : _f.y) || 0);
                    break;
                case "middle" /* Middle */:
                    anchorY -= boxHeight / 2;
                    break;
                case "top" /* Top */:
                    anchorY += (((_j = (_h = (_g = data._internal_text) === null || _g === void 0 ? void 0 : _g.box) === null || _h === void 0 ? void 0 : _h.offset) === null || _j === void 0 ? void 0 : _j.y) || 0);
            }
            var textY = anchorY + (inflationPaddingY) + getScaledFontSize(data) / 2;
            var textAlign = "start" /* Start */;
            var textX = 0;
            switch ((_m = (_l = (_k = data._internal_text) === null || _k === void 0 ? void 0 : _k.box) === null || _l === void 0 ? void 0 : _l.alignment) === null || _m === void 0 ? void 0 : _m.horizontal) {
                case "left" /* Left */:
                    anchorX += (((_q = (_p = (_o = data._internal_text) === null || _o === void 0 ? void 0 : _o.box) === null || _p === void 0 ? void 0 : _p.offset) === null || _q === void 0 ? void 0 : _q.x) || 0);
                    break;
                case "center" /* Center */:
                    anchorX -= boxWidth / 2;
                    break;
                case "right" /* Right */:
                    anchorX -= boxWidth + (((_t = (_s = (_r = data._internal_text) === null || _r === void 0 ? void 0 : _r.box) === null || _s === void 0 ? void 0 : _s.offset) === null || _t === void 0 ? void 0 : _t.x) || 0);
            }
            switch (ensureDefined((_u = data._internal_text) === null || _u === void 0 ? void 0 : _u.alignment)) {
                case "left" /* Left */: {
                    textAlign = "start" /* Start */;
                    textX = anchorX + inflationPaddingX;
                    if (isRtl()) {
                        if ((_v = data._internal_text) === null || _v === void 0 ? void 0 : _v.forceTextAlign) {
                            textAlign = "left" /* Left */;
                        }
                        else {
                            textX = anchorX + boxWidth - inflationPaddingX;
                            textAlign = "right" /* Right */;
                        }
                    }
                    break;
                }
                case "center" /* Center */:
                    textAlign = "center" /* Center */;
                    textX = anchorX + boxWidth / 2;
                    break;
                case "right" /* Right */:
                    textAlign = "end" /* End */;
                    textX = anchorX + boxWidth - inflationPaddingX;
                    if (isRtl() && ((_w = data._internal_text) === null || _w === void 0 ? void 0 : _w.forceTextAlign)) {
                        textAlign = "right" /* Right */;
                    }
                    break;
            }
            this._internal__internalData = {
                _internal_boxLeft: anchorX,
                _internal_boxTop: anchorY,
                _internal_boxWidth: boxWidth,
                _internal_boxHeight: boxHeight,
                _internal_textAlign: textAlign,
                _internal_textTop: textY - anchorY,
                _internal_textStart: textX - anchorX,
            };
            return this._internal__internalData;
        };
        TextRenderer.prototype._private__getLinesMaxWidth = function (lines) {
            var _a, _b, _c;
            if (!cacheCanvas) {
                createCacheCanvas();
            }
            cacheCanvas.textBaseline = 'alphabetic';
            cacheCanvas.font = this._internal_fontStyle();
            if (this._internal__data !== null && ((_a = this._internal__data._internal_text) === null || _a === void 0 ? void 0 : _a.wordWrapWidth) && !((_b = this._internal__data._internal_text) === null || _b === void 0 ? void 0 : _b.forceCalculateMaxLineWidth)) {
                return ((_c = this._internal__data._internal_text) === null || _c === void 0 ? void 0 : _c.wordWrapWidth) * getFontAwareScale(this._internal__data);
            }
            var maxWidth = 0;
            for (var _i = 0, lines_2 = lines; _i < lines_2.length; _i++) {
                var line = lines_2[_i];
                maxWidth = Math.max(maxWidth, cacheCanvas.measureText(line).width);
            }
            return maxWidth;
        };
        TextRenderer.prototype._private__getLinesInfo = function () {
            var _a, _b, _c, _d, _e, _f;
            if (null === this._internal__linesInfo) {
                var data = ensureNotNull(this._internal__data);
                var lines = this._internal_wordWrap(((_a = data._internal_text) === null || _a === void 0 ? void 0 : _a.value) || '', (_b = data._internal_text) === null || _b === void 0 ? void 0 : _b.wordWrapWidth);
                if (((_d = (_c = data._internal_text) === null || _c === void 0 ? void 0 : _c.box) === null || _d === void 0 ? void 0 : _d.maxHeight) !== undefined) {
                    var maxHeight = ensureDefined((_f = (_e = data._internal_text) === null || _e === void 0 ? void 0 : _e.box) === null || _f === void 0 ? void 0 : _f.maxHeight);
                    var scaledFontSize = getScaledFontSize(data);
                    var scaledPadding = getScaledPadding(data);
                    var maxLines = Math.floor((maxHeight + scaledPadding) / (scaledFontSize + scaledPadding));
                    if (lines.length > maxLines) {
                        lines = lines.slice(0, maxLines);
                    }
                }
                this._internal__linesInfo = { _internal_linesMaxWidth: this._private__getLinesMaxWidth(lines), _internal_lines: lines };
            }
            return this._internal__linesInfo;
        };
        TextRenderer.prototype._private__getFontInfo = function () {
            var _a, _b, _c, _d, _e, _f;
            if (this._internal__fontInfo === null) {
                var data = ensureNotNull(this._internal__data);
                var fontSize = getScaledFontSize(data);
                var fontStyle = (((_b = (_a = data._internal_text) === null || _a === void 0 ? void 0 : _a.font) === null || _b === void 0 ? void 0 : _b.bold) ? 'bold ' : '') + (((_d = (_c = data._internal_text) === null || _c === void 0 ? void 0 : _c.font) === null || _d === void 0 ? void 0 : _d.italic) ? 'italic ' : '') + fontSize + 'px ' + ((_f = (_e = data._internal_text) === null || _e === void 0 ? void 0 : _e.font) === null || _f === void 0 ? void 0 : _f.family);
                this._internal__fontInfo = { _internal_fontStyle: fontStyle, _internal_fontSize: fontSize };
            }
            return this._internal__fontInfo;
        };
        TextRenderer.prototype._private__getBoxSize = function () {
            if (null === this._internal__boxSize) {
                var linesInfo = this._private__getLinesInfo();
                var data = ensureNotNull(this._internal__data);
                this._internal__boxSize = {
                    _internal_width: getBoxWidth(data, linesInfo._internal_linesMaxWidth),
                    _internal_height: getBoxHeight(data, linesInfo._internal_lines.length),
                };
            }
            return this._internal__boxSize;
        };
        TextRenderer.prototype._private__getPolygonPoints = function () {
            var _a, _b;
            if (null !== this._internal__polygonPoints) {
                return this._internal__polygonPoints;
            }
            if (null === this._internal__data) {
                return [];
            }
            var _c = this._private__getInternalData(), boxLeft = _c._internal_boxLeft, boxTop = _c._internal_boxTop, boxWidth = _c._internal_boxWidth, boxHeight = _c._internal_boxHeight;
            var pivot = this._private__getRotationPoint();
            var angle = ((_b = (_a = this._internal__data._internal_text) === null || _a === void 0 ? void 0 : _a.box) === null || _b === void 0 ? void 0 : _b.angle) || 0;
            this._internal__polygonPoints = [
                rotatePoint(new Point(boxLeft, boxTop), pivot, angle),
                rotatePoint(new Point(boxLeft + boxWidth, boxTop), pivot, angle),
                rotatePoint(new Point(boxLeft + boxWidth, boxTop + boxHeight), pivot, angle),
                rotatePoint(new Point(boxLeft, boxTop + boxHeight), pivot, angle),
            ];
            return this._internal__polygonPoints;
        };
        TextRenderer.prototype._private__getRotationPoint = function () {
            var _a, _b, _c;
            var _d = this._private__getInternalData(), boxLeft = _d._internal_boxLeft, boxTop = _d._internal_boxTop, boxWidth = _d._internal_boxWidth, boxHeight = _d._internal_boxHeight;
            var _e = ensureDefined((_c = (_b = (_a = this._internal__data) === null || _a === void 0 ? void 0 : _a._internal_text) === null || _b === void 0 ? void 0 : _b.box) === null || _c === void 0 ? void 0 : _c.alignment), horizontal = _e.horizontal, vertical = _e.vertical;
            var x = 0;
            var y = 0;
            switch (horizontal) {
                case "center" /* Center */:
                    x = boxLeft + boxWidth / 2;
                    break;
                case "left" /* Left */:
                    x = boxLeft;
                    break;
                case "right" /* Right */:
                    x = boxLeft + boxWidth;
            }
            switch (vertical) {
                case "middle" /* Middle */:
                    y = boxTop + boxHeight / 2;
                    break;
                case "top" /* Top */:
                    y = boxTop;
                    break;
                case "bottom" /* Bottom */:
                    y = boxTop + boxHeight;
            }
            return new Point(x, y);
        };
        return TextRenderer;
    }());
    // eslint-disable-next-line complexity
    function textWrap(text, font, lineWrapWidth) {
        if (!cacheCanvas) {
            createCacheCanvas();
        }
        lineWrapWidth = Object.prototype.toString.call(lineWrapWidth) === '[object String]' ? parseInt(lineWrapWidth) : lineWrapWidth;
        text += '';
        var lines = !Number.isInteger(lineWrapWidth) || !isFinite(lineWrapWidth) || lineWrapWidth <= 0
            ? text.split(/\r\n|\r|\n|$/)
            : text.split(/[^\S\r\n]*(?:\r\n|\r|\n|$)/);
        if (!lines[lines.length - 1]) {
            lines.pop();
        }
        if (!Number.isInteger(lineWrapWidth) || !isFinite(lineWrapWidth) || lineWrapWidth <= 0) {
            return lines;
        }
        cacheCanvas.font = font;
        var wrappedLines = [];
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            var lineWidth = cacheCanvas.measureText(line).width;
            if (lineWidth <= lineWrapWidth) {
                wrappedLines.push(line);
                continue;
            }
            var splitedLine = line.split(/([-)\]},.!?:;])|(\s+)/);
            for (; splitedLine.length;) {
                var space = Math.floor(lineWrapWidth / lineWidth * (splitedLine.length + 2) / 3);
                if (space <= 0 || cacheCanvas.measureText(splitedLine.slice(0, 3 * space - 1).join('')).width <= lineWrapWidth) {
                    for (; cacheCanvas.measureText(splitedLine.slice(0, 3 * (space + 1) - 1).join('')).width <= lineWrapWidth;) {
                        space++;
                    }
                }
                else {
                    // eslint-disable-next-line no-empty
                    for (; space > 0 && cacheCanvas.measureText(splitedLine.slice(0, 3 * --space - 1).join('')).width > lineWrapWidth;) { }
                }
                if (space > 0) {
                    wrappedLines.push(splitedLine.slice(0, 3 * space - 1).join(''));
                    splitedLine.splice(0, 3 * space);
                }
                else {
                    var paragraph = splitedLine[0] + (splitedLine[1] || '');
                    var subspace = Math.floor(lineWrapWidth / cacheCanvas.measureText(paragraph).width * paragraph.length);
                    if (cacheCanvas.measureText(paragraph.substring(0, subspace)).width <= lineWrapWidth) {
                        for (; cacheCanvas.measureText(paragraph.substring(0, subspace + 1)).width <= lineWrapWidth;) {
                            subspace++;
                        }
                    }
                    else {
                        // eslint-disable-next-line no-empty
                        for (; subspace > 1 && cacheCanvas.measureText(paragraph.substring(0, --subspace)).width > lineWrapWidth;) { }
                    }
                    subspace = Math.max(1, subspace);
                    wrappedLines.push(paragraph.substring(0, subspace));
                    splitedLine[0] = paragraph.substring(subspace);
                    splitedLine[1] = '';
                }
                if (cacheCanvas.measureText(splitedLine.join('')).width <= lineWrapWidth) {
                    wrappedLines.push(splitedLine.join(''));
                    break;
                }
            }
        }
        return wrappedLines;
    }
    var cacheCanvas;
    function createCacheCanvas() {
        var canvas = document.createElement('canvas');
        canvas.width = 0;
        canvas.height = 0;
        cacheCanvas = ensureNotNull(canvas.getContext('2d'));
    }
    function rotatePoint(point, pivot, angle) {
        if (0 === angle) {
            return point.clone();
        }
        var x = (point.x - pivot.x) * Math.cos(angle) - (point.y - pivot.y) * Math.sin(angle) + pivot.x;
        var y = (point.x - pivot.x) * Math.sin(angle) + (point.y - pivot.y) * Math.cos(angle) + pivot.y;
        return new Point(x, y);
    }
    function getBoxWidth(data, maxLineWidth) {
        return maxLineWidth + 2 * getScaledBackgroundInflationX(data) + 2 * getScaledBoxPaddingX(data);
    }
    function getBoxHeight(data, linesCount) {
        return getScaledFontSize(data) * linesCount + getScaledPadding(data) * (linesCount - 1) + 2 * getScaledBackgroundInflationY(data) + 2 * getScaledBoxPaddingY(data);
    }
    function getScaledBoxPaddingY(data) {
        var _a, _b, _c, _d, _e, _f;
        return ((_c = (_b = (_a = data._internal_text) === null || _a === void 0 ? void 0 : _a.box) === null || _b === void 0 ? void 0 : _b.padding) === null || _c === void 0 ? void 0 : _c.y) !== undefined ? ((_f = (_e = (_d = data._internal_text) === null || _d === void 0 ? void 0 : _d.box) === null || _e === void 0 ? void 0 : _e.padding) === null || _f === void 0 ? void 0 : _f.y) * getFontAwareScale(data) : getScaledFontSize(data) / 3;
    }
    function getScaledBoxPaddingX(data) {
        var _a, _b, _c, _d, _e, _f;
        return ((_c = (_b = (_a = data._internal_text) === null || _a === void 0 ? void 0 : _a.box) === null || _b === void 0 ? void 0 : _b.padding) === null || _c === void 0 ? void 0 : _c.x) ? ((_f = (_e = (_d = data._internal_text) === null || _d === void 0 ? void 0 : _d.box) === null || _e === void 0 ? void 0 : _e.padding) === null || _f === void 0 ? void 0 : _f.x) * getFontAwareScale(data) : getScaledFontSize(data) / 3;
    }
    function getScaledBackgroundInflationY(data) {
        var _a, _b, _c, _d;
        return (((_d = (_c = (_b = (_a = data._internal_text) === null || _a === void 0 ? void 0 : _a.box) === null || _b === void 0 ? void 0 : _b.background) === null || _c === void 0 ? void 0 : _c.inflation) === null || _d === void 0 ? void 0 : _d.y) || 0) * getFontAwareScale(data);
    }
    function getScaledBackgroundInflationX(data) {
        var _a, _b, _c, _d;
        return (((_d = (_c = (_b = (_a = data._internal_text) === null || _a === void 0 ? void 0 : _a.box) === null || _b === void 0 ? void 0 : _b.background) === null || _c === void 0 ? void 0 : _c.inflation) === null || _d === void 0 ? void 0 : _d.x) || 0) * getFontAwareScale(data);
    }
    function getScaledPadding(data) {
        var _a;
        return (((_a = data._internal_text) === null || _a === void 0 ? void 0 : _a.padding) || 0) * getFontAwareScale(data);
    }
    function getScaledFontSize(data) {
        return Math.ceil(getFontSize(data) * getFontAwareScale(data));
    }
    function getFontSize(data) {
        var _a, _b;
        return ((_b = (_a = data._internal_text) === null || _a === void 0 ? void 0 : _a.font) === null || _b === void 0 ? void 0 : _b.size) || 30;
    }
    function getFontAwareScale(data) {
        var _a, _b;
        var scale = Math.min(1, Math.max(0.2, ((_b = (_a = data._internal_text) === null || _a === void 0 ? void 0 : _a.box) === null || _b === void 0 ? void 0 : _b.scale) || 1));
        if (scale === 1) {
            return scale;
        }
        var fontSize = getFontSize(data);
        return Math.ceil(scale * fontSize) / fontSize;
    }
    function isRtl() {
        return 'rtl' === window.document.dir;
    }

    var GridRenderer = /** @class */ (function () {
        function GridRenderer() {
            this._private__data = null;
        }
        GridRenderer.prototype._internal_setData = function (data) {
            this._private__data = data;
        };
        GridRenderer.prototype.draw = function (ctx, renderParams) {
            var _this = this;
            if (this._private__data === null) {
                return;
            }
            var pixelRatio = renderParams.pixelRatio;
            var lineWidth = Math.max(1, Math.floor(pixelRatio));
            ctx.lineWidth = lineWidth;
            var height = Math.ceil(this._private__data._internal_h * pixelRatio);
            var width = Math.ceil(this._private__data._internal_w * pixelRatio);
            strokeInPixel(ctx, function () {
                var data = ensureNotNull(_this._private__data);
                if (data._internal_vertLinesVisible) {
                    ctx.strokeStyle = data._internal_vertLinesColor;
                    setLineStyle(ctx, data._internal_vertLineStyle);
                    ctx.beginPath();
                    for (var _i = 0, _a = data._internal_timeMarks; _i < _a.length; _i++) {
                        var timeMark = _a[_i];
                        var x = Math.round(timeMark._internal_coord * pixelRatio);
                        ctx.moveTo(x, -lineWidth);
                        ctx.lineTo(x, height + lineWidth);
                    }
                    ctx.stroke();
                }
                if (data._internal_horzLinesVisible) {
                    ctx.strokeStyle = data._internal_horzLinesColor;
                    setLineStyle(ctx, data._internal_horzLineStyle);
                    ctx.beginPath();
                    for (var _b = 0, _c = data._internal_priceMarks; _b < _c.length; _b++) {
                        var priceMark = _c[_b];
                        var y = Math.round(priceMark.coord * pixelRatio);
                        ctx.moveTo(-lineWidth, y);
                        ctx.lineTo(width + lineWidth, y);
                    }
                    ctx.stroke();
                }
            });
        };
        return GridRenderer;
    }());

    var GridPaneView = /** @class */ (function () {
        function GridPaneView(pane) {
            this._private__renderer = new GridRenderer();
            this._private__invalidated = true;
            this._private__pane = pane;
        }
        GridPaneView.prototype.update = function () {
            this._private__invalidated = true;
        };
        GridPaneView.prototype.renderer = function (height, width) {
            if (this._private__invalidated) {
                var gridOptions = this._private__pane.model().options().grid;
                var data = {
                    _internal_h: height,
                    _internal_w: width,
                    _internal_horzLinesVisible: gridOptions.horzLines.visible,
                    _internal_vertLinesVisible: gridOptions.vertLines.visible,
                    _internal_horzLinesColor: gridOptions.horzLines.color,
                    _internal_vertLinesColor: gridOptions.vertLines.color,
                    _internal_horzLineStyle: gridOptions.horzLines.style,
                    _internal_vertLineStyle: gridOptions.vertLines.style,
                    _internal_priceMarks: this._private__pane.defaultPriceScale().marks(),
                    _internal_timeMarks: this._private__pane.model().timeScale().marks() || [],
                };
                this._private__renderer._internal_setData(data);
                this._private__invalidated = false;
            }
            return this._private__renderer;
        };
        return GridPaneView;
    }());

    var Grid = /** @class */ (function () {
        function Grid(pane) {
            this._private__paneView = new GridPaneView(pane);
        }
        Grid.prototype.paneView = function () {
            return this._private__paneView;
        };
        return Grid;
    }());

    var formatterOptions = {
        _internal_decimalSign: '.',
        _internal_decimalSignFractional: '\'',
    };
    /**
     * @param value - The number of convert.
     * @param length - The length. Must be between 0 and 16 inclusive.
     */
    function numberToStringWithLeadingZero(value, length) {
        if (!isNumber(value)) {
            return 'n/a';
        }
        if (!isInteger(length)) {
            throw new TypeError('invalid length');
        }
        if (length < 0 || length > 16) {
            throw new TypeError('invalid length');
        }
        if (length === 0) {
            return value.toString();
        }
        var dummyString = '0000000000000000';
        return (dummyString + value.toString()).slice(-length);
    }
    var PriceFormatter = /** @class */ (function () {
        function PriceFormatter(priceScale, minMove) {
            if (!minMove) {
                minMove = 1;
            }
            if (!isNumber(priceScale) || !isInteger(priceScale)) {
                priceScale = 100;
            }
            if (priceScale < 0) {
                throw new TypeError('invalid base');
            }
            this._private__priceScale = priceScale;
            this._private__minMove = minMove;
            this._private__calculateDecimal();
        }
        PriceFormatter.prototype.format = function (price) {
            // \u2212 is unicode's minus sign https://www.fileformat.info/info/unicode/char/2212/index.htm
            // we should use it because it has the same width as plus sign +
            var sign = price < 0 ? '\u2212' : '';
            price = Math.abs(price);
            return sign + this._private__formatAsDecimal(price);
        };
        PriceFormatter.prototype._private__calculateDecimal = function () {
            // check if this._base is power of 10
            // for double fractional _fractionalLength if for the main fractional only
            this._internal__fractionalLength = 0;
            if (this._private__priceScale > 0 && this._private__minMove > 0) {
                var base = this._private__priceScale;
                while (base > 1) {
                    base /= 10;
                    this._internal__fractionalLength++;
                }
            }
        };
        PriceFormatter.prototype._private__formatAsDecimal = function (price) {
            var base = this._private__priceScale / this._private__minMove;
            var intPart = Math.floor(price);
            var fracString = '';
            var fracLength = this._internal__fractionalLength !== undefined ? this._internal__fractionalLength : NaN;
            if (base > 1) {
                var fracPart = +(Math.round(price * base) - intPart * base).toFixed(this._internal__fractionalLength);
                if (fracPart >= base) {
                    fracPart -= base;
                    intPart += 1;
                }
                fracString = formatterOptions._internal_decimalSign + numberToStringWithLeadingZero(+fracPart.toFixed(this._internal__fractionalLength) * this._private__minMove, fracLength);
            }
            else {
                // should round int part to min move
                intPart = Math.round(intPart * base) / base;
                // if min move > 1, fractional part is always = 0
                if (fracLength > 0) {
                    fracString = formatterOptions._internal_decimalSign + numberToStringWithLeadingZero(0, fracLength);
                }
            }
            return intPart.toFixed(0) + fracString;
        };
        return PriceFormatter;
    }());

    var PercentageFormatter = /** @class */ (function (_super) {
        __extends(PercentageFormatter, _super);
        function PercentageFormatter(priceScale) {
            if (priceScale === void 0) { priceScale = 100; }
            return _super.call(this, priceScale) || this;
        }
        PercentageFormatter.prototype.format = function (price) {
            return "".concat(_super.prototype.format.call(this, price), "%");
        };
        return PercentageFormatter;
    }(PriceFormatter));

    var PriceRangeImpl = /** @class */ (function () {
        function PriceRangeImpl(minValue, maxValue) {
            this._private__minValue = minValue;
            this._private__maxValue = maxValue;
        }
        PriceRangeImpl.prototype.equals = function (pr) {
            if (pr === null) {
                return false;
            }
            return this._private__minValue === pr._private__minValue && this._private__maxValue === pr._private__maxValue;
        };
        PriceRangeImpl.prototype.clone = function () {
            return new PriceRangeImpl(this._private__minValue, this._private__maxValue);
        };
        PriceRangeImpl.prototype.minValue = function () {
            return this._private__minValue;
        };
        PriceRangeImpl.prototype.maxValue = function () {
            return this._private__maxValue;
        };
        PriceRangeImpl.prototype.length = function () {
            return this._private__maxValue - this._private__minValue;
        };
        PriceRangeImpl.prototype.isEmpty = function () {
            return this._private__maxValue === this._private__minValue || Number.isNaN(this._private__maxValue) || Number.isNaN(this._private__minValue);
        };
        PriceRangeImpl.prototype.merge = function (anotherRange) {
            if (anotherRange === null) {
                return this;
            }
            return new PriceRangeImpl(Math.min(this.minValue(), anotherRange.minValue()), Math.max(this.maxValue(), anotherRange.maxValue()));
        };
        PriceRangeImpl.prototype.scaleAroundCenter = function (coeff) {
            if (!isNumber(coeff)) {
                return;
            }
            var delta = this._private__maxValue - this._private__minValue;
            if (delta === 0) {
                return;
            }
            var center = (this._private__maxValue + this._private__minValue) * 0.5;
            var maxDelta = this._private__maxValue - center;
            var minDelta = this._private__minValue - center;
            maxDelta *= coeff;
            minDelta *= coeff;
            this._private__maxValue = center + maxDelta;
            this._private__minValue = center + minDelta;
        };
        PriceRangeImpl.prototype.shift = function (delta) {
            if (!isNumber(delta)) {
                return;
            }
            this._private__maxValue += delta;
            this._private__minValue += delta;
        };
        PriceRangeImpl.prototype.toRaw = function () {
            return {
                minValue: this._private__minValue,
                maxValue: this._private__maxValue,
            };
        };
        PriceRangeImpl.fromRaw = function (raw) {
            return (raw === null) ? null : new PriceRangeImpl(raw.minValue, raw.maxValue);
        };
        return PriceRangeImpl;
    }());

    function clamp(value, minVal, maxVal) {
        return Math.min(Math.max(value, minVal), maxVal);
    }
    function isBaseDecimal(value) {
        if (value < 0) {
            return false;
        }
        for (var current = value; current > 1; current /= 10) {
            if ((current % 10) !== 0) {
                return false;
            }
        }
        return true;
    }
    function greaterOrEqual(x1, x2, epsilon) {
        return (x2 - x1) <= epsilon;
    }
    function equal(x1, x2, epsilon) {
        return Math.abs(x1 - x2) < epsilon;
    }
    function log10(x) {
        if (x <= 0) {
            return NaN;
        }
        return Math.log(x) / Math.log(10);
    }
    function min(arr) {
        if (arr.length < 1) {
            throw Error('array is empty');
        }
        var minVal = arr[0];
        for (var i = 1; i < arr.length; ++i) {
            if (arr[i] < minVal) {
                minVal = arr[i];
            }
        }
        return minVal;
    }
    function ceiledEven(x) {
        var ceiled = Math.ceil(x);
        return (ceiled % 2 !== 0) ? ceiled - 1 : ceiled;
    }
    function ceiledOdd(x) {
        var ceiled = Math.ceil(x);
        return (ceiled % 2 === 0) ? ceiled - 1 : ceiled;
    }

    var defLogFormula = {
        logicalOffset: 4,
        coordOffset: 0.0001,
    };
    function fromPercent(value, baseValue) {
        if (baseValue < 0) {
            value = -value;
        }
        return (value / 100) * baseValue + baseValue;
    }
    function toPercent(value, baseValue) {
        var result = 100 * (value - baseValue) / baseValue;
        return (baseValue < 0 ? -result : result);
    }
    function toPercentRange(priceRange, baseValue) {
        var minPercent = toPercent(priceRange.minValue(), baseValue);
        var maxPercent = toPercent(priceRange.maxValue(), baseValue);
        return new PriceRangeImpl(minPercent, maxPercent);
    }
    function fromIndexedTo100(value, baseValue) {
        value -= 100;
        if (baseValue < 0) {
            value = -value;
        }
        return (value / 100) * baseValue + baseValue;
    }
    function toIndexedTo100(value, baseValue) {
        var result = 100 * (value - baseValue) / baseValue + 100;
        return (baseValue < 0 ? -result : result);
    }
    function toIndexedTo100Range(priceRange, baseValue) {
        var minPercent = toIndexedTo100(priceRange.minValue(), baseValue);
        var maxPercent = toIndexedTo100(priceRange.maxValue(), baseValue);
        return new PriceRangeImpl(minPercent, maxPercent);
    }
    function toLog(price, logFormula) {
        var m = Math.abs(price);
        if (m < 1e-15) {
            return 0;
        }
        var res = log10(m + logFormula.coordOffset) + logFormula.logicalOffset;
        return ((price < 0) ? -res : res);
    }
    function fromLog(logical, logFormula) {
        var m = Math.abs(logical);
        if (m < 1e-15) {
            return 0;
        }
        var res = Math.pow(10, m - logFormula.logicalOffset) - logFormula.coordOffset;
        return (logical < 0) ? -res : res;
    }
    function convertPriceRangeToLog(priceRange, logFormula) {
        if (priceRange === null) {
            return null;
        }
        var min = toLog(priceRange.minValue(), logFormula);
        var max = toLog(priceRange.maxValue(), logFormula);
        return new PriceRangeImpl(min, max);
    }
    function canConvertPriceRangeFromLog(priceRange, logFormula) {
        if (priceRange === null) {
            return false;
        }
        var min = fromLog(priceRange.minValue(), logFormula);
        var max = fromLog(priceRange.maxValue(), logFormula);
        return isFinite(min) && isFinite(max);
    }
    function convertPriceRangeFromLog(priceRange, logFormula) {
        if (priceRange === null) {
            return null;
        }
        var min = fromLog(priceRange.minValue(), logFormula);
        var max = fromLog(priceRange.maxValue(), logFormula);
        return new PriceRangeImpl(min, max);
    }
    function logFormulaForPriceRange(range) {
        if (range === null) {
            return defLogFormula;
        }
        var diff = Math.abs(range.maxValue() - range.minValue());
        if (diff >= 1 || diff < 1e-15) {
            return defLogFormula;
        }
        var digits = Math.ceil(Math.abs(Math.log10(diff)));
        var logicalOffset = defLogFormula.logicalOffset + digits;
        var coordOffset = 1 / Math.pow(10, logicalOffset);
        return {
            logicalOffset: logicalOffset,
            coordOffset: coordOffset,
        };
    }
    function logFormulasAreSame(f1, f2) {
        return f1.logicalOffset === f2.logicalOffset && f1.coordOffset === f2.coordOffset;
    }

    var PriceTickSpanCalculator = /** @class */ (function () {
        function PriceTickSpanCalculator(base, integralDividers) {
            this._private__base = base;
            this._private__integralDividers = integralDividers;
            if (isBaseDecimal(this._private__base)) {
                this._private__fractionalDividers = [2, 2.5, 2];
            }
            else {
                this._private__fractionalDividers = [];
                for (var baseRest = this._private__base; baseRest !== 1;) {
                    if ((baseRest % 2) === 0) {
                        this._private__fractionalDividers.push(2);
                        baseRest /= 2;
                    }
                    else if ((baseRest % 5) === 0) {
                        this._private__fractionalDividers.push(2, 2.5);
                        baseRest /= 5;
                    }
                    else {
                        throw new Error('unexpected base');
                    }
                    if (this._private__fractionalDividers.length > 100) {
                        throw new Error('something wrong with base');
                    }
                }
            }
        }
        PriceTickSpanCalculator.prototype._internal_tickSpan = function (high, low, maxTickSpan) {
            var minMovement = (this._private__base === 0) ? (0) : (1 / this._private__base);
            var resultTickSpan = Math.pow(10, Math.max(0, Math.ceil(log10(high - low))));
            var index = 0;
            var c = this._private__integralDividers[0];
            // eslint-disable-next-line no-constant-condition
            while (true) {
                // the second part is actual for small with very small values like 1e-10
                // greaterOrEqual fails for such values
                var resultTickSpanLargerMinMovement = greaterOrEqual(resultTickSpan, minMovement, 1e-14 /* TickSpanEpsilon */) && resultTickSpan > (minMovement + 1e-14 /* TickSpanEpsilon */);
                var resultTickSpanLargerMaxTickSpan = greaterOrEqual(resultTickSpan, maxTickSpan * c, 1e-14 /* TickSpanEpsilon */);
                var resultTickSpanLarger1 = greaterOrEqual(resultTickSpan, 1, 1e-14 /* TickSpanEpsilon */);
                var haveToContinue = resultTickSpanLargerMinMovement && resultTickSpanLargerMaxTickSpan && resultTickSpanLarger1;
                if (!haveToContinue) {
                    break;
                }
                resultTickSpan /= c;
                c = this._private__integralDividers[++index % this._private__integralDividers.length];
            }
            if (resultTickSpan <= (minMovement + 1e-14 /* TickSpanEpsilon */)) {
                resultTickSpan = minMovement;
            }
            resultTickSpan = Math.max(1, resultTickSpan);
            if ((this._private__fractionalDividers.length > 0) && equal(resultTickSpan, 1, 1e-14 /* TickSpanEpsilon */)) {
                index = 0;
                c = this._private__fractionalDividers[0];
                while (greaterOrEqual(resultTickSpan, maxTickSpan * c, 1e-14 /* TickSpanEpsilon */) && resultTickSpan > (minMovement + 1e-14 /* TickSpanEpsilon */)) {
                    resultTickSpan /= c;
                    c = this._private__fractionalDividers[++index % this._private__fractionalDividers.length];
                }
            }
            return resultTickSpan;
        };
        return PriceTickSpanCalculator;
    }());

    var TICK_DENSITY = 2.5;
    var PriceTickMarkBuilder = /** @class */ (function () {
        function PriceTickMarkBuilder(priceScale, base, coordinateToLogicalFunc, logicalToCoordinateFunc) {
            this._private__marks = [];
            this._private__priceScale = priceScale;
            this._private__base = base;
            this._private__coordinateToLogicalFunc = coordinateToLogicalFunc;
            this._private__logicalToCoordinateFunc = logicalToCoordinateFunc;
        }
        PriceTickMarkBuilder.prototype._internal_tickSpan = function (high, low) {
            if (high < low) {
                throw new Error('high < low');
            }
            var scaleHeight = this._private__priceScale.height();
            var markHeight = this._private__tickMarkHeight();
            var maxTickSpan = (high - low) * markHeight / scaleHeight;
            var spanCalculator1 = new PriceTickSpanCalculator(this._private__base, [2, 2.5, 2]);
            var spanCalculator2 = new PriceTickSpanCalculator(this._private__base, [2, 2, 2.5]);
            var spanCalculator3 = new PriceTickSpanCalculator(this._private__base, [2.5, 2, 2]);
            var spans = [];
            spans.push(spanCalculator1._internal_tickSpan(high, low, maxTickSpan), spanCalculator2._internal_tickSpan(high, low, maxTickSpan), spanCalculator3._internal_tickSpan(high, low, maxTickSpan));
            return min(spans);
        };
        PriceTickMarkBuilder.prototype._internal_rebuildTickMarks = function () {
            var priceScale = this._private__priceScale;
            var firstValue = priceScale.firstValue();
            if (firstValue === null) {
                this._private__marks = [];
                return;
            }
            var scaleHeight = priceScale.height();
            var bottom = this._private__coordinateToLogicalFunc(scaleHeight - 1, firstValue);
            var top = this._private__coordinateToLogicalFunc(0, firstValue);
            var extraTopBottomMargin = this._private__priceScale.options().entireTextOnly ? this._private__fontHeight() / 2 : 0;
            var minCoord = extraTopBottomMargin;
            var maxCoord = scaleHeight - 1 - extraTopBottomMargin;
            var high = Math.max(bottom, top);
            var low = Math.min(bottom, top);
            if (high === low) {
                this._private__marks = [];
                return;
            }
            var span = this._internal_tickSpan(high, low);
            var mod = high % span;
            mod += mod < 0 ? span : 0;
            var sign = (high >= low) ? 1 : -1;
            var prevCoord = null;
            var targetIndex = 0;
            for (var logical = high - mod; logical > low; logical -= span) {
                var coord = this._private__logicalToCoordinateFunc(logical, firstValue, true);
                // check if there is place for it
                // this is required for log scale
                if (prevCoord !== null && Math.abs(coord - prevCoord) < this._private__tickMarkHeight()) {
                    continue;
                }
                // check if a tick mark is partially visible and skip it if entireTextOnly is true
                if (coord < minCoord || coord > maxCoord) {
                    continue;
                }
                if (targetIndex < this._private__marks.length) {
                    this._private__marks[targetIndex].coord = coord;
                    this._private__marks[targetIndex].label = priceScale.formatLogical(logical);
                }
                else {
                    this._private__marks.push({
                        coord: coord,
                        label: priceScale.formatLogical(logical),
                    });
                }
                targetIndex++;
                prevCoord = coord;
                if (priceScale.isLog()) {
                    // recalc span
                    span = this._internal_tickSpan(logical * sign, low);
                }
            }
            this._private__marks.length = targetIndex;
        };
        PriceTickMarkBuilder.prototype._internal_marks = function () {
            return this._private__marks;
        };
        PriceTickMarkBuilder.prototype._private__fontHeight = function () {
            return this._private__priceScale.fontSize();
        };
        PriceTickMarkBuilder.prototype._private__tickMarkHeight = function () {
            return Math.ceil(this._private__fontHeight() * TICK_DENSITY);
        };
        return PriceTickMarkBuilder;
    }());

    function sortSources(sources) {
        return sources.slice().sort(function (s1, s2) {
            return (ensureNotNull(s1.zorder()) - ensureNotNull(s2.zorder()));
        });
    }

    /**
     * Represents the price scale mode.
     */
    var PriceScaleMode;
    (function (PriceScaleMode) {
        /**
         * Price scale shows prices. Price range changes linearly.
         */
        PriceScaleMode[PriceScaleMode["Normal"] = 0] = "Normal";
        /**
         * Price scale shows prices. Price range changes logarithmically.
         */
        PriceScaleMode[PriceScaleMode["Logarithmic"] = 1] = "Logarithmic";
        /**
         * Price scale shows percentage values according the first visible value of the price scale.
         * The first visible value is 0% in this mode.
         */
        PriceScaleMode[PriceScaleMode["Percentage"] = 2] = "Percentage";
        /**
         * The same as percentage mode, but the first value is moved to 100.
         */
        PriceScaleMode[PriceScaleMode["IndexedTo100"] = 3] = "IndexedTo100";
    })(PriceScaleMode || (PriceScaleMode = {}));
    var percentageFormatter = new PercentageFormatter();
    var defaultPriceFormatter = new PriceFormatter(100, 1);
    var PriceScale = /** @class */ (function () {
        function PriceScale(id, options, layoutOptions, localizationOptions) {
            this._private__height = 0;
            this._private__internalHeightCache = null;
            this._private__priceRange = null;
            this._private__priceRangeSnapshot = null;
            this._private__invalidatedForRange = {
                _internal_isValid: false,
                _internal_visibleBars: null,
            };
            this._private__marginAbove = 0;
            this._private__marginBelow = 0;
            this._private__onMarksChanged = new Delegate();
            this._private__modeChanged = new Delegate();
            this._private__dataSources = [];
            this._private__cachedOrderedSources = null;
            this._private__marksCache = null;
            this._private__scaleStartPoint = null;
            this._private__scrollStartPoint = null;
            this._private__formatter = defaultPriceFormatter;
            this._private__logFormula = logFormulaForPriceRange(null);
            this._private__id = id;
            this._private__options = options;
            this._private__layoutOptions = layoutOptions;
            this._private__localizationOptions = localizationOptions;
            this._private__markBuilder = new PriceTickMarkBuilder(this, 100, this._private__coordinateToLogical.bind(this), this._private__logicalToCoordinate.bind(this));
        }
        PriceScale.prototype.id = function () {
            return this._private__id;
        };
        PriceScale.prototype.options = function () {
            return this._private__options;
        };
        PriceScale.prototype.applyOptions = function (options) {
            merge(this._private__options, options);
            this.updateFormatter();
            if (options.mode !== undefined) {
                this.setMode({ mode: options.mode });
            }
            if (options.scaleMargins !== undefined) {
                var top_1 = ensureDefined(options.scaleMargins.top);
                var bottom = ensureDefined(options.scaleMargins.bottom);
                if (top_1 < 0 || top_1 > 1) {
                    throw new Error("Invalid top margin - expect value between 0 and 1, given=".concat(top_1));
                }
                if (bottom < 0 || bottom > 1 || top_1 + bottom > 1) {
                    throw new Error("Invalid bottom margin - expect value between 0 and 1, given=".concat(bottom));
                }
                if (top_1 + bottom > 1) {
                    throw new Error("Invalid margins - sum of margins must be less than 1, given=".concat(top_1 + bottom));
                }
                this._private__invalidateInternalHeightCache();
                this._private__marksCache = null;
            }
        };
        PriceScale.prototype.isAutoScale = function () {
            return this._private__options.autoScale;
        };
        PriceScale.prototype.isLog = function () {
            return this._private__options.mode === 1 /* Logarithmic */;
        };
        PriceScale.prototype.isPercentage = function () {
            return this._private__options.mode === 2 /* Percentage */;
        };
        PriceScale.prototype.isIndexedTo100 = function () {
            return this._private__options.mode === 3 /* IndexedTo100 */;
        };
        PriceScale.prototype.mode = function () {
            return {
                autoScale: this._private__options.autoScale,
                isInverted: this._private__options.invertScale,
                mode: this._private__options.mode,
            };
        };
        // eslint-disable-next-line complexity
        PriceScale.prototype.setMode = function (newMode) {
            var oldMode = this.mode();
            var priceRange = null;
            if (newMode.autoScale !== undefined) {
                this._private__options.autoScale = newMode.autoScale;
            }
            if (newMode.mode !== undefined) {
                this._private__options.mode = newMode.mode;
                if (newMode.mode === 2 /* Percentage */ ||
                    newMode.mode === 3 /* IndexedTo100 */) {
                    this._private__options.autoScale = true;
                }
                // TODO: Remove after making rebuildTickMarks lazy
                this._private__invalidatedForRange._internal_isValid = false;
            }
            // define which scale converted from
            if (oldMode.mode === 1 /* Logarithmic */ &&
                newMode.mode !== oldMode.mode) {
                if (canConvertPriceRangeFromLog(this._private__priceRange, this._private__logFormula)) {
                    priceRange = convertPriceRangeFromLog(this._private__priceRange, this._private__logFormula);
                    if (priceRange !== null) {
                        this.setPriceRange(priceRange);
                    }
                }
                else {
                    this._private__options.autoScale = true;
                }
            }
            // define which scale converted to
            if (newMode.mode === 1 /* Logarithmic */ &&
                newMode.mode !== oldMode.mode) {
                priceRange = convertPriceRangeToLog(this._private__priceRange, this._private__logFormula);
                if (priceRange !== null) {
                    this.setPriceRange(priceRange);
                }
            }
            var modeChanged = oldMode.mode !== this._private__options.mode;
            if (modeChanged &&
                (oldMode.mode === 2 /* Percentage */ || this.isPercentage())) {
                this.updateFormatter();
            }
            if (modeChanged &&
                (oldMode.mode === 3 /* IndexedTo100 */ || this.isIndexedTo100())) {
                this.updateFormatter();
            }
            if (newMode.isInverted !== undefined &&
                oldMode.isInverted !== newMode.isInverted) {
                this._private__options.invertScale = newMode.isInverted;
                this._private__onIsInvertedChanged();
            }
            this._private__modeChanged.fire(oldMode, this.mode());
        };
        PriceScale.prototype.modeChanged = function () {
            return this._private__modeChanged;
        };
        PriceScale.prototype.fontSize = function () {
            return this._private__layoutOptions.fontSize;
        };
        PriceScale.prototype.height = function () {
            return this._private__height;
        };
        PriceScale.prototype.setHeight = function (value) {
            if (this._private__height === value) {
                return;
            }
            this._private__height = value;
            this._private__invalidateInternalHeightCache();
            this._private__marksCache = null;
        };
        PriceScale.prototype.internalHeight = function () {
            if (this._private__internalHeightCache) {
                return this._private__internalHeightCache;
            }
            var res = this.height() - this._private__topMarginPx() - this._private__bottomMarginPx();
            this._private__internalHeightCache = res;
            return res;
        };
        PriceScale.prototype.priceRange = function () {
            this._private__makeSureItIsValid();
            return this._private__priceRange;
        };
        PriceScale.prototype.logFormula = function () {
            return this._private__logFormula;
        };
        PriceScale.prototype.setPriceRange = function (newPriceRange, isForceSetValue) {
            var oldPriceRange = this._private__priceRange;
            if (!isForceSetValue &&
                !(oldPriceRange === null && newPriceRange !== null) &&
                (oldPriceRange === null || oldPriceRange.equals(newPriceRange))) {
                return;
            }
            this._private__marksCache = null;
            this._private__priceRange = newPriceRange;
        };
        PriceScale.prototype.isEmpty = function () {
            this._private__makeSureItIsValid();
            return (this._private__height === 0 || !this._private__priceRange || this._private__priceRange.isEmpty());
        };
        PriceScale.prototype.invertedCoordinate = function (coordinate) {
            return this.isInverted() ? coordinate : this.height() - 1 - coordinate;
        };
        PriceScale.prototype.priceToCoordinate = function (price, baseValue) {
            if (this.isPercentage()) {
                price = toPercent(price, baseValue);
            }
            else if (this.isIndexedTo100()) {
                price = toIndexedTo100(price, baseValue);
            }
            return this._private__logicalToCoordinate(price, baseValue);
        };
        PriceScale.prototype.pointsArrayToCoordinates = function (points, baseValue, visibleRange) {
            this._private__makeSureItIsValid();
            var bh = this._private__bottomMarginPx();
            var range = ensureNotNull(this.priceRange());
            var min = range.minValue();
            var max = range.maxValue();
            var ih = this.internalHeight() - 1;
            var isInverted = this.isInverted();
            var hmm = ih / (max - min);
            var fromIndex = visibleRange === undefined ? 0 : visibleRange.from;
            var toIndex = visibleRange === undefined ? points.length : visibleRange.to;
            var transformFn = this._private__getCoordinateTransformer();
            for (var i = fromIndex; i < toIndex; i++) {
                var point = points[i];
                var price = point.price;
                if (isNaN(price)) {
                    continue;
                }
                var logical = price;
                if (transformFn !== null) {
                    logical = transformFn(point.price, baseValue);
                }
                var invCoordinate = bh + hmm * (logical - min);
                var coordinate = isInverted
                    ? invCoordinate
                    : this._private__height - 1 - invCoordinate;
                point.y = coordinate;
            }
        };
        PriceScale.prototype.cloudPointsArrayToCoordinates = function (points, baseValue, visibleRange) {
            this._private__makeSureItIsValid();
            var bh = this._private__bottomMarginPx();
            var range = ensureNotNull(this.priceRange());
            var min = range.minValue();
            var max = range.maxValue();
            var ih = (this.internalHeight() - 1);
            var isInverted = this.isInverted();
            var hmm = ih / (max - min);
            var fromIndex = (visibleRange === undefined) ? 0 : visibleRange.from;
            var toIndex = (visibleRange === undefined) ? points.length : visibleRange.to;
            var transformFn = this._private__getCoordinateTransformer();
            for (var i = fromIndex; i < toIndex; i++) {
                var point = points[i];
                var higherPrice = point.higherPrice;
                var lowerPrice = point.lowerPrice;
                if (isNaN(higherPrice) || isNaN(lowerPrice)) {
                    continue;
                }
                var higherLogical = higherPrice;
                var lowerLogical = lowerPrice;
                if (transformFn !== null) {
                    higherLogical = transformFn(point.higherPrice, baseValue);
                    lowerLogical = transformFn(point.lowerPrice, baseValue);
                }
                var invCoordinate = bh + hmm * (higherLogical - min);
                var coordinate = isInverted ? invCoordinate : this._private__height - 1 - invCoordinate;
                point.higherY = coordinate;
                invCoordinate = bh + hmm * (lowerLogical - min);
                coordinate = isInverted ? invCoordinate : this._private__height - 1 - invCoordinate;
                point.lowerY = coordinate;
            }
        };
        PriceScale.prototype.barPricesToCoordinates = function (pricesList, baseValue, visibleRange) {
            this._private__makeSureItIsValid();
            var bh = this._private__bottomMarginPx();
            var range = ensureNotNull(this.priceRange());
            var min = range.minValue();
            var max = range.maxValue();
            var ih = this.internalHeight() - 1;
            var isInverted = this.isInverted();
            var hmm = ih / (max - min);
            var fromIndex = visibleRange === undefined ? 0 : visibleRange.from;
            var toIndex = visibleRange === undefined ? pricesList.length : visibleRange.to;
            var transformFn = this._private__getCoordinateTransformer();
            for (var i = fromIndex; i < toIndex; i++) {
                var bar = pricesList[i];
                var openLogical = bar.open;
                var highLogical = bar.high;
                var lowLogical = bar.low;
                var closeLogical = bar.close;
                if (transformFn !== null) {
                    openLogical = transformFn(bar.open, baseValue);
                    highLogical = transformFn(bar.high, baseValue);
                    lowLogical = transformFn(bar.low, baseValue);
                    closeLogical = transformFn(bar.close, baseValue);
                }
                var invCoordinate = bh + hmm * (openLogical - min);
                var coordinate = isInverted
                    ? invCoordinate
                    : this._private__height - 1 - invCoordinate;
                bar.openY = coordinate;
                invCoordinate = bh + hmm * (highLogical - min);
                coordinate = isInverted
                    ? invCoordinate
                    : this._private__height - 1 - invCoordinate;
                bar.highY = coordinate;
                invCoordinate = bh + hmm * (lowLogical - min);
                coordinate = isInverted
                    ? invCoordinate
                    : this._private__height - 1 - invCoordinate;
                bar.lowY = coordinate;
                invCoordinate = bh + hmm * (closeLogical - min);
                coordinate = isInverted
                    ? invCoordinate
                    : this._private__height - 1 - invCoordinate;
                bar.closeY = coordinate;
            }
        };
        PriceScale.prototype.coordinateToPrice = function (coordinate, baseValue) {
            var logical = this._private__coordinateToLogical(coordinate, baseValue);
            return this.logicalToPrice(logical, baseValue);
        };
        PriceScale.prototype.logicalToPrice = function (logical, baseValue) {
            var value = logical;
            if (this.isPercentage()) {
                value = fromPercent(value, baseValue);
            }
            else if (this.isIndexedTo100()) {
                value = fromIndexedTo100(value, baseValue);
            }
            return value;
        };
        PriceScale.prototype.dataSources = function () {
            return this._private__dataSources;
        };
        PriceScale.prototype.orderedSources = function () {
            if (this._private__cachedOrderedSources) {
                return this._private__cachedOrderedSources;
            }
            var sources = [];
            for (var i = 0; i < this._private__dataSources.length; i++) {
                var ds = this._private__dataSources[i];
                if (ds.zorder() === null) {
                    ds.setZorder(i + 1);
                }
                sources.push(ds);
            }
            sources = sortSources(sources);
            this._private__cachedOrderedSources = sources;
            return this._private__cachedOrderedSources;
        };
        PriceScale.prototype.addDataSource = function (source) {
            if (this._private__dataSources.indexOf(source) !== -1) {
                return;
            }
            this._private__dataSources.push(source);
            this.updateFormatter();
            this.invalidateSourcesCache();
        };
        PriceScale.prototype.removeDataSource = function (source) {
            var index = this._private__dataSources.indexOf(source);
            if (index === -1) {
                throw new Error('source is not attached to scale');
            }
            this._private__dataSources.splice(index, 1);
            if (this._private__dataSources.length === 0) {
                this.setMode({
                    autoScale: true,
                });
                // if no sources on price scale let's clear price range cache as well as enabling auto scale
                this.setPriceRange(null);
            }
            this.updateFormatter();
            this.invalidateSourcesCache();
        };
        PriceScale.prototype.firstValue = function () {
            var _a;
            // TODO: cache the result
            var result = null;
            for (var _i = 0, _b = this._private__dataSources; _i < _b.length; _i++) {
                var source = _b[_i];
                var priceSource = source;
                var firstValue = (_a = priceSource.firstValue) === null || _a === void 0 ? void 0 : _a.bind(priceSource).call(this);
                if (!firstValue) {
                    continue;
                }
                if (result === null || firstValue.timePoint < result.timePoint) {
                    result = firstValue;
                }
            }
            return result === null ? null : result.value;
        };
        PriceScale.prototype.isInverted = function () {
            return this._private__options.invertScale;
        };
        PriceScale.prototype.marks = function () {
            var firstValueIsNull = this.firstValue() === null;
            // do not recalculate marks if firstValueIsNull is true because in this case we'll always get empty result
            // this could happen in case when a series had some data and then you set empty data to it (in a simplified case)
            // we could display an empty price scale, but this is not good from UX
            // so in this case we need to keep an previous marks to display them on the scale
            // as one of possible examples for this situation could be the following:
            // let's say you have a study/indicator attached to a price scale and then you decide to stop it, i.e. remove its data because of its visibility
            // a user will see the previous marks on the scale until you turn on your study back or remove it from the chart completely
            if (this._private__marksCache !== null && (firstValueIsNull || this._private__marksCache._internal_firstValueIsNull === firstValueIsNull)) {
                return this._private__marksCache._internal_marks;
            }
            this._private__markBuilder._internal_rebuildTickMarks();
            var marks = this._private__markBuilder._internal_marks();
            this._private__marksCache = { _internal_marks: marks, _internal_firstValueIsNull: firstValueIsNull };
            this._private__onMarksChanged.fire();
            return marks;
        };
        PriceScale.prototype.onMarksChanged = function () {
            return this._private__onMarksChanged;
        };
        PriceScale.prototype.startScale = function (x) {
            if (this.isPercentage() || this.isIndexedTo100()) {
                return;
            }
            if (this._private__scaleStartPoint !== null || this._private__priceRangeSnapshot !== null) {
                return;
            }
            if (this.isEmpty()) {
                return;
            }
            // invert x
            this._private__scaleStartPoint = this._private__height - x;
            this._private__priceRangeSnapshot = ensureNotNull(this.priceRange()).clone();
        };
        PriceScale.prototype.scaleTo = function (x) {
            if (this.isPercentage() || this.isIndexedTo100()) {
                return;
            }
            if (this._private__scaleStartPoint === null) {
                return;
            }
            this.setMode({
                autoScale: false,
            });
            // invert x
            x = this._private__height - x;
            if (x < 0) {
                x = 0;
            }
            var scaleCoeff = (this._private__scaleStartPoint + (this._private__height - 1) * 0.2) /
                (x + (this._private__height - 1) * 0.2);
            var newPriceRange = ensureNotNull(this._private__priceRangeSnapshot).clone();
            scaleCoeff = Math.max(scaleCoeff, 0.1);
            newPriceRange.scaleAroundCenter(scaleCoeff);
            this.setPriceRange(newPriceRange);
        };
        PriceScale.prototype.endScale = function () {
            if (this.isPercentage() || this.isIndexedTo100()) {
                return;
            }
            this._private__scaleStartPoint = null;
            this._private__priceRangeSnapshot = null;
        };
        PriceScale.prototype.startScroll = function (x) {
            if (this.isAutoScale()) {
                return;
            }
            if (this._private__scrollStartPoint !== null || this._private__priceRangeSnapshot !== null) {
                return;
            }
            if (this.isEmpty()) {
                return;
            }
            this._private__scrollStartPoint = x;
            this._private__priceRangeSnapshot = ensureNotNull(this.priceRange()).clone();
        };
        PriceScale.prototype.scrollTo = function (x) {
            if (this.isAutoScale()) {
                return;
            }
            if (this._private__scrollStartPoint === null) {
                return;
            }
            var priceUnitsPerPixel = ensureNotNull(this.priceRange()).length() / (this.internalHeight() - 1);
            var pixelDelta = x - this._private__scrollStartPoint;
            if (this.isInverted()) {
                pixelDelta *= -1;
            }
            var priceDelta = pixelDelta * priceUnitsPerPixel;
            var newPriceRange = ensureNotNull(this._private__priceRangeSnapshot).clone();
            newPriceRange.shift(priceDelta);
            this.setPriceRange(newPriceRange, true);
            this._private__marksCache = null;
        };
        PriceScale.prototype.endScroll = function () {
            if (this.isAutoScale()) {
                return;
            }
            if (this._private__scrollStartPoint === null) {
                return;
            }
            this._private__scrollStartPoint = null;
            this._private__priceRangeSnapshot = null;
        };
        PriceScale.prototype.formatter = function () {
            if (!this._private__formatter) {
                this.updateFormatter();
            }
            return this._private__formatter;
        };
        PriceScale.prototype.formatPrice = function (price, firstValue) {
            switch (this._private__options.mode) {
                case 2 /* Percentage */:
                    return this.formatter().format(toPercent(price, firstValue));
                case 3 /* IndexedTo100 */:
                    return this.formatter().format(toIndexedTo100(price, firstValue));
                default:
                    return this._private__formatPrice(price);
            }
        };
        PriceScale.prototype.formatLogical = function (logical) {
            switch (this._private__options.mode) {
                case 2 /* Percentage */:
                case 3 /* IndexedTo100 */:
                    return this.formatter().format(logical);
                default:
                    return this._private__formatPrice(logical);
            }
        };
        PriceScale.prototype.formatPriceAbsolute = function (price) {
            return this._private__formatPrice(price, ensureNotNull(this._private__formatterSource()).formatter());
        };
        PriceScale.prototype.formatPricePercentage = function (price, baseValue) {
            price = toPercent(price, baseValue);
            return percentageFormatter.format(price);
        };
        PriceScale.prototype.sourcesForAutoScale = function () {
            return this._private__dataSources;
        };
        PriceScale.prototype.recalculatePriceRange = function (visibleBars) {
            this._private__invalidatedForRange = {
                _internal_visibleBars: visibleBars,
                _internal_isValid: false,
            };
        };
        PriceScale.prototype.updateAllViews = function () {
            this._private__dataSources.forEach(function (source) { return source.updateAllViews(); });
        };
        PriceScale.prototype.updateFormatter = function () {
            this._private__marksCache = null;
            var formatterSource = this._private__formatterSource();
            var base = 100;
            if (formatterSource !== null) {
                base = Math.round(1 / formatterSource.minMove());
            }
            this._private__formatter = defaultPriceFormatter;
            if (this.isPercentage()) {
                this._private__formatter = percentageFormatter;
                base = 100;
            }
            else if (this.isIndexedTo100()) {
                this._private__formatter = new PriceFormatter(100, 1);
                base = 100;
            }
            else {
                if (formatterSource !== null) {
                    // user
                    this._private__formatter = formatterSource.formatter();
                }
            }
            this._private__markBuilder = new PriceTickMarkBuilder(this, base, this._private__coordinateToLogical.bind(this), this._private__logicalToCoordinate.bind(this));
            this._private__markBuilder._internal_rebuildTickMarks();
        };
        PriceScale.prototype.invalidateSourcesCache = function () {
            this._private__cachedOrderedSources = null;
        };
        /**
         * @returns The {@link IPriceDataSource} that will be used as the "formatter source" (take minMove for formatter).
         */
        PriceScale.prototype._private__formatterSource = function () {
            return (this._private__dataSources[0] || null);
        };
        PriceScale.prototype._private__topMarginPx = function () {
            return this.isInverted()
                ? this._private__options.scaleMargins.bottom * this.height() + this._private__marginBelow
                : this._private__options.scaleMargins.top * this.height() + this._private__marginAbove;
        };
        PriceScale.prototype._private__bottomMarginPx = function () {
            return this.isInverted()
                ? this._private__options.scaleMargins.top * this.height() + this._private__marginAbove
                : this._private__options.scaleMargins.bottom * this.height() + this._private__marginBelow;
        };
        PriceScale.prototype._private__makeSureItIsValid = function () {
            if (!this._private__invalidatedForRange._internal_isValid) {
                this._private__invalidatedForRange._internal_isValid = true;
                this._private__recalculatePriceRangeImpl();
            }
        };
        PriceScale.prototype._private__invalidateInternalHeightCache = function () {
            this._private__internalHeightCache = null;
        };
        PriceScale.prototype._private__logicalToCoordinate = function (logical, baseValue) {
            this._private__makeSureItIsValid();
            if (this.isEmpty()) {
                return 0;
            }
            logical =
                this.isLog() && logical ? toLog(logical, this._private__logFormula) : logical;
            var range = ensureNotNull(this.priceRange());
            var invCoordinate = this._private__bottomMarginPx() +
                ((this.internalHeight() - 1) * (logical - range.minValue())) /
                    range.length();
            var coordinate = this.invertedCoordinate(invCoordinate);
            return coordinate;
        };
        PriceScale.prototype._private__coordinateToLogical = function (coordinate, baseValue) {
            this._private__makeSureItIsValid();
            if (this.isEmpty()) {
                return 0;
            }
            var invCoordinate = this.invertedCoordinate(coordinate);
            var range = ensureNotNull(this.priceRange());
            var logical = range.minValue() +
                range.length() *
                    ((invCoordinate - this._private__bottomMarginPx()) /
                        (this.internalHeight() - 1));
            return this.isLog() ? fromLog(logical, this._private__logFormula) : logical;
        };
        PriceScale.prototype._private__onIsInvertedChanged = function () {
            this._private__marksCache = null;
            this._private__markBuilder._internal_rebuildTickMarks();
        };
        // eslint-disable-next-line complexity
        PriceScale.prototype._private__recalculatePriceRangeImpl = function () {
            var visibleBars = this._private__invalidatedForRange._internal_visibleBars;
            if (visibleBars === null) {
                return;
            }
            var priceRange = null;
            var sources = this.sourcesForAutoScale();
            var marginAbove = 0;
            var marginBelow = 0;
            for (var _i = 0, sources_1 = sources; _i < sources_1.length; _i++) {
                var source = sources_1[_i];
                var priceSource = source;
                if (!priceSource.visible() || !priceSource.firstValue) {
                    continue;
                }
                var firstValue = priceSource.firstValue();
                if (firstValue === null) {
                    continue;
                }
                var autoScaleInfo = priceSource.autoscaleInfo(visibleBars.left(), visibleBars.right());
                var sourceRange = autoScaleInfo && autoScaleInfo.priceRange();
                if (sourceRange !== null) {
                    switch (this._private__options.mode) {
                        case 1 /* Logarithmic */:
                            sourceRange = convertPriceRangeToLog(sourceRange, this._private__logFormula);
                            break;
                        case 2 /* Percentage */:
                            sourceRange = toPercentRange(sourceRange, firstValue.value);
                            break;
                        case 3 /* IndexedTo100 */:
                            sourceRange = toIndexedTo100Range(sourceRange, firstValue.value);
                            break;
                    }
                    if (priceRange === null) {
                        priceRange = sourceRange;
                    }
                    else {
                        priceRange = priceRange.merge(ensureNotNull(sourceRange));
                    }
                    if (autoScaleInfo !== null) {
                        var margins = autoScaleInfo.margins();
                        if (margins !== null) {
                            marginAbove = Math.max(marginAbove, margins.above);
                            marginBelow = Math.max(marginAbove, margins.below);
                        }
                    }
                }
            }
            if (marginAbove !== this._private__marginAbove ||
                marginBelow !== this._private__marginBelow) {
                this._private__marginAbove = marginAbove;
                this._private__marginBelow = marginBelow;
                this._private__marksCache = null;
                this._private__invalidateInternalHeightCache();
            }
            if (priceRange !== null) {
                // keep current range is new is empty
                if (priceRange.minValue() === priceRange.maxValue()) {
                    var formatterSource = this._private__formatterSource();
                    var minMove = formatterSource === null ||
                        this.isPercentage() ||
                        this.isIndexedTo100()
                        ? 1
                        : formatterSource.minMove();
                    // if price range is degenerated to 1 point let's extend it by 10 min move values
                    // to avoid incorrect range and empty (blank) scale (in case of min tick much greater than 1)
                    var extendValue = 5 * minMove;
                    if (this.isLog()) {
                        priceRange = convertPriceRangeFromLog(priceRange, this._private__logFormula);
                    }
                    priceRange = new PriceRangeImpl(priceRange.minValue() - extendValue, priceRange.maxValue() + extendValue);
                    if (this.isLog()) {
                        priceRange = convertPriceRangeToLog(priceRange, this._private__logFormula);
                    }
                }
                if (this.isLog()) {
                    var rawRange = convertPriceRangeFromLog(priceRange, this._private__logFormula);
                    var newLogFormula = logFormulaForPriceRange(rawRange);
                    if (!logFormulasAreSame(newLogFormula, this._private__logFormula)) {
                        var rawSnapshot = this._private__priceRangeSnapshot !== null
                            ? convertPriceRangeFromLog(this._private__priceRangeSnapshot, this._private__logFormula)
                            : null;
                        this._private__logFormula = newLogFormula;
                        priceRange = convertPriceRangeToLog(rawRange, newLogFormula);
                        if (rawSnapshot !== null) {
                            this._private__priceRangeSnapshot = convertPriceRangeToLog(rawSnapshot, newLogFormula);
                        }
                    }
                }
                this.setPriceRange(priceRange);
            }
            else {
                // reset empty to default
                if (this._private__priceRange === null) {
                    this.setPriceRange(new PriceRangeImpl(-0.5, 0.5));
                    this._private__logFormula = logFormulaForPriceRange(null);
                }
            }
            this._private__invalidatedForRange._internal_isValid = true;
        };
        PriceScale.prototype._private__getCoordinateTransformer = function () {
            var _this = this;
            if (this.isPercentage()) {
                return toPercent;
            }
            else if (this.isIndexedTo100()) {
                return toIndexedTo100;
            }
            else if (this.isLog()) {
                return function (price) { return toLog(price, _this._private__logFormula); };
            }
            return null;
        };
        PriceScale.prototype._private__formatPrice = function (price, fallbackFormatter) {
            if (this._private__localizationOptions.priceFormatter === undefined) {
                if (fallbackFormatter === undefined) {
                    fallbackFormatter = this.formatter();
                }
                return fallbackFormatter.format(price);
            }
            return this._private__localizationOptions.priceFormatter(price);
        };
        return PriceScale;
    }());

    var DEFAULT_STRETCH_FACTOR = 1000;
    var PaneCursorType;
    (function (PaneCursorType) {
        PaneCursorType["Default"] = "default";
        PaneCursorType["Crosshair"] = "crosshair";
        PaneCursorType["Pointer"] = "pointer";
        PaneCursorType["Grabbing"] = "grabbing";
        PaneCursorType["ZoomIn"] = "zoom-in";
        PaneCursorType["VerticalResize"] = "n-resize";
        PaneCursorType["HorizontalResize"] = "e-resize";
        PaneCursorType["DiagonalNeSwResize"] = "nesw-resize";
        PaneCursorType["DiagonalNwSeResize"] = "nwse-resize";
    })(PaneCursorType || (PaneCursorType = {}));
    var Pane = /** @class */ (function () {
        function Pane(timeScale, model, initialPaneIndex) {
            if (initialPaneIndex === void 0) { initialPaneIndex = 0; }
            this._private__dataSources = [];
            this._private__overlaySourcesByScaleId = new Map();
            this._private__height = 0;
            this._private__width = 0;
            this._private__stretchFactor = DEFAULT_STRETCH_FACTOR;
            this._private__cachedOrderedSources = null;
            this._private__destroyed = new Delegate();
            this._private__timeScale = timeScale;
            this._private__model = model;
            this._private__grid = new Grid(this);
            var options = model.options();
            this._private__leftPriceScale = this._private__createPriceScale("left" /* Left */, options.leftPriceScale);
            if (initialPaneIndex === 0) {
                this._private__rightPriceScale = this._private__createPriceScale("right" /* Right */, options.rightPriceScale);
            }
            else {
                this._private__rightPriceScale = this._private__createPriceScale("non-primary" /* NonPrimary */, options.nonPrimaryPriceScale);
            }
            this._private__leftPriceScale.modeChanged().subscribe(this._private__onPriceScaleModeChanged.bind(this, this._private__leftPriceScale), this);
            this._private__rightPriceScale.modeChanged().subscribe(this._private__onPriceScaleModeChanged.bind(this, this._private__rightPriceScale), this);
            this.applyScaleOptions(options);
        }
        Pane.prototype.applyScaleOptions = function (options) {
            if (options.leftPriceScale) {
                this._private__leftPriceScale.applyOptions(options.leftPriceScale);
            }
            if (this._private__rightPriceScale.id() === "right" /* Right */ && options.rightPriceScale) {
                this._private__rightPriceScale.applyOptions(options.rightPriceScale);
            }
            if (this._private__rightPriceScale.id() === "non-primary" /* NonPrimary */ && options.nonPrimaryPriceScale) {
                this._private__rightPriceScale.applyOptions(options.nonPrimaryPriceScale);
            }
            if (options.localization) {
                this._private__leftPriceScale.updateFormatter();
                this._private__rightPriceScale.updateFormatter();
            }
            if (options.overlayPriceScales) {
                var sourceArrays = Array.from(this._private__overlaySourcesByScaleId.values());
                for (var _i = 0, sourceArrays_1 = sourceArrays; _i < sourceArrays_1.length; _i++) {
                    var arr = sourceArrays_1[_i];
                    var priceScale = ensureNotNull(arr[0].priceScale());
                    priceScale.applyOptions(options.overlayPriceScales);
                    if (options.localization) {
                        priceScale.updateFormatter();
                    }
                }
            }
        };
        Pane.prototype.priceScaleById = function (id) {
            switch (id) {
                case "left" /* Left */: {
                    return this._private__leftPriceScale;
                }
                case "right" /* Right */: {
                    return this._private__rightPriceScale;
                }
            }
            if (this._private__overlaySourcesByScaleId.has(id)) {
                return ensureDefined(this._private__overlaySourcesByScaleId.get(id))[0].priceScale();
            }
            return null;
        };
        Pane.prototype.destroy = function () {
            this.model().priceScalesOptionsChanged().unsubscribeAll(this);
            this._private__leftPriceScale.modeChanged().unsubscribeAll(this);
            this._private__rightPriceScale.modeChanged().unsubscribeAll(this);
            this._private__dataSources.forEach(function (source) {
                if (source.destroy) {
                    source.destroy();
                }
            });
            this._private__destroyed.fire();
        };
        Pane.prototype.stretchFactor = function () {
            return this._private__stretchFactor;
        };
        Pane.prototype.setStretchFactor = function (factor) {
            this._private__stretchFactor = factor;
        };
        Pane.prototype.model = function () {
            return this._private__model;
        };
        Pane.prototype.width = function () {
            return this._private__width;
        };
        Pane.prototype.height = function () {
            return this._private__height;
        };
        Pane.prototype.setWidth = function (width) {
            this._private__width = width;
            this.updateAllSources();
        };
        Pane.prototype.setHeight = function (height) {
            var _this = this;
            this._private__height = height;
            this._private__leftPriceScale.setHeight(height);
            this._private__rightPriceScale.setHeight(height);
            // process overlays
            this._private__dataSources.forEach(function (ds) {
                if (_this.isOverlay(ds)) {
                    var priceScale = ds.priceScale();
                    if (priceScale !== null) {
                        priceScale.setHeight(height);
                    }
                }
            });
            this.updateAllSources();
        };
        Pane.prototype.dataSources = function () {
            return this._private__dataSources;
        };
        Pane.prototype.isOverlay = function (source) {
            var priceScale = source.priceScale();
            if (priceScale === null) {
                return true;
            }
            return this._private__leftPriceScale !== priceScale && this._private__rightPriceScale !== priceScale;
        };
        Pane.prototype.addDataSource = function (source, targetScaleId, zOrder) {
            var targetZOrder = (zOrder !== undefined) ? zOrder : this._private__getZOrderMinMax()._internal_maxZOrder + 1;
            this._private__insertDataSource(source, targetScaleId, targetZOrder);
        };
        Pane.prototype.removeDataSource = function (source) {
            var index = this._private__dataSources.indexOf(source);
            assert(index !== -1, 'removeDataSource: invalid data source');
            this._private__dataSources.splice(index, 1);
            var priceScaleId = ensureNotNull(source.priceScale()).id();
            if (this._private__overlaySourcesByScaleId.has(priceScaleId)) {
                var overlaySources = ensureDefined(this._private__overlaySourcesByScaleId.get(priceScaleId));
                var overlayIndex = overlaySources.indexOf(source);
                if (overlayIndex !== -1) {
                    overlaySources.splice(overlayIndex, 1);
                    if (overlaySources.length === 0) {
                        this._private__overlaySourcesByScaleId.delete(priceScaleId);
                    }
                }
            }
            var priceScale = source.priceScale();
            // if source has owner, it returns owner's price scale
            // and it does not have source in their list
            if (priceScale && priceScale.dataSources().indexOf(source) >= 0) {
                priceScale.removeDataSource(source);
            }
            if (priceScale !== null) {
                priceScale.invalidateSourcesCache();
                this.recalculatePriceScale(priceScale);
            }
            this._private__cachedOrderedSources = null;
        };
        Pane.prototype.priceScalePosition = function (priceScale) {
            if (priceScale === this._private__leftPriceScale) {
                return 'left';
            }
            if (priceScale === this._private__rightPriceScale) {
                return 'right';
            }
            return 'overlay';
        };
        Pane.prototype.leftPriceScale = function () {
            return this._private__leftPriceScale;
        };
        Pane.prototype.rightPriceScale = function () {
            return this._private__rightPriceScale;
        };
        Pane.prototype.startScalePrice = function (priceScale, x) {
            priceScale.startScale(x);
        };
        Pane.prototype.scalePriceTo = function (priceScale, x) {
            priceScale.scaleTo(x);
            // TODO: be more smart and update only affected views
            this.updateAllSources();
        };
        Pane.prototype.endScalePrice = function (priceScale) {
            priceScale.endScale();
        };
        Pane.prototype.startScrollPrice = function (priceScale, x) {
            priceScale.startScroll(x);
        };
        Pane.prototype.scrollPriceTo = function (priceScale, x) {
            priceScale.scrollTo(x);
            this.updateAllSources();
        };
        Pane.prototype.endScrollPrice = function (priceScale) {
            priceScale.endScroll();
        };
        Pane.prototype.updateAllSources = function () {
            this._private__dataSources.forEach(function (source) {
                source.updateAllViews();
            });
        };
        Pane.prototype.defaultPriceScale = function () {
            var priceScale = null;
            if (this._private__model.options().rightPriceScale.visible && this._private__rightPriceScale.dataSources().length !== 0) {
                priceScale = this._private__rightPriceScale;
            }
            else if (this._private__model.options().leftPriceScale.visible && this._private__leftPriceScale.dataSources().length !== 0) {
                priceScale = this._private__leftPriceScale;
            }
            else if (this._private__dataSources.length !== 0) {
                priceScale = this._private__dataSources[0].priceScale();
            }
            if (priceScale === null) {
                priceScale = this._private__rightPriceScale;
            }
            return priceScale;
        };
        Pane.prototype.defaultVisiblePriceScale = function () {
            var priceScale = null;
            if (this._private__model.options().rightPriceScale.visible) {
                priceScale = this._private__rightPriceScale;
            }
            else if (this._private__model.options().leftPriceScale.visible) {
                priceScale = this._private__leftPriceScale;
            }
            return priceScale;
        };
        Pane.prototype.recalculatePriceScale = function (priceScale) {
            if (priceScale === null || !priceScale.isAutoScale()) {
                return;
            }
            this._private__recalculatePriceScaleImpl(priceScale);
        };
        Pane.prototype.resetPriceScale = function (priceScale) {
            var visibleBars = this._private__timeScale.visibleStrictRange();
            priceScale.setMode({ autoScale: true });
            if (visibleBars !== null) {
                priceScale.recalculatePriceRange(visibleBars);
            }
            this.updateAllSources();
        };
        Pane.prototype.momentaryAutoScale = function () {
            this._private__recalculatePriceScaleImpl(this._private__leftPriceScale);
            this._private__recalculatePriceScaleImpl(this._private__rightPriceScale);
        };
        Pane.prototype.recalculate = function () {
            var _this = this;
            this.recalculatePriceScale(this._private__leftPriceScale);
            this.recalculatePriceScale(this._private__rightPriceScale);
            this._private__dataSources.forEach(function (ds) {
                if (_this.isOverlay(ds)) {
                    _this.recalculatePriceScale(ds.priceScale());
                }
            });
            this.updateAllSources();
            this._private__model.lightUpdate();
        };
        Pane.prototype.orderedSources = function () {
            if (this._private__cachedOrderedSources === null) {
                this._private__cachedOrderedSources = sortSources(this._private__dataSources);
            }
            return this._private__cachedOrderedSources;
        };
        Pane.prototype.onDestroyed = function () {
            return this._private__destroyed;
        };
        Pane.prototype.grid = function () {
            return this._private__grid;
        };
        Pane.prototype._private__recalculatePriceScaleImpl = function (priceScale) {
            // TODO: can use this checks
            var sourceForAutoScale = priceScale.sourcesForAutoScale();
            if (sourceForAutoScale && sourceForAutoScale.length > 0 && !this._private__timeScale.isEmpty()) {
                var visibleBars = this._private__timeScale.visibleStrictRange();
                if (visibleBars !== null) {
                    priceScale.recalculatePriceRange(visibleBars);
                }
            }
            priceScale.updateAllViews();
        };
        Pane.prototype._private__getZOrderMinMax = function () {
            var sources = this.orderedSources();
            if (sources.length === 0) {
                return { _internal_minZOrder: 0, _internal_maxZOrder: 0 };
            }
            var minZOrder = 0;
            var maxZOrder = 0;
            for (var j = 0; j < sources.length; j++) {
                var ds = sources[j];
                var zOrder = ds.zorder();
                if (zOrder !== null) {
                    if (zOrder < minZOrder) {
                        minZOrder = zOrder;
                    }
                    if (zOrder > maxZOrder) {
                        maxZOrder = zOrder;
                    }
                }
            }
            return { _internal_minZOrder: minZOrder, _internal_maxZOrder: maxZOrder };
        };
        Pane.prototype._private__insertDataSource = function (source, priceScaleId, zOrder) {
            var priceScale = this.priceScaleById(priceScaleId);
            if (priceScale === null) {
                priceScale = this._private__createPriceScale(priceScaleId, this._private__model.options().overlayPriceScales);
            }
            this._private__dataSources.push(source);
            if (!isDefaultPriceScale(priceScaleId)) {
                var overlaySources = this._private__overlaySourcesByScaleId.get(priceScaleId) || [];
                overlaySources.push(source);
                this._private__overlaySourcesByScaleId.set(priceScaleId, overlaySources);
            }
            if (typeof source.seriesType === 'undefined' || source.seriesType() !== 'BrokenArea') {
                priceScale.addDataSource(source);
            }
            source.setPriceScale(priceScale);
            source.setZorder(zOrder);
            this.recalculatePriceScale(priceScale);
            this._private__cachedOrderedSources = null;
        };
        Pane.prototype._private__onPriceScaleModeChanged = function (priceScale, oldMode, newMode) {
            if (oldMode.mode === newMode.mode) {
                return;
            }
            // momentary auto scale if we toggle percentage/indexedTo100 mode
            this._private__recalculatePriceScaleImpl(priceScale);
        };
        Pane.prototype._private__createPriceScale = function (id, options) {
            var actualOptions = __assign({ visible: true, autoScale: true }, clone(options));
            var priceScale = new PriceScale(id, actualOptions, this._private__model.options().layout, this._private__model.options().localization);
            priceScale.setHeight(this.height());
            return priceScale;
        };
        return Pane;
    }());

    var AnchorPoint = /** @class */ (function (_super) {
        __extends(AnchorPoint, _super);
        function AnchorPoint(x, y, data, square) {
            var _this = _super.call(this, x, y) || this;
            _this._internal_data = data;
            _this._internal_square = square;
            return _this;
        }
        AnchorPoint.prototype.clone = function () {
            return new AnchorPoint(this.x, this.y, this._internal_data, this._internal_square);
        };
        return AnchorPoint;
    }(Point));
    var LineAnchorRenderer = /** @class */ (function () {
        function LineAnchorRenderer(data) {
            this._internal__data = data !== undefined ? data : null;
        }
        LineAnchorRenderer.prototype._internal_setData = function (data) {
            this._internal__data = data;
        };
        LineAnchorRenderer.prototype._internal_updateData = function (data) {
            this._internal__data = merge(this._internal__data, data);
        };
        LineAnchorRenderer.prototype.draw = function (ctx, renderParams) {
            if (this._internal__data === null || !this._internal__data._internal_visible) {
                return;
            }
            var squarePoints = [];
            var squareColors = [];
            var circlePoints = [];
            var circleColors = [];
            var pixelRatio = renderParams.pixelRatio;
            for (var e = 0; e < this._internal__data._internal_points.length; ++e) {
                var point = this._internal__data._internal_points[e];
                var color = this._internal__data._internal_backgroundColors[e];
                if (point._internal_square) {
                    squarePoints.push(point);
                    squareColors.push(color);
                }
                else {
                    circlePoints.push(point);
                    circleColors.push(color);
                }
            }
            ctx.strokeStyle = this._internal__data._internal_color;
            if (squarePoints.length) {
                this._internal__drawPoints(ctx, pixelRatio, squarePoints, squareColors, drawRectBody, drawRectShadow);
            }
            if (circlePoints.length) {
                this._internal__drawPoints(ctx, pixelRatio, circlePoints, circleColors, drawCircleBody, drawCircleShadow);
            }
        };
        LineAnchorRenderer.prototype.hitTest = function (position) {
            if (null === this._internal__data) {
                return null;
            }
            for (var r = 0; r < this._internal__data._internal_points.length; ++r) {
                var point = this._internal__data._internal_points[r];
                if (point.subtract(position).length() <= this._internal__data._internal_radius + interactionTolerance._internal_anchor) {
                    var cursorType = this._internal__data._internal_pointsCursorType !== undefined ? this._internal__data._internal_pointsCursorType[r] : PaneCursorType.Default;
                    var pointIndex = point._internal_data;
                    return new HitTestResult(this._internal__data._internal_hitTestType, { _internal_pointIndex: pointIndex, _internal_cursorType: cursorType });
                }
            }
            return null;
        };
        LineAnchorRenderer.prototype._internal__drawPoints = function (ctx, pixelRatio, points, colors, drawBody, drawShadow) {
            var data = ensureNotNull(this._internal__data);
            var currentPoint = data._internal_currentPoint;
            var lineWidth = Math.max(1, Math.floor((data._internal_strokeWidth || 2) * pixelRatio));
            if (data._internal_selected) {
                lineWidth += Math.max(1, Math.floor(pixelRatio / 2));
            }
            var pixelRatioInt = Math.max(1, Math.floor(pixelRatio));
            var radius = Math.round(data._internal_radius * pixelRatio * 2);
            if (pixelRatio % 2 !== pixelRatioInt % 2) {
                radius += 1;
            }
            var shift = pixelRatioInt % 2 / 2;
            for (var d = 0; d < points.length; ++d) {
                var point = points[d];
                ctx.fillStyle = colors[d];
                if (!(Number.isInteger(point._internal_data) && data._internal_editedPointIndex === point._internal_data)) {
                    var x = Math.round(point.x * pixelRatio) + shift;
                    var y = Math.round(point.y * pixelRatio) + shift;
                    drawBody(ctx, new AnchorPoint(x, y, point._internal_data, point._internal_square), radius / 2, lineWidth);
                    if (point.subtract(currentPoint).length() <= data._internal_radius + interactionTolerance._internal_anchor) {
                        var hoveredLineWidth = Math.max(1, Math.floor(data._internal_hoveredStrokeWidth * pixelRatio));
                        drawShadow(ctx, new AnchorPoint(x, y, point._internal_data, point._internal_square), radius / 2, hoveredLineWidth);
                    }
                }
            }
        };
        return LineAnchorRenderer;
    }());
    function drawRect(ctx, point, radius, lineWidth) {
        ctx.lineWidth = lineWidth;
        var n = radius + lineWidth / 2;
        drawRoundRect(ctx, point.x - n, point.y - n, 2 * n, 2 * n, (radius + lineWidth) / 2);
        ctx.closePath();
    }
    function drawRectShadow(ctx, point, radius, lineWidth) {
        ctx.globalAlpha = 0.2;
        drawRect(ctx, point, radius, lineWidth);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
    function drawRectBody(ctx, point, radius, lineWidth) {
        drawRect(ctx, point, radius - lineWidth, lineWidth);
        ctx.fill();
        ctx.stroke();
    }
    function drawCircleShadow(ctx, point, radius, lineWidth) {
        ctx.lineWidth = lineWidth;
        ctx.globalAlpha = 0.2;
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius + lineWidth / 2, 0, 2 * Math.PI, true);
        ctx.closePath();
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
    function drawCircleBody(ctx, point, radius, lineWidth) {
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius - lineWidth / 2, 0, 2 * Math.PI, true);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    var LineToolPaneView = /** @class */ (function () {
        function LineToolPaneView(source, model) {
            this._internal__points = [];
            this._internal__invalidated = true;
            this._internal__lastMovePoint = null;
            this._internal__editedPointIndex = null;
            this._internal__lineAnchorRenderers = [];
            this._internal__renderer = null;
            this._internal__source = source;
            this._internal__model = model;
        }
        // eslint-disable-next-line complexity
        LineToolPaneView.prototype.onInputEvent = function (paneWidget, eventType, event) {
            if (!event || (!this._internal__renderer || !this._internal__renderer.hitTest) && this._internal__source.finished()) {
                return;
            }
            var crossHair = this._internal__model.crosshairSource();
            var appliedPoint = new Point(crossHair.appliedX(), crossHair.appliedY());
            var originPoint = new Point(crossHair.originCoordX(), crossHair.originCoordY());
            var changed = eventType === 11 /* PressedMouseMove */ && !event.consumed
                ? this._internal__onPressedMouseMove(paneWidget, originPoint, appliedPoint)
                : eventType === 9 /* MouseMove */
                    ? this._internal__onMouseMove(paneWidget, originPoint, appliedPoint, event)
                    : eventType === 6 /* MouseDown */
                        ? this._internal__onMouseDown(paneWidget, originPoint, appliedPoint, event)
                        : eventType === 10 /* MouseUp */
                            ? this._internal__onMouseUp()
                            : false;
            event.consumed || (event.consumed = this._internal__source.editing() || !this._internal__source.finished());
            if (changed || this._internal__source.hovered() || this._internal__source.editing() || !this._internal__source.finished()) {
                this._internal_updateLineAnchors();
            }
        };
        LineToolPaneView.prototype.renderer = function (height, width, pane) {
            if (this._internal__invalidated) {
                this._internal__updateImpl(height, width);
            }
            return this._internal__source.visible() ? this._internal__renderer : null;
        };
        LineToolPaneView.prototype._internal_priceToCoordinate = function (price) {
            var priceScale = this._internal__source.priceScale();
            var ownerSource = this._internal__source.ownerSource();
            if (priceScale === null) {
                return null;
            }
            var basePrice = ownerSource !== null ? ownerSource.firstValue() : null;
            return basePrice === null ? null : priceScale.priceToCoordinate(price, basePrice.value);
        };
        LineToolPaneView.prototype._internal_currentPoint = function () {
            var crossHair = this._internal__model.crosshairSource();
            return new Point(crossHair.originCoordX(), crossHair.originCoordY());
        };
        LineToolPaneView.prototype._internal_editedPointIndex = function () {
            return this._internal__source.editing() ? this._internal__editedPointIndex : null;
        };
        LineToolPaneView.prototype._internal_areAnchorsVisible = function () {
            return this._internal__source.hovered() || this._internal__source.selected() || this._internal__source.editing() || !this._internal__source.finished();
        };
        LineToolPaneView.prototype.update = function () {
            this._internal__invalidated = true;
        };
        LineToolPaneView.prototype._internal_addAnchors = function (renderer) {
            renderer._internal_append(this._internal_createLineAnchor({ _internal_points: this._internal__points }, 0));
        };
        LineToolPaneView.prototype._internal_updateLineAnchors = function () {
            var _this = this;
            this._internal__lineAnchorRenderers.forEach(function (renderer) {
                renderer._internal_updateData({
                    _internal_points: _this._internal__points,
                    _internal_selected: _this._internal__source.selected(),
                    _internal_visible: _this._internal_areAnchorsVisible(),
                    _internal_currentPoint: _this._internal_currentPoint(),
                    _internal_editedPointIndex: _this._internal_editedPointIndex(),
                });
            });
            this._internal__model.updateSource(this._internal__source);
            this._internal__source.updateAllViews();
        };
        LineToolPaneView.prototype._internal_createLineAnchor = function (data, index) {
            var renderer = this._internal__getLineAnchorRenderer(index);
            renderer._internal_setData(__assign(__assign({}, data), { _internal_radius: 6, _internal_strokeWidth: 1, _internal_color: '#1E53E5', _internal_hoveredStrokeWidth: 4, _internal_selected: this._internal__source.selected(), _internal_visible: this._internal_areAnchorsVisible(), _internal_currentPoint: this._internal_currentPoint(), _internal_backgroundColors: this._internal__lineAnchorColors(data._internal_points), _internal_editedPointIndex: this._internal__source.editing() ? this._internal_editedPointIndex() : null, _internal_hitTestType: HitTestType.ChangePoint }));
            return renderer;
        };
        LineToolPaneView.prototype._internal__onMouseUp = function () {
            if (!this._internal__source.finished()) {
                this._internal__source.tryFinish();
            }
            else if (this._internal__source.editing()) {
                this._internal__model.magnet().disable();
                this._internal__updateSourcePoints();
                this._internal__lastMovePoint = null;
                this._internal__editedPointIndex = null;
                this._internal__source.setEditing(false);
                return true;
            }
            return false;
        };
        LineToolPaneView.prototype._internal__onPressedMouseMove = function (paneWidget, originPoint, appliedPoint) {
            var _a;
            if (!this._internal__source.finished()) {
                if (this._internal__source.lineDrawnWithPressedButton()) {
                    this._internal__source.addPoint(this._internal__source.screenPointToPoint(appliedPoint));
                }
                return false;
            }
            if (!this._internal__source.selected()) {
                return false;
            }
            if (!this._internal__source.editing()) {
                var hitResult = this._internal__hitTest(paneWidget, originPoint);
                var hitData = hitResult === null || hitResult === void 0 ? void 0 : hitResult.data();
                this._internal__source.setEditing(this._internal__source.hovered() || !!hitResult);
                this._internal__lastMovePoint = appliedPoint;
                this._internal__editedPointIndex = (_a = hitData === null || hitData === void 0 ? void 0 : hitData._internal_pointIndex) !== null && _a !== void 0 ? _a : this._internal__editedPointIndex;
                if (hitData) {
                    this._internal__model.magnet().enable();
                }
            }
            else {
                paneWidget.setCursor(this._internal__editedPointIndex !== null ? PaneCursorType.Default : PaneCursorType.Grabbing);
                if (this._internal__editedPointIndex !== null) {
                    this._internal__source.setPoint(this._internal__editedPointIndex, this._internal__source.screenPointToPoint(appliedPoint));
                }
                else if (this._internal__lastMovePoint) {
                    var diff_1 = appliedPoint.subtract(this._internal__lastMovePoint);
                    this._internal__points.forEach(function (point) {
                        point.x = (point.x + diff_1.x);
                        point.y = (point.y + diff_1.y);
                    });
                    this._internal__lastMovePoint = appliedPoint;
                    this._internal__updateSourcePoints();
                }
            }
            return false;
        };
        LineToolPaneView.prototype._internal__onMouseMove = function (paneWidget, originPoint, appliedPoint, event) {
            var _a, _b, _c;
            if (!this._internal__source.finished()) {
                if (this._internal__source.hasMagnet()) {
                    this._internal__model.magnet().enable();
                }
                this._internal__source.setLastPoint(this._internal__source.screenPointToPoint(appliedPoint));
            }
            else {
                var hitResult = this._internal__hitTest(paneWidget, originPoint);
                var changed = this._internal__source.setHovered(hitResult !== null && !event.consumed);
                if (this._internal__source.hovered() && !event.consumed) {
                    paneWidget.setCursor(((_a = hitResult === null || hitResult === void 0 ? void 0 : hitResult.data()) === null || _a === void 0 ? void 0 : _a._internal_cursorType) || PaneCursorType.Pointer);
                    this._internal__editedPointIndex = (_c = (_b = hitResult === null || hitResult === void 0 ? void 0 : hitResult.data()) === null || _b === void 0 ? void 0 : _b._internal_pointIndex) !== null && _c !== void 0 ? _c : null;
                }
                return changed;
            }
            return false;
        };
        LineToolPaneView.prototype._internal__onMouseDown = function (paneWidget, originPoint, appliedPoint, event) {
            if (!this._internal__source.finished()) {
                this._internal__source.addPoint(this._internal__source.screenPointToPoint(appliedPoint));
                return false;
            }
            else {
                var hitResult = this._internal__hitTest(paneWidget, originPoint);
                return this._internal__source.setSelected(hitResult !== null && !event.consumed);
            }
        };
        LineToolPaneView.prototype._internal__updateSourcePoints = function () {
            var _this = this;
            this._internal__source.setPoints(this._internal__points.map(function (point) { return _this._internal__source.screenPointToPoint(point); }));
        };
        LineToolPaneView.prototype._internal__hitTest = function (paneWidget, point) {
            var _a;
            if (!((_a = this._internal__renderer) === null || _a === void 0 ? void 0 : _a.hitTest)) {
                return null;
            }
            var renderParams = paneWidget.canvasRenderParams();
            return this._internal__renderer.hitTest(point, renderParams);
        };
        LineToolPaneView.prototype._internal__lineAnchorColors = function (points) {
            var _this = this;
            var height = ensureNotNull(this._internal__model.paneForSource(this._internal__source)).height();
            return points.map(function (point) { return _this._internal__model.backgroundColorAtYPercentFromTop(point.y / height); });
        };
        LineToolPaneView.prototype._internal__updateImpl = function (height, width) {
            this._internal__invalidated = false;
            if (this._internal__model.timeScale().isEmpty()) {
                return;
            }
            if (!this._internal__validatePriceScale()) {
                return;
            }
            this._internal__points = [];
            var sourcePoints = this._internal__source.points();
            for (var i = 0; i < sourcePoints.length; i++) {
                var point = this._internal__source.pointToScreenPoint(sourcePoints[i]);
                if (!point) {
                    return;
                }
                point._internal_data = i;
                this._internal__points.push(point);
            }
        };
        LineToolPaneView.prototype._internal__validatePriceScale = function () {
            var priceScale = this._internal__source.priceScale();
            return null !== priceScale && !priceScale.isEmpty();
        };
        LineToolPaneView.prototype._internal__getLineAnchorRenderer = function (index) {
            for (; this._internal__lineAnchorRenderers.length <= index;) {
                this._internal__lineAnchorRenderers.push(new LineAnchorRenderer());
            }
            return this._internal__lineAnchorRenderers[index];
        };
        return LineToolPaneView;
    }());

    var TrendLinePaneView = /** @class */ (function (_super) {
        __extends(TrendLinePaneView, _super);
        function TrendLinePaneView(source, model) {
            var _this = _super.call(this, source, model) || this;
            _this._internal__lineRenderer = new SegmentRenderer();
            _this._internal__labelRenderer = new TextRenderer();
            _this._internal__renderer = null;
            return _this;
        }
        // eslint-disable-next-line complexity
        TrendLinePaneView.prototype._internal__updateImpl = function () {
            this._internal__renderer = null;
            this._internal__invalidated = false;
            var priceScale = this._internal__source.priceScale();
            var timeScale = this._internal__model.timeScale();
            if (!priceScale || priceScale.isEmpty() || timeScale.isEmpty()) {
                return;
            }
            var strictRange = timeScale.visibleTimeRange();
            if (strictRange === null) {
                return;
            }
            var points = this._internal__source.points();
            if (points.length < 2) {
                return;
            }
            var options = this._internal__source.options();
            var isOutsideView = Math.max(points[0].timestamp, points[1].timestamp) < strictRange.from.timestamp;
            if (!isOutsideView || options.line.extend.left || options.line.extend.right) {
                _super.prototype._internal__updateImpl.call(this);
                if (this._internal__points.length < 2) {
                    return;
                }
                var compositeRenderer = new CompositeRenderer();
                this._internal__lineRenderer._internal_setData({ _internal_line: options.line, _internal_points: this._internal__points });
                compositeRenderer._internal_append(this._internal__lineRenderer);
                if (options.text.value) {
                    var point0 = this._internal__points[0];
                    var point1 = this._internal__points[1];
                    var start = point0.x < point1.x ? point0 : point1;
                    var end = start === point0 ? point1 : point0;
                    var angle = Math.atan((end.y - start.y) / (end.x - start.x));
                    var align = options.text.box.alignment.horizontal;
                    var pivot = align === "left" /* Left */
                        ? start.clone() : align === "right" /* Right */
                        ? end.clone() : new Point((point0.x + point1.x) / 2, (point0.y + point1.y) / 2);
                    var labelOptions = deepCopy(options.text);
                    labelOptions.box = __assign(__assign({}, labelOptions.box), { angle: angle });
                    this._internal__labelRenderer._internal_setData({ _internal_text: labelOptions, _internal_points: [pivot] });
                    compositeRenderer._internal_append(this._internal__labelRenderer);
                }
                this._internal_addAnchors(compositeRenderer);
                this._internal__renderer = compositeRenderer;
            }
        };
        return TrendLinePaneView;
    }(LineToolPaneView));

    var LineToolTrendLine = /** @class */ (function (_super) {
        __extends(LineToolTrendLine, _super);
        function LineToolTrendLine(model, options, points) {
            if (points === void 0) { points = []; }
            var _this = _super.call(this, model, options, points) || this;
            _this._toolType = 'TrendLine';
            _this._setPaneViews([new TrendLinePaneView(_this, model)]);
            return _this;
        }
        LineToolTrendLine.prototype.pointsCount = function () {
            return 2;
        };
        return LineToolTrendLine;
    }(LineTool));

    var LineToolArrow = /** @class */ (function (_super) {
        __extends(LineToolArrow, _super);
        function LineToolArrow() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this._toolType = 'Arrow';
            return _this;
        }
        return LineToolArrow;
    }(LineToolTrendLine));

    var PolygonRenderer = /** @class */ (function (_super) {
        __extends(PolygonRenderer, _super);
        function PolygonRenderer(hitTest) {
            var _this = _super.call(this) || this;
            _this._internal__backHitTest = new HitTestResult(HitTestType.MovePointBackground);
            _this._internal__hitTest = hitTest || new HitTestResult(HitTestType.MovePoint);
            _this._internal__data = null;
            return _this;
        }
        PolygonRenderer.prototype._internal_setData = function (data) {
            this._internal__data = data;
        };
        PolygonRenderer.prototype.hitTest = function (point) {
            if (this._internal__data === null) {
                return null;
            }
            var lineWidth = this._internal__data._internal_line.width || 1;
            var distance = Math.max(interactionTolerance._internal_line, Math.ceil(lineWidth / 2));
            var pointsCount = this._internal__data._internal_points.length;
            if (pointsCount === 1) {
                return pointInCircle(point, this._internal__data._internal_points[0], distance) ? this._internal__hitTest : null;
            }
            for (var n = 1; n < pointsCount; n++) {
                if (distanceToSegment(this._internal__data._internal_points[n - 1], this._internal__data._internal_points[n], point)._internal_distance <= distance) {
                    return this._internal__hitTest;
                }
            }
            if (this._internal__data._internal_background && pointsCount > 0) {
                if (distanceToSegment(this._internal__data._internal_points[0], this._internal__data._internal_points[pointsCount - 1], point)._internal_distance <= distance) {
                    return this._internal__hitTest;
                }
            }
            return this._internal__data._internal_background && pointInPolygon(point, this._internal__data._internal_points) ? this._internal__backHitTest : null;
        };
        // eslint-disable-next-line complexity
        PolygonRenderer.prototype._internal__drawImpl = function (ctx, renderParams) {
            var _a, _b;
            if (this._internal__data === null || !this._internal__data._internal_points) {
                return;
            }
            var pointsCount = this._internal__data._internal_points.length;
            var lineStyle = this._internal__data._internal_line.style || 0 /* Solid */;
            var lineJoin = this._internal__data._internal_line.join || "round" /* Round */;
            var lineCap = this._internal__data._internal_line.cap || "butt" /* Butt */;
            var lineColor = this._internal__data._internal_line.color || 'white';
            var lineWidth = this._internal__data._internal_line.width || 1;
            if (pointsCount === 1) {
                return this._internal__drawPoint(ctx, this._internal__data._internal_points[0], pointsCount / 2, lineColor);
            }
            ctx.beginPath();
            ctx.lineCap = lineCap;
            ctx.lineJoin = lineJoin;
            ctx.lineWidth = lineWidth;
            ctx.strokeStyle = lineColor;
            setLineStyle(ctx, lineStyle);
            ctx.moveTo(this._internal__data._internal_points[0].x, this._internal__data._internal_points[0].y);
            for (var _i = 0, _c = this._internal__data._internal_points; _i < _c.length; _i++) {
                var e = _c[_i];
                ctx.lineTo(e.x, e.y);
            }
            if (this._internal__data._internal_background) {
                ctx.fillStyle = this._internal__data._internal_background.color;
                ctx.fill();
            }
            if (lineWidth > 0) {
                ctx.stroke();
            }
            if (pointsCount > 1) {
                if (lineCap !== 'butt') {
                    ctx.lineCap = 'butt';
                }
                if (((_a = this._internal__data._internal_line.end) === null || _a === void 0 ? void 0 : _a.left) === 1 /* Arrow */) {
                    var points = this._internal__correctArrowPoints(this._internal__data._internal_points[1], this._internal__data._internal_points[0], lineWidth, lineCap);
                    drawArrowEnd(points[0], points[1], ctx, lineWidth, 1);
                }
                if (((_b = this._internal__data._internal_line.end) === null || _b === void 0 ? void 0 : _b.right) === 1 /* Arrow */) {
                    var points = this._internal__correctArrowPoints(this._internal__data._internal_points[pointsCount - 2], this._internal__data._internal_points[pointsCount - 1], lineWidth, lineCap);
                    drawArrowEnd(points[0], points[1], ctx, lineWidth, 1);
                }
            }
        };
        PolygonRenderer.prototype._internal__drawPoint = function (ctx, point, lineWidth, color) {
            if (lineWidth !== 0) {
                return;
            }
            ctx.beginPath();
            ctx.fillStyle = color;
            ctx.arc(point.x, point.y, lineWidth, 0, 2 * Math.PI, true);
            ctx.fill();
            ctx.closePath();
        };
        PolygonRenderer.prototype._internal__correctArrowPoints = function (point0, point1, lineWidth, lineCap) {
            var heading = point1.subtract(point0);
            var distance = heading.length();
            if ('butt' === lineCap || distance < 1) {
                return [point0, point1];
            }
            var correctedDistance = distance + lineWidth / 2;
            return [point0, heading.scaled(correctedDistance / distance).add(point0)];
        };
        return PolygonRenderer;
    }(ScaledRenderer));

    var BrushPaneView = /** @class */ (function (_super) {
        __extends(BrushPaneView, _super);
        function BrushPaneView(source, model) {
            var _this = _super.call(this, source, model) || this;
            _this._internal__polygonRenderer = new PolygonRenderer();
            _this._internal__renderer = null;
            return _this;
        }
        BrushPaneView.prototype._internal__updateImpl = function () {
            _super.prototype._internal__updateImpl.call(this);
            this._internal__renderer = null;
            if (this._internal__points.length === 0) {
                return;
            }
            var options = this._internal__source._internal_getBrushOptions();
            var smooth = Math.max(1, this._internal__source._internal_smooth());
            var computedPoints = [this._internal__points[0]];
            for (var i = 1; i < this._internal__points.length; i++) {
                var heading = this._internal__points[i].subtract(this._internal__points[i - 1]);
                var distance = heading.length();
                var iterations = Math.min(5, Math.floor(distance / smooth));
                var segment = heading.normalized().scaled(distance / iterations);
                for (var j = 0; j < iterations - 1; j++) {
                    computedPoints.push(this._internal__points[i - 1].add(segment.scaled(j)));
                }
                computedPoints.push(this._internal__points[i]);
            }
            var points = this._internal__smoothArray(computedPoints, smooth);
            this._internal__polygonRenderer._internal_setData({ _internal_line: options.line, _internal_background: options.background, _internal_points: points });
            var compositeRenderer = new CompositeRenderer();
            compositeRenderer._internal_append(this._internal__polygonRenderer);
            this._internal__renderer = compositeRenderer;
        };
        BrushPaneView.prototype._internal__smoothArray = function (points, interval) {
            var computedPoints = new Array(points.length);
            if (points.length === 1) {
                return points;
            }
            for (var j = 0; j < points.length; j++) {
                var current = new Point(0, 0);
                for (var i = 0; i < interval; i++) {
                    var t = Math.max(j - i, 0);
                    var r = Math.min(j + i, points.length - 1);
                    current = current.add(points[t]);
                    current = current.add(points[r]);
                }
                computedPoints[j] = current.scaled(0.5 / interval);
            }
            computedPoints.push(points[points.length - 1]);
            return computedPoints;
        };
        return BrushPaneView;
    }(LineToolPaneView));

    var LineToolBrush = /** @class */ (function (_super) {
        __extends(LineToolBrush, _super);
        function LineToolBrush(model, options, points) {
            if (points === void 0) { points = []; }
            var _this = _super.call(this, model, options, points) || this;
            _this._toolType = 'Brush';
            _this._setPaneViews([new BrushPaneView(_this, model)]);
            return _this;
        }
        LineToolBrush.prototype.pointsCount = function () {
            return -1;
        };
        LineToolBrush.prototype._internal_smooth = function () {
            return 5;
        };
        LineToolBrush.prototype._internal_getBrushOptions = function () {
            return this.options();
        };
        LineToolBrush.prototype.addPoint = function (point) {
            if (this._finished) {
                return;
            }
            this._lastPoint = null;
            if (this._points.length > 0) {
                var endPoint = this._points[this._points.length - 1];
                var endScreenPoint = ensureNotNull(this.pointToScreenPoint(endPoint));
                if (ensureNotNull(this.pointToScreenPoint(point)).subtract(endScreenPoint).length() < 2) {
                    return;
                }
            }
            return _super.prototype.addPoint.call(this, point);
        };
        LineToolBrush.prototype.hasMagnet = function () {
            return false;
        };
        LineToolBrush.prototype.lineDrawnWithPressedButton = function () {
            return true;
        };
        return LineToolBrush;
    }(LineTool));

    var CrossLinePaneView = /** @class */ (function (_super) {
        __extends(CrossLinePaneView, _super);
        function CrossLinePaneView(source, model) {
            var _this = _super.call(this, source, model) || this;
            _this._internal__verticalLineRenderer = new SegmentRenderer();
            _this._internal__horizontalLineRenderer = new SegmentRenderer();
            _this._internal__renderer = null;
            _this._internal__verticalLineRenderer._internal_setHitTest(new HitTestResult(HitTestType.MovePoint));
            _this._internal__horizontalLineRenderer._internal_setHitTest(new HitTestResult(HitTestType.MovePoint));
            return _this;
        }
        CrossLinePaneView.prototype._internal__updateImpl = function (height, width) {
            this._internal__renderer = null;
            var priceScale = this._internal__source.priceScale();
            var timeScale = this._internal__model.timeScale();
            if (!priceScale || priceScale.isEmpty() || timeScale.isEmpty()) {
                return;
            }
            var points = this._internal__source.points();
            if (points.length < 1) {
                return;
            }
            _super.prototype._internal__updateImpl.call(this);
            var options = this._internal__source.options();
            if (this._internal__points.length < 1) {
                return;
            }
            var point = this._internal__points[0];
            var startVertical = new AnchorPoint(point.x, height, 0);
            var endVertical = new AnchorPoint(point.x, 0, 1);
            var startHorizontal = new AnchorPoint(0, point.y, 0);
            var endHorizontal = new AnchorPoint(width, point.y, 1);
            var extend = { _internal_left: false, _internal_right: false };
            var ends = { _internal_left: 0 /* Normal */, _internal_right: 0 /* Normal */ };
            var compositeRenderer = new CompositeRenderer();
            this._internal__verticalLineRenderer._internal_setData({ _internal_line: __assign(__assign({}, deepCopy(options.line)), { end: ends, extend: extend }), _internal_points: [startVertical, endVertical] });
            this._internal__horizontalLineRenderer._internal_setData({ _internal_line: __assign(__assign({}, deepCopy(options.line)), { end: ends, extend: extend }), _internal_points: [startHorizontal, endHorizontal] });
            compositeRenderer._internal_append(this._internal__verticalLineRenderer);
            compositeRenderer._internal_append(this._internal__horizontalLineRenderer);
            this._internal_addAnchors(compositeRenderer);
            this._internal__renderer = compositeRenderer;
        };
        return CrossLinePaneView;
    }(LineToolPaneView));

    var LineToolCrossLine = /** @class */ (function (_super) {
        __extends(LineToolCrossLine, _super);
        function LineToolCrossLine(model, options, points) {
            if (points === void 0) { points = []; }
            var _this = _super.call(this, model, options, points) || this;
            _this._toolType = 'CrossLine';
            _this._setPaneViews([new CrossLinePaneView(_this, model)]);
            return _this;
        }
        LineToolCrossLine.prototype.pointsCount = function () {
            return 1;
        };
        LineToolCrossLine.prototype.timeAxisLabelColor = function () {
            return this.options().line.color;
        };
        LineToolCrossLine.prototype.priceAxisLabelColor = function () {
            return this.options().line.color;
        };
        return LineToolCrossLine;
    }(LineTool));

    var LineToolExtendedLine = /** @class */ (function (_super) {
        __extends(LineToolExtendedLine, _super);
        function LineToolExtendedLine() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this._toolType = 'ExtendedLine';
            return _this;
        }
        return LineToolExtendedLine;
    }(LineToolTrendLine));

    var RectangleRenderer = /** @class */ (function () {
        function RectangleRenderer(hitTest, backHitTest) {
            this._internal__backHitTest = backHitTest || new HitTestResult(HitTestType.MovePointBackground);
            this._internal__hitTest = hitTest || new HitTestResult(HitTestType.MovePoint);
            this._internal__data = null;
        }
        RectangleRenderer.prototype._internal_setData = function (data) {
            this._internal__data = data;
        };
        RectangleRenderer.prototype._internal_hitTest = function (point, renderParams) {
            if (null === this._internal__data || this._internal__data.points.length < 2) {
                return null;
            }
            var scaledPoint = new Point(point.x * renderParams.pixelRatio, point.y * renderParams.pixelRatio);
            var _a = this._internal__getPointsInPhysicalSpace(renderParams), topLeft = _a[0], bottomRight = _a[1];
            var topRight = new Point(bottomRight.x, topLeft.y);
            var bottomLeft = new Point(topLeft.x, bottomRight.y);
            var topLineHitResult = this._internal__extendAndHitTestLineSegment(scaledPoint, topLeft, topRight, renderParams);
            if (topLineHitResult !== null) {
                return topLineHitResult;
            }
            var bottomLineHitResult = this._internal__extendAndHitTestLineSegment(scaledPoint, bottomLeft, bottomRight, renderParams);
            if (bottomLineHitResult !== null) {
                return bottomLineHitResult;
            }
            var rightSegmentDistance = distanceToSegment(topRight, bottomRight, scaledPoint);
            if (rightSegmentDistance._internal_distance <= 3) {
                return this._internal__hitTest;
            }
            var leftSegmentDistance = distanceToSegment(topLeft, bottomLeft, scaledPoint);
            if (leftSegmentDistance._internal_distance <= 3) {
                return this._internal__hitTest;
            }
            var backgroundHitResult = this._internal__hitTestBackground(scaledPoint, topLeft, bottomRight, renderParams);
            if (this._internal__data.hitTestBackground && backgroundHitResult !== null) {
                return backgroundHitResult;
            }
            return null;
        };
        RectangleRenderer.prototype._internal_draw = function (ctx, renderParams) {
            var _a, _b, _c, _d, _e, _f, _g;
            var borderWidth = ((_b = (_a = this._internal__data) === null || _a === void 0 ? void 0 : _a.border) === null || _b === void 0 ? void 0 : _b.width) || 0;
            var borderColor = (_d = (_c = this._internal__data) === null || _c === void 0 ? void 0 : _c.border) === null || _d === void 0 ? void 0 : _d.color;
            var background = (_f = (_e = this._internal__data) === null || _e === void 0 ? void 0 : _e.background) === null || _f === void 0 ? void 0 : _f.color;
            if (null === this._internal__data || this._internal__data.points.length < 2 || (borderWidth <= 0 && !background)) {
                return;
            }
            ctx.save();
            var scaledBorderWidth = borderWidth ? Math.max(1, Math.floor(borderWidth * renderParams.pixelRatio)) : 0;
            var borderStyle = ((_g = this._internal__data.border) === null || _g === void 0 ? void 0 : _g.style) || 0 /* Solid */;
            var _h = this._internal__getPointsInPhysicalSpace(renderParams), point0 = _h[0], point1 = _h[1];
            var _j = this._internal__data.extend || {}, left = _j.left, right = _j.right;
            fillRectWithBorder(ctx, point0, point1, background, borderColor, scaledBorderWidth, borderStyle, 'center', !!left, !!right, renderParams.physicalWidth);
            ctx.restore();
        };
        RectangleRenderer.prototype._internal__getPointsInPhysicalSpace = function (renderParams) {
            var data = ensureNotNull(this._internal__data);
            var _a = data.points, point0 = _a[0], point1 = _a[1];
            var pixelRatio = renderParams.pixelRatio;
            var minX = Math.min(point0.x, point1.x);
            var maxX = Math.max(point0.x, point1.x);
            var minY = Math.min(point0.y, point1.y);
            var maxY = Math.max(point0.y, point1.y);
            var scaledMinX = Math.round(minX * pixelRatio);
            var scaledMax = Math.round(maxX * pixelRatio);
            var scaledMinY = Math.round(minY * pixelRatio);
            var scaledMaxY = Math.round(maxY * pixelRatio);
            return [new Point(scaledMinX, scaledMinY), new Point(scaledMax, scaledMaxY)];
        };
        RectangleRenderer.prototype._internal__extendAndClipLineSegment = function (end0, end1, renderParams) {
            var _a, _b;
            var data = ensureNotNull(this._internal__data);
            if (equalPoints(end0, end1)) {
                return null;
            }
            var physicalWidth = renderParams.physicalWidth;
            var minX = Math.min(end0.x, end1.x);
            var maxX = Math.max(end0.x, end1.x);
            var x1 = ((_a = data.extend) === null || _a === void 0 ? void 0 : _a.left) ? 0 : Math.max(minX, 0);
            var x2 = ((_b = data.extend) === null || _b === void 0 ? void 0 : _b.right) ? physicalWidth : Math.min(maxX, physicalWidth);
            return x1 > x2 || x2 <= 0 || x1 >= physicalWidth ? null : [new Point(x1, end0.y), new Point(x2, end1.y)];
        };
        RectangleRenderer.prototype._internal__extendAndHitTestLineSegment = function (point, end0, end1, renderParams) {
            var line = this._internal__extendAndClipLineSegment(end0, end1, renderParams);
            if (line !== null && distanceToSegment(line[0], line[1], point)._internal_distance <= 3) {
                return this._internal__hitTest;
            }
            return null;
        };
        RectangleRenderer.prototype._internal__hitTestBackground = function (point, end0, end1, renderParams) {
            var line = this._internal__extendAndClipLineSegment(end0, end1, renderParams);
            return line !== null && pointInBox(point, new Box(line[0], line[1])) ? this._internal__backHitTest : null;
        };
        return RectangleRenderer;
    }());

    var FibRetracementPaneView = /** @class */ (function (_super) {
        __extends(FibRetracementPaneView, _super);
        function FibRetracementPaneView(source, model) {
            var _this = _super.call(this, source, model) || this;
            _this._internal__rectangleRenderers = [];
            _this._internal__labelRenderers = [];
            _this._internal__lineRenderers = [];
            _this._internal__renderer = null;
            return _this;
        }
        // eslint-disable-next-line complexity
        FibRetracementPaneView.prototype._internal__updateImpl = function () {
            this._internal__renderer = null;
            this._internal__invalidated = false;
            var priceScale = this._internal__source.priceScale();
            var timeScale = this._internal__model.timeScale();
            if (!priceScale || priceScale.isEmpty() || timeScale.isEmpty()) {
                return;
            }
            var strictRange = timeScale.visibleTimeRange();
            if (strictRange === null) {
                return;
            }
            var points = this._internal__source.points();
            if (points.length < 2) {
                return;
            }
            var options = this._internal__source.options();
            var isOutsideView = Math.max(points[0].timestamp, points[1].timestamp) < strictRange.from.timestamp;
            if (!isOutsideView || options.extend.left || options.extend.right) {
                _super.prototype._internal__updateImpl.call(this);
                if (this._internal__points.length < 2) {
                    return;
                }
                var compositeRenderer = new CompositeRenderer();
                var minX = Math.min(this._internal__points[0].x, this._internal__points[1].x);
                var maxX = Math.max(this._internal__points[0].x, this._internal__points[1].x);
                var levelCoordinates = this._internal__levelsData(this._internal__source.points()[0].price, this._internal__source.points()[1].price, options.levels);
                for (var i = 0, j = -1; i < levelCoordinates.length; i++, j++) {
                    if (!this._internal__lineRenderers[i]) {
                        this._internal__lineRenderers.push(new SegmentRenderer());
                        this._internal__labelRenderers.push(new TextRenderer());
                    }
                    var linePoints = [
                        new AnchorPoint(minX, levelCoordinates[i]._internal_coordinate, 0),
                        new AnchorPoint(maxX, levelCoordinates[i]._internal_coordinate, 0),
                    ];
                    this._internal__lineRenderers[i]._internal_setData({
                        _internal_line: __assign(__assign({}, options.line), { extend: options.extend, color: options.levels[i].color }),
                        _internal_points: linePoints,
                    });
                    this._internal__labelRenderers[i]._internal_setData({
                        _internal_text: {
                            alignment: "right" /* Right */,
                            value: "".concat(options.levels[i].coeff, "(").concat(levelCoordinates[i]._internal_price, ")"),
                            font: { color: options.levels[i].color, size: 11, family: defaultFontFamily },
                            box: { alignment: { horizontal: "right" /* Right */, vertical: "middle" /* Middle */ } },
                        },
                        _internal_points: linePoints,
                    });
                    compositeRenderer._internal_append(this._internal__labelRenderers[i]);
                    compositeRenderer._internal_append(this._internal__lineRenderers[i]);
                    if (j < 0) {
                        continue;
                    }
                    if (!this._internal__rectangleRenderers[j]) {
                        this._internal__rectangleRenderers.push(new RectangleRenderer());
                    }
                    this._internal__rectangleRenderers[j]._internal_setData(__assign(__assign({}, options.line), { extend: options.extend, background: { color: applyAlpha(options.levels[i].color, 0.2) }, points: [new AnchorPoint(minX, levelCoordinates[i - 1]._internal_coordinate, 0), new AnchorPoint(maxX, levelCoordinates[i]._internal_coordinate, 0)] }));
                    compositeRenderer._internal_append(this._internal__rectangleRenderers[j]);
                }
                this._internal_addAnchors(compositeRenderer);
                this._internal__renderer = compositeRenderer;
            }
        };
        FibRetracementPaneView.prototype._internal__levelsData = function (min, max, levels) {
            var _a, _b;
            var baseValue = ((_b = (_a = this._internal__source.ownerSource()) === null || _a === void 0 ? void 0 : _a.firstValue()) === null || _b === void 0 ? void 0 : _b.value) || 0;
            var priceScale = this._internal__source.priceScale();
            var gap = max - min;
            if (!priceScale || !baseValue) {
                return [];
            }
            return levels.map(function (level) {
                var price = max - level.coeff * gap;
                var coordinate = priceScale.priceToCoordinate(price, baseValue);
                return { _internal_coordinate: coordinate, _internal_price: priceScale.formatPrice(price, baseValue) };
            });
        };
        return FibRetracementPaneView;
    }(LineToolPaneView));

    var LineToolFibRetracement = /** @class */ (function (_super) {
        __extends(LineToolFibRetracement, _super);
        function LineToolFibRetracement(model, options, points) {
            if (points === void 0) { points = []; }
            var _this = _super.call(this, model, options, points) || this;
            _this._toolType = 'FibRetracement';
            _this._setPaneViews([new FibRetracementPaneView(_this, model)]);
            return _this;
        }
        LineToolFibRetracement.prototype.pointsCount = function () {
            return 2;
        };
        return LineToolFibRetracement;
    }(LineTool));

    var LineToolHighlighter = /** @class */ (function (_super) {
        __extends(LineToolHighlighter, _super);
        function LineToolHighlighter() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this._toolType = 'Highlighter';
            return _this;
        }
        LineToolHighlighter.prototype._internal_getBrushOptions = function () {
            var options = this.options();
            return {
                visible: options.visible,
                line: {
                    width: 20,
                    cap: "round" /* Round */,
                    join: "round" /* Round */,
                    style: 0 /* Solid */,
                    color: options.line.color,
                    end: { left: 0 /* Normal */, right: 0 /* Normal */ },
                },
            };
        };
        return LineToolHighlighter;
    }(LineToolBrush));

    var HorizontalLinePaneView = /** @class */ (function (_super) {
        __extends(HorizontalLinePaneView, _super);
        function HorizontalLinePaneView(source, model) {
            var _this = _super.call(this, source, model) || this;
            _this._internal__lineRenderer = new SegmentRenderer();
            _this._internal__labelRenderer = new TextRenderer();
            _this._internal__renderer = null;
            _this._internal__lineRenderer._internal_setHitTest(new HitTestResult(HitTestType.MovePoint));
            return _this;
        }
        // eslint-disable-next-line complexity
        HorizontalLinePaneView.prototype._internal__updateImpl = function (height, width) {
            this._internal__renderer = null;
            var priceScale = this._internal__source.priceScale();
            var timeScale = this._internal__model.timeScale();
            if (!priceScale || priceScale.isEmpty() || timeScale.isEmpty()) {
                return;
            }
            var points = this._internal__source.points();
            if (points.length < 1) {
                return;
            }
            var startTime = timeScale.coordinateToTime(0);
            var endTime = timeScale.coordinateToTime(width);
            var options = this._internal__source.options();
            var _a = options.line.extend || {}, left = _a.left, right = _a.right;
            var isOutsideView = (!left && points[0].timestamp > endTime.timestamp) || (!right && points[0].timestamp < startTime.timestamp);
            if (!isOutsideView) {
                _super.prototype._internal__updateImpl.call(this);
                if (this._internal__points.length < 1) {
                    return;
                }
                var point = this._internal__points[0];
                var start = left ? new AnchorPoint(0, point.y, 0) : new AnchorPoint(point.x, point.y, 0);
                var end = right ? new AnchorPoint(width, point.y, 1) : new AnchorPoint(point.x, point.y, 1);
                if (Math.floor(start.x) === Math.floor(end.x) || Math.max(start.x, end.x) <= 0 || end.x < start.x) {
                    return;
                }
                if (left && right) {
                    point.x = width / 2;
                    point._internal_square = true;
                }
                var ends = { _internal_left: 0 /* Normal */, _internal_right: 0 /* Normal */ };
                var compositeRenderer = new CompositeRenderer();
                this._internal__lineRenderer._internal_setData({ _internal_line: __assign(__assign({}, deepCopy(options.line)), { end: ends }), _internal_points: [start, end] });
                compositeRenderer._internal_append(this._internal__lineRenderer);
                if (options.text.value) {
                    var angle = Math.atan((end.y - start.y) / (end.x - start.x));
                    var align = options.text.box.alignment.horizontal;
                    var pivot = align === "left" /* Left */
                        ? start.clone() : align === "right" /* Right */
                        ? end.clone() : new Point((start.x + end.x) / 2, (start.y + end.y) / 2);
                    var labelOptions = deepCopy(options.text);
                    labelOptions.box = __assign(__assign({}, labelOptions.box), { angle: angle });
                    this._internal__labelRenderer._internal_setData({ _internal_text: labelOptions, _internal_points: [pivot] });
                    compositeRenderer._internal_append(this._internal__labelRenderer);
                }
                this._internal_addAnchors(compositeRenderer);
                this._internal__renderer = compositeRenderer;
            }
        };
        return HorizontalLinePaneView;
    }(LineToolPaneView));

    var LineToolHorizontalLine = /** @class */ (function (_super) {
        __extends(LineToolHorizontalLine, _super);
        function LineToolHorizontalLine(model, options, points) {
            if (points === void 0) { points = []; }
            var _this = _super.call(this, model, options, points) || this;
            _this._toolType = 'HorizontalLine';
            _this._setPaneViews([new HorizontalLinePaneView(_this, model)]);
            return _this;
        }
        LineToolHorizontalLine.prototype.pointsCount = function () {
            return 1;
        };
        LineToolHorizontalLine.prototype.timeAxisViews = function () {
            return [];
        };
        LineToolHorizontalLine.prototype.timeAxisPoints = function () {
            return [];
        };
        LineToolHorizontalLine.prototype.priceAxisLabelColor = function () {
            return this.options().line.color;
        };
        return LineToolHorizontalLine;
    }(LineTool));

    var LineToolHorizontalRay = /** @class */ (function (_super) {
        __extends(LineToolHorizontalRay, _super);
        function LineToolHorizontalRay() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this._toolType = 'HorizontalRay';
            return _this;
        }
        return LineToolHorizontalRay;
    }(LineToolHorizontalLine));

    var ParallelChannelRenderer = /** @class */ (function (_super) {
        __extends(ParallelChannelRenderer, _super);
        function ParallelChannelRenderer(hitTest, backHitTest) {
            var _this = _super.call(this) || this;
            _this._internal__backHitTest = backHitTest || new HitTestResult(HitTestType.MovePointBackground);
            _this._internal__hitTest = hitTest || new HitTestResult(HitTestType.MovePoint);
            _this._internal__data = null;
            return _this;
        }
        ParallelChannelRenderer.prototype._internal_setData = function (data) {
            this._internal__data = data;
        };
        ParallelChannelRenderer.prototype.hitTest = function (point, renderParams) {
            if (this._internal__data === null || this._internal__data.points.length < 2) {
                return null;
            }
            var _a = this._internal__data.points, end0 = _a[0], end1 = _a[1];
            var firsLineHitResult = this._internal__extendAndHitTestLineSegment(point, end0, end1, renderParams);
            if (firsLineHitResult !== null) {
                return firsLineHitResult;
            }
            if (this._internal__data.points.length === 4) {
                var _b = this._internal__data.points, end2 = _b[2], end3 = _b[3];
                var secondLineHitResult = this._internal__extendAndHitTestLineSegment(point, end2, end3, renderParams);
                if (null !== secondLineHitResult) {
                    return secondLineHitResult;
                }
                if (this._internal__data.showMiddleLine) {
                    var end4 = end0.add(end2).scaled(0.5);
                    var end5 = end1.add(end3).scaled(0.5);
                    var middleLineHitResult = this._internal__extendAndHitTestLineSegment(point, end4, end5, renderParams);
                    if (null !== middleLineHitResult) {
                        return middleLineHitResult;
                    }
                }
            }
            return this._internal__data.hitTestBackground ? this._internal__hitTestBackground(point) : null;
        };
        ParallelChannelRenderer.prototype._internal__drawImpl = function (ctx, renderParams) {
            var _a, _b, _c, _d, _e, _f;
            if (null === this._internal__data || this._internal__data.points.length < 2) {
                return;
            }
            setLineStyle(ctx, ((_a = this._internal__data.channelLine) === null || _a === void 0 ? void 0 : _a.style) || 0 /* Solid */);
            ctx.strokeStyle = ((_b = this._internal__data.channelLine) === null || _b === void 0 ? void 0 : _b.color) || 'transparent';
            ctx.lineWidth = ((_c = this._internal__data.channelLine) === null || _c === void 0 ? void 0 : _c.width) || 0;
            ctx.lineCap = 'butt';
            var _g = this._internal__data.points, end0 = _g[0], end1 = _g[1];
            this._internal__extendAndDrawLineSegment(ctx, end0, end1, renderParams);
            if (this._internal__data.points.length === 4) {
                var _h = this._internal__data.points, end2 = _h[2], end3 = _h[3];
                this._internal__extendAndDrawLineSegment(ctx, end2, end3, renderParams);
                this._internal__drawBackground(ctx, this._internal__data.points, renderParams);
                if (this._internal__data.showMiddleLine) {
                    setLineStyle(ctx, ((_d = this._internal__data.middleLine) === null || _d === void 0 ? void 0 : _d.style) || 0 /* Solid */);
                    ctx.strokeStyle = ((_e = this._internal__data.middleLine) === null || _e === void 0 ? void 0 : _e.color) || 'transparent';
                    ctx.lineWidth = ((_f = this._internal__data.middleLine) === null || _f === void 0 ? void 0 : _f.width) || 0;
                    var end4 = end0.add(end2).scaled(0.5);
                    var end5 = end1.add(end3).scaled(0.5);
                    this._internal__extendAndDrawLineSegment(ctx, end4, end5, renderParams);
                }
            }
        };
        ParallelChannelRenderer.prototype._internal__extendAndDrawLineSegment = function (ctx, end0, end1, renderParams) {
            var line = this._internal__extendAndClipLineSegment(end0, end1, renderParams);
            if (line !== null) {
                drawLine(ctx, line[0].x, line[0].y, line[1].x, line[1].y);
            }
        };
        ParallelChannelRenderer.prototype._internal__extendAndHitTestLineSegment = function (point, end0, end1, renderParams) {
            var line = this._internal__extendAndClipLineSegment(end0, end1, renderParams);
            if (line !== null && distanceToSegment(line[0], line[1], point)._internal_distance <= 3) {
                return this._internal__hitTest;
            }
            return null;
        };
        ParallelChannelRenderer.prototype._internal__extendAndClipLineSegment = function (end0, end1, renderParams) {
            var _a, _b;
            var data = ensureNotNull(this._internal__data);
            return extendAndClipLineSegment(end0, end1, renderParams.cssWidth, renderParams.cssHeight, !!((_a = data.extend) === null || _a === void 0 ? void 0 : _a.left), !!((_b = data.extend) === null || _b === void 0 ? void 0 : _b.right));
        };
        ParallelChannelRenderer.prototype._internal__drawBackground = function (ctx, points, renderParams) {
            var _a, _b, _c, _d, _e, _f;
            var data = ensureNotNull(this._internal__data);
            var end0 = points[0], end1 = points[1], end2 = points[2], end3 = points[3];
            if (equalPoints(end0, end1) || equalPoints(end2, end3)) {
                return;
            }
            if (renderParams.cssWidth <= 0 || renderParams.cssHeight <= 0) {
                return;
            }
            if (distanceToLine(end0, end1, end2)._internal_distance < 1e-6 || distanceToLine(end0, end1, end3)._internal_distance < 1e-6) {
                return;
            }
            var width = renderParams.cssWidth, height = renderParams.cssHeight;
            var computedPoints = [new Point(0, 0), new Point(width, 0), new Point(width, height), new Point(0, height)];
            computedPoints = this._internal__computePoints(computedPoints, end0, end1, end3);
            if (!((_a = data.extend) === null || _a === void 0 ? void 0 : _a.right)) {
                computedPoints = this._internal__computePoints(computedPoints, end1, end3, end2);
            }
            computedPoints = this._internal__computePoints(computedPoints, end3, end2, end0);
            if (!((_b = data.extend) === null || _b === void 0 ? void 0 : _b.left)) {
                computedPoints = this._internal__computePoints(computedPoints, end2, end0, end1);
            }
            if (computedPoints !== null) {
                ctx.beginPath();
                ctx.moveTo(computedPoints[0].x, computedPoints[0].y);
                for (var e = 1; e < computedPoints.length; e++) {
                    ctx.lineTo(computedPoints[e].x, computedPoints[e].y);
                }
                ctx.fillStyle = ((_d = (_c = this._internal__data) === null || _c === void 0 ? void 0 : _c.background) === null || _d === void 0 ? void 0 : _d.color) || 'transparent';
                if ((_f = (_e = this._internal__data) === null || _e === void 0 ? void 0 : _e.background) === null || _f === void 0 ? void 0 : _f.color) {
                    ctx.fill();
                }
            }
        };
        ParallelChannelRenderer.prototype._internal__hitTestBackground = function (point) {
            var _a, _b;
            var data = ensureNotNull(this._internal__data);
            if (data.points.length !== 4) {
                return null;
            }
            var _c = data.points, end0 = _c[0], end1 = _c[1], end2 = _c[2];
            var l = (end1.y - end0.y) / (end1.x - end0.x);
            var pointLine1Y = end2.y + l * (point.x - end2.x);
            var pointLine0Y = end0.y + l * (point.x - end0.x);
            var bottom = Math.max(pointLine0Y, pointLine1Y);
            var top = Math.min(pointLine0Y, pointLine1Y);
            var maxX = Math.max(end0.x, end1.x);
            var minX = Math.min(end0.x, end1.x);
            if (!((_a = data.extend) === null || _a === void 0 ? void 0 : _a.left) && point.x < minX || !((_b = data.extend) === null || _b === void 0 ? void 0 : _b.right) && point.x > maxX) {
                return null;
            }
            return point.y >= top && point.y <= bottom ? this._internal__backHitTest : null;
        };
        ParallelChannelRenderer.prototype._internal__computePoints = function (points, end0, end1, end2) {
            return points !== null ? intersectPolygonAndHalfPlane(points, halfPlaneThroughPoint(lineThroughPoints(end0, end1), end2)) : null;
        };
        return ParallelChannelRenderer;
    }(ScaledRenderer));

    var pointsCursorType = [PaneCursorType.Default, PaneCursorType.Default, PaneCursorType.Default, PaneCursorType.Default, PaneCursorType.VerticalResize, PaneCursorType.VerticalResize];
    var ParallelChannelPaneView = /** @class */ (function (_super) {
        __extends(ParallelChannelPaneView, _super);
        function ParallelChannelPaneView(source, model) {
            var _this = _super.call(this, source, model) || this;
            _this._internal__channelRenderer = new ParallelChannelRenderer();
            _this._internal__renderer = null;
            return _this;
        }
        ParallelChannelPaneView.prototype._internal__updateImpl = function () {
            _super.prototype._internal__updateImpl.call(this);
            this._internal__renderer = null;
            var priceScale = this._internal__source.priceScale();
            if (!priceScale || priceScale.isEmpty()) {
                return;
            }
            if (this._internal__source.points().length === 0) {
                return;
            }
            if (this._internal__points.length <= 1) {
                return;
            }
            var end0 = this._internal__points[0];
            var end1 = this._internal__points[1];
            var end2 = null;
            var end3 = null;
            if (this._internal__points.length === 3) {
                var height = this._internal__points[2].y - this._internal__points[0].y;
                end2 = new AnchorPoint(end0.x, end0.y + height, 2);
                end3 = new AnchorPoint(end1.x, end1.y + height, 3);
            }
            var points = end2 && end3 ? [end0, end1, end2, end3] : [end0, end1];
            var options = this._internal__source.options();
            this._internal__channelRenderer._internal_setData(__assign(__assign({}, deepCopy(options)), { points: points, hitTestBackground: false }));
            var compositeRenderer = new CompositeRenderer();
            compositeRenderer._internal_append(this._internal__channelRenderer);
            var anchorPoints = [];
            if (this._internal__points[0]) {
                anchorPoints.push(new AnchorPoint(end0.x, end0.y, 0));
            }
            if (this._internal__points[1]) {
                anchorPoints.push(new AnchorPoint(end1.x, end1.y, 1));
            }
            if (end2 && end3) {
                anchorPoints.push(new AnchorPoint(end2.x, end2.y, 2), new AnchorPoint(end3.x, end3.y, 3));
                var middle0 = end2.add(end3).scaled(0.5);
                middle0._internal_data = 4;
                middle0._internal_square = true;
                anchorPoints.push(middle0);
                var middle1 = anchorPoints[0].add(anchorPoints[1]).scaled(0.5);
                middle1._internal_square = true;
                middle1._internal_data = 5;
                anchorPoints.push(middle1);
            }
            var anchorData = { _internal_points: anchorPoints, _internal_pointsCursorType: pointsCursorType };
            compositeRenderer._internal_append(this._internal_createLineAnchor(anchorData, 0));
            this._internal__renderer = compositeRenderer;
        };
        return ParallelChannelPaneView;
    }(LineToolPaneView));

    var LineToolParallelChannel = /** @class */ (function (_super) {
        __extends(LineToolParallelChannel, _super);
        function LineToolParallelChannel(model, options, points) {
            if (points === void 0) { points = []; }
            var _this = _super.call(this, model, options, points) || this;
            _this._toolType = 'ParallelChannel';
            _this._priceAxisViews.push(new LineToolPriceAxisLabelView(_this, 3));
            _this._setPaneViews([new ParallelChannelPaneView(_this, model)]);
            return _this;
        }
        LineToolParallelChannel.prototype.pointsCount = function () {
            return 3;
        };
        LineToolParallelChannel.prototype.addPoint = function (point) {
            if (this._points.length === 2) {
                _super.prototype.addPoint.call(this, this._internal__correctLastPoint(point));
            }
            else {
                _super.prototype.addPoint.call(this, point);
            }
        };
        LineToolParallelChannel.prototype.points = function () {
            var points = _super.prototype.points.call(this);
            if (points.length === 3 && !this.finished()) {
                return [points[0], points[1], this._internal__correctLastPoint(points[2])];
            }
            else {
                return points;
            }
        };
        LineToolParallelChannel.prototype.setPoint = function (index, point) {
            if (this._points[0].timestamp === this._points[1].timestamp && index >= 4) {
                return;
            }
            var screenPoint0 = ensureNotNull(this.pointToScreenPoint(this._points[0]));
            var screenPoint1 = ensureNotNull(this.pointToScreenPoint(this._points[1]));
            var screenPoint = ensureNotNull(this.pointToScreenPoint(point));
            var movingCoordOffset = this._internal__findPixelsHeight() || 0;
            var priceScale = ensureNotNull(this.priceScale());
            var ownerSource = this.ownerSource();
            var firstValue = ensure(ownerSource === null ? undefined : ownerSource.firstValue());
            if (index === 0) {
                _super.prototype.setPoint.call(this, index, point);
                this._points[2].price = priceScale.coordinateToPrice(screenPoint.y + movingCoordOffset, firstValue.value);
            }
            else if (index === 1) {
                _super.prototype.setPoint.call(this, index, point);
            }
            else if (index === 2) {
                _super.prototype.setPoint.call(this, index, point);
                this._points[0].timestamp = point.timestamp;
                this._points[0].price = priceScale.coordinateToPrice(screenPoint.y - movingCoordOffset, firstValue.value);
            }
            else if (index === 3) {
                this._points[1].timestamp = point.timestamp;
                this._points[1].price = priceScale.coordinateToPrice(screenPoint.y - movingCoordOffset, firstValue.value);
            }
            else if (index === 4) {
                var heading = screenPoint1.subtract(screenPoint0);
                var scale = (screenPoint.x - screenPoint0.x) / heading.x;
                var displace = screenPoint.y - screenPoint0.addScaled(heading, scale).y;
                this._points[2].price = priceScale.coordinateToPrice(screenPoint0.y + displace, firstValue.value);
            }
            else if (index === 5) {
                var heading = screenPoint1.subtract(screenPoint0);
                var scale = (screenPoint.x - screenPoint0.x) / heading.x;
                var displace = screenPoint.y - screenPoint0.addScaled(heading, scale).y;
                this._points[0].price = priceScale.coordinateToPrice(screenPoint0.y + displace, firstValue.value);
                this._points[1].price = priceScale.coordinateToPrice(screenPoint1.y + displace, firstValue.value);
            }
        };
        LineToolParallelChannel.prototype.getPoint = function (index) {
            if (index < 3) {
                return _super.prototype.getPoint.call(this, index);
            }
            var end0 = this.pointToScreenPoint(this._points[0]);
            var end1 = this.pointToScreenPoint(this._points[1]);
            var end2 = this.pointToScreenPoint(this._points[2]);
            if (!end0 || !end1 || !end2) {
                return null;
            }
            switch (index) {
                case 3: {
                    var height = end2.y - end0.y;
                    var end3 = end1.add(new Point(0, height));
                    return this.screenPointToPoint(end3);
                }
                case 4: {
                    var height = end2.y - end0.y;
                    var end3 = end1.add(new Point(0, height));
                    var middle0 = end2.add(end3).scaled(0.5);
                    return this.screenPointToPoint(middle0);
                }
                case 5: {
                    var middle1 = end0.add(end1).scaled(0.5);
                    return this.screenPointToPoint(middle1);
                }
            }
            return null;
        };
        LineToolParallelChannel.prototype.priceAxisPoints = function () {
            return this._internal__axisPoints();
        };
        LineToolParallelChannel.prototype.timeAxisPoints = function () {
            return this._internal__axisPoints().slice(0, 2);
        };
        LineToolParallelChannel.prototype._internal__findPixelsHeight = function () {
            var end2 = this.pointToScreenPoint(this._points[2]);
            var end0 = this.pointToScreenPoint(this._points[0]);
            return end2 && end0 ? end2.y - end0.y : null;
        };
        LineToolParallelChannel.prototype._internal__axisPoints = function () {
            var points = this.points();
            var screenPoint0 = this._points[0] ? this.pointToScreenPoint(this._points[0]) : null;
            var screenPoint1 = this._points[1] ? this.pointToScreenPoint(this._points[1]) : null;
            var screenPoint2 = this._points[2] ? this.pointToScreenPoint(this._points[2]) : null;
            if (screenPoint0 && screenPoint1 && screenPoint2) {
                var height = screenPoint1.y - screenPoint0.y;
                var screenPoint3 = screenPoint2.add(new Point(0, height));
                points.push(ensureNotNull(this.screenPointToPoint(screenPoint3)));
            }
            return points;
        };
        LineToolParallelChannel.prototype._internal__correctLastPoint = function (point2) {
            if (this._points.length < 2 || this._points[1].timestamp === this._points[0].timestamp) {
                return point2;
            }
            var screenPoint2 = ensureNotNull(this.pointToScreenPoint(point2));
            var screenPoint1 = ensureNotNull(this.pointToScreenPoint(this._points[1]));
            var screenPoint0 = ensureNotNull(this.pointToScreenPoint(this._points[0]));
            var heading = screenPoint1.subtract(screenPoint0);
            var scale = (screenPoint2.x - screenPoint0.x) / heading.x;
            var height = screenPoint0.addScaled(heading, scale);
            var displaceY = screenPoint2.y - height.y;
            var correctedPoint = screenPoint0.add(new Point(0, displaceY));
            return ensureNotNull(this.screenPointToPoint(correctedPoint));
        };
        return LineToolParallelChannel;
    }(LineTool));

    var PathPaneView = /** @class */ (function (_super) {
        __extends(PathPaneView, _super);
        function PathPaneView(source, model) {
            var _this = _super.call(this, source, model) || this;
            _this._internal__polygonRenderer = new PolygonRenderer();
            _this._internal__renderer = null;
            return _this;
        }
        PathPaneView.prototype._internal__updateImpl = function () {
            _super.prototype._internal__updateImpl.call(this);
            this._internal__renderer = null;
            var options = this._internal__source.options();
            this._internal__polygonRenderer._internal_setData({ _internal_line: deepCopy(options.line), _internal_points: this._internal__points });
            var compositeRenderer = new CompositeRenderer();
            compositeRenderer._internal_append(this._internal__polygonRenderer);
            this._internal__renderer = compositeRenderer;
            this._internal_addAnchors(compositeRenderer);
        };
        return PathPaneView;
    }(LineToolPaneView));

    var LineToolPath = /** @class */ (function (_super) {
        __extends(LineToolPath, _super);
        function LineToolPath(model, options, points) {
            if (points === void 0) { points = []; }
            var _this = _super.call(this, model, options, points) || this;
            _this._toolType = 'Path';
            _this._setPaneViews([new PathPaneView(_this, model)]);
            return _this;
        }
        LineToolPath.prototype.pointsCount = function () {
            return -1;
        };
        LineToolPath.prototype.tryFinish = function () {
            if (this._points.length > 0) {
                var point0 = this._points[this._points.length - 1];
                var point1 = this._points[this._points.length - 2];
                var screenPoint0 = ensureNotNull(this.pointToScreenPoint(point0));
                var screenPoint1 = ensureNotNull(this.pointToScreenPoint(point1));
                if (screenPoint0.subtract(screenPoint1).length() < 10) {
                    this._points.pop();
                    this._finished = true;
                    this._selected = true;
                    this._lastPoint = null;
                }
            }
        };
        return LineToolPath;
    }(LineTool));

    var LineToolRay = /** @class */ (function (_super) {
        __extends(LineToolRay, _super);
        function LineToolRay() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this._toolType = 'Ray';
            return _this;
        }
        return LineToolRay;
    }(LineToolTrendLine));

    var RectanglePaneView = /** @class */ (function (_super) {
        __extends(RectanglePaneView, _super);
        function RectanglePaneView(source, model) {
            var _this = _super.call(this, source, model) || this;
            _this._internal__rectangleRenderer = new RectangleRenderer();
            _this._internal__labelRenderer = new TextRenderer();
            _this._internal__renderer = null;
            return _this;
        }
        // eslint-disable-next-line complexity
        RectanglePaneView.prototype._internal__updateImpl = function () {
            this._internal__renderer = null;
            this._internal__invalidated = false;
            var priceScale = this._internal__source.priceScale();
            var timeScale = this._internal__model.timeScale();
            if (!priceScale || priceScale.isEmpty() || timeScale.isEmpty()) {
                return;
            }
            var strictRange = timeScale.visibleTimeRange();
            if (strictRange === null) {
                return;
            }
            var points = this._internal__source.points();
            if (points.length < 2) {
                return;
            }
            var options = this._internal__source.options();
            var isOutsideView = Math.max(points[0].timestamp, points[1].timestamp) < strictRange.from.timestamp;
            if (!isOutsideView || options.rectangle.extend.left || options.rectangle.extend.right) {
                _super.prototype._internal__updateImpl.call(this);
                if (this._internal__points.length < 2) {
                    return;
                }
                var compositeRenderer = new CompositeRenderer();
                this._internal__rectangleRenderer._internal_setData(__assign(__assign({}, deepCopy(options.rectangle)), { points: this._internal__points, hitTestBackground: false }));
                compositeRenderer._internal_append(this._internal__rectangleRenderer);
                var point0 = this._internal__points[0];
                var point1 = this._internal__points[1];
                if (options.text.value) {
                    var minX = Math.min(point0.x, point1.x);
                    var maxX = Math.max(point0.x, point1.x);
                    var minY = Math.min(point0.y, point1.y);
                    var maxY = Math.max(point0.y, point1.y);
                    var pivot = point0.clone();
                    var textHalfSize = options.text.font.size / 3;
                    var hoirzontalPadding = 0;
                    switch (options.text.box.alignment.vertical) {
                        case "middle" /* Middle */:
                            pivot.y = (minY + maxY) / 2;
                            hoirzontalPadding = textHalfSize;
                            break;
                        case "top" /* Top */:
                            pivot.y = maxY;
                            break;
                        case "bottom" /* Bottom */:
                            pivot.y = minY;
                    }
                    switch (options.text.box.alignment.horizontal) {
                        case "center" /* Center */:
                            pivot.x = (minX + maxX) / 2;
                            break;
                        case "left" /* Left */:
                            pivot.x = minX;
                            break;
                        case "right" /* Right */:
                            pivot.x = maxX;
                    }
                    var labelOptions = deepCopy(options.text);
                    labelOptions.box = __assign(__assign({}, labelOptions.box), { padding: { y: textHalfSize, x: hoirzontalPadding } });
                    if (options.text.box.alignment.vertical === "middle" /* Middle */) {
                        labelOptions.wordWrapWidth = maxX - minX - 2 * hoirzontalPadding;
                        labelOptions.box.maxHeight = maxY - minY;
                    }
                    this._internal__labelRenderer._internal_setData({ _internal_text: labelOptions, _internal_points: [pivot] });
                    compositeRenderer._internal_append(this._internal__labelRenderer);
                }
                this._internal__addAnchors(point0, point1, compositeRenderer);
                this._internal__renderer = compositeRenderer;
            }
        };
        RectanglePaneView.prototype._internal__addAnchors = function (topLeft, bottomRight, renderer) {
            var bottomLeft = new AnchorPoint(topLeft.x, bottomRight.y, 2);
            var topRight = new AnchorPoint(bottomRight.x, topLeft.y, 3);
            var middleLeft = new AnchorPoint(topLeft.x, 0.5 * (topLeft.y + bottomRight.y), 4, true);
            var middleRight = new AnchorPoint(bottomRight.x, 0.5 * (topLeft.y + bottomRight.y), 5, true);
            var topCenter = new AnchorPoint(0.5 * (topLeft.x + bottomRight.x), topLeft.y, 6, true);
            var bottomCenter = new AnchorPoint(0.5 * (topLeft.x + bottomRight.x), bottomRight.y, 7, true);
            var xDiff = topLeft.x - bottomRight.x;
            var yDiff = topLeft.y - bottomRight.y;
            var sign = Math.sign(xDiff * yDiff);
            var pointsCursorType = [
                sign < 0 ? PaneCursorType.DiagonalNeSwResize : PaneCursorType.DiagonalNwSeResize,
                sign < 0 ? PaneCursorType.DiagonalNeSwResize : PaneCursorType.DiagonalNwSeResize,
                sign > 0 ? PaneCursorType.DiagonalNeSwResize : PaneCursorType.DiagonalNwSeResize,
                sign > 0 ? PaneCursorType.DiagonalNeSwResize : PaneCursorType.DiagonalNwSeResize,
                PaneCursorType.HorizontalResize,
                PaneCursorType.HorizontalResize,
                PaneCursorType.VerticalResize,
                PaneCursorType.VerticalResize,
            ];
            var anchorData = {
                _internal_points: [topLeft, bottomRight, bottomLeft, topRight, middleLeft, middleRight, topCenter, bottomCenter],
                _internal_pointsCursorType: pointsCursorType,
            };
            renderer._internal_append(this._internal_createLineAnchor(anchorData, 0));
        };
        return RectanglePaneView;
    }(LineToolPaneView));

    var LineToolRectangle = /** @class */ (function (_super) {
        __extends(LineToolRectangle, _super);
        function LineToolRectangle(model, options, points) {
            if (points === void 0) { points = []; }
            var _this = _super.call(this, model, options, points) || this;
            _this._toolType = 'Rectangle';
            _this._setPaneViews([new RectanglePaneView(_this, model)]);
            return _this;
        }
        LineToolRectangle.prototype.pointsCount = function () {
            return 2;
        };
        LineToolRectangle.prototype.setPoint = function (index, point) {
            if (index < 2) {
                _super.prototype.setPoint.call(this, index, point);
            }
            switch (index) {
                case 2:
                    this._points[1].price = point.price;
                    this._points[0].timestamp = point.timestamp;
                    break;
                case 3:
                    this._points[0].price = point.price;
                    this._points[1].timestamp = point.timestamp;
                    break;
                case 4:
                    this._points[0].timestamp = point.timestamp;
                    break;
                case 5:
                    this._points[1].timestamp = point.timestamp;
                    break;
                case 6:
                    this._points[0].price = point.price;
                    break;
                case 7:
                    this._points[1].price = point.price;
            }
        };
        LineToolRectangle.prototype.getPoint = function (index) {
            return index < 2 ? _super.prototype.getPoint.call(this, index) : this._internal__getAnchorPointForIndex(index);
        };
        LineToolRectangle.prototype._internal__getAnchorPointForIndex = function (index) {
            var start = this.points()[0];
            var end = this.points()[1];
            return [
                { _internal_price: start.price, _internal_timestamp: start.timestamp },
                { _internal_price: end.price, _internal_timestamp: end.timestamp },
                { _internal_price: end.price, _internal_timestamp: start.timestamp },
                { _internal_price: start.price, _internal_timestamp: end.timestamp },
                { _internal_price: (end.price + start.price) / 2, _internal_timestamp: start.timestamp },
                { _internal_price: (end.price + start.price) / 2, _internal_timestamp: end.timestamp },
                { _internal_price: start.price, _internal_timestamp: (end.timestamp + start.timestamp) / 2 },
                { _internal_price: end.price, _internal_timestamp: (end.timestamp + start.timestamp) / 2 },
            ][index];
        };
        return LineToolRectangle;
    }(LineTool));

    var TextPaneView = /** @class */ (function (_super) {
        __extends(TextPaneView, _super);
        function TextPaneView(source, model) {
            var _this = _super.call(this, source, model) || this;
            _this._internal__labelRenderer = new TextRenderer();
            _this._internal__renderer = null;
            return _this;
        }
        TextPaneView.prototype._internal__updateImpl = function (height, width) {
            this._internal__renderer = null;
            var priceScale = this._internal__source.priceScale();
            var timeScale = this._internal__model.timeScale();
            if (!priceScale || priceScale.isEmpty() || timeScale.isEmpty()) {
                return;
            }
            _super.prototype._internal__updateImpl.call(this);
            if (this._internal__points.length < 1) {
                return;
            }
            var options = this._internal__source.options();
            var data = deepCopy(options.text);
            data.box.alignment = { vertical: "bottom" /* Bottom */, horizontal: "center" /* Center */ };
            data.alignment = "center" /* Center */;
            var point = this._internal__points[0].clone();
            var compositeRenderer = new CompositeRenderer();
            this._internal__labelRenderer._internal_setData({ _internal_text: data, _internal_points: [point] });
            compositeRenderer._internal_append(this._internal__labelRenderer);
            this._internal_addAnchors(compositeRenderer);
            this._internal__renderer = compositeRenderer;
        };
        return TextPaneView;
    }(LineToolPaneView));

    var LineToolText = /** @class */ (function (_super) {
        __extends(LineToolText, _super);
        function LineToolText(model, options, points) {
            if (points === void 0) { points = []; }
            var _this = _super.call(this, model, options, points) || this;
            _this._toolType = 'Text';
            _this._setPaneViews([new TextPaneView(_this, model)]);
            return _this;
        }
        LineToolText.prototype.pointsCount = function () {
            return 1;
        };
        return LineToolText;
    }(LineTool));

    var TriangleRenderer = /** @class */ (function (_super) {
        __extends(TriangleRenderer, _super);
        function TriangleRenderer() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this._internal__data = null;
            return _this;
        }
        TriangleRenderer.prototype._internal_setData = function (data) {
            this._internal__data = data;
        };
        TriangleRenderer.prototype.hitTest = function (point) {
            if (null === this._internal__data || this._internal__data.points.length < 2) {
                return null;
            }
            var _a = this._internal__data.points, end0 = _a[0], end1 = _a[1];
            if (distanceToSegment(end0, end1, point)._internal_distance <= interactionTolerance._internal_line) {
                return new HitTestResult(HitTestType.MovePoint);
            }
            if (this._internal__data.points.length !== 3) {
                return null;
            }
            var end3 = this._internal__data.points[2];
            if (distanceToSegment(end1, end3, point)._internal_distance <= interactionTolerance._internal_line) {
                return new HitTestResult(HitTestType.MovePoint);
            }
            else if (distanceToSegment(end3, end0, point)._internal_distance <= interactionTolerance._internal_line) {
                return new HitTestResult(HitTestType.MovePoint);
            }
            if (this._internal__data.hitTestBackground && pointInTriangle(point, end0, end1, end3)) {
                return new HitTestResult(HitTestType.MovePointBackground);
            }
            return null;
        };
        TriangleRenderer.prototype._internal__drawImpl = function (ctx) {
            var _a, _b, _c, _d;
            if (this._internal__data === null || this._internal__data.points.length < 2) {
                return;
            }
            var _e = this._internal__data.points, point0 = _e[0], point1 = _e[1];
            var point2 = 2 === this._internal__data.points.length ? point1 : this._internal__data.points[2];
            ctx.lineCap = 'butt';
            ctx.lineWidth = ((_a = this._internal__data.border) === null || _a === void 0 ? void 0 : _a.width) || 0;
            ctx.strokeStyle = ((_b = this._internal__data.border) === null || _b === void 0 ? void 0 : _b.color) || 'transparent';
            if (((_c = this._internal__data.border) === null || _c === void 0 ? void 0 : _c.style) !== undefined) {
                setLineStyle(ctx, this._internal__data.border.style);
            }
            ctx.beginPath();
            ctx.fillStyle = ((_d = this._internal__data.background) === null || _d === void 0 ? void 0 : _d.color) || 'transparent';
            ctx.moveTo(point0.x, point0.y);
            ctx.lineTo(point1.x, point1.y);
            ctx.lineTo(point2.x, point2.y);
            ctx.lineTo(point0.x, point0.y);
            ctx.fill();
            ctx.stroke();
        };
        return TriangleRenderer;
    }(ScaledRenderer));

    var TrianglePaneView = /** @class */ (function (_super) {
        __extends(TrianglePaneView, _super);
        function TrianglePaneView(source, model) {
            var _this = _super.call(this, source, model) || this;
            _this._internal__triangleRenderer = new TriangleRenderer();
            _this._internal__renderer = null;
            return _this;
        }
        TrianglePaneView.prototype._internal__updateImpl = function () {
            var options = this._internal__source.options();
            _super.prototype._internal__updateImpl.call(this);
            this._internal__renderer = null;
            this._internal__triangleRenderer._internal_setData(__assign(__assign({}, options.triangle), { points: this._internal__points, hitTestBackground: false }));
            var compositeRenderer = new CompositeRenderer();
            compositeRenderer._internal_append(this._internal__triangleRenderer);
            this._internal_addAnchors(compositeRenderer);
            this._internal__renderer = compositeRenderer;
        };
        return TrianglePaneView;
    }(LineToolPaneView));

    var LineToolTriangle = /** @class */ (function (_super) {
        __extends(LineToolTriangle, _super);
        function LineToolTriangle(model, options, points) {
            if (points === void 0) { points = []; }
            var _this = _super.call(this, model, options, points) || this;
            _this._toolType = 'Triangle';
            _this._setPaneViews([new TrianglePaneView(_this, model)]);
            return _this;
        }
        LineToolTriangle.prototype.pointsCount = function () {
            return 3;
        };
        return LineToolTriangle;
    }(LineTool));

    var VerticalLinePaneView = /** @class */ (function (_super) {
        __extends(VerticalLinePaneView, _super);
        function VerticalLinePaneView(source, model) {
            var _this = _super.call(this, source, model) || this;
            _this._internal__lineRenderer = new SegmentRenderer();
            _this._internal__labelRenderer = new TextRenderer();
            _this._internal__renderer = null;
            _this._internal__lineRenderer._internal_setHitTest(new HitTestResult(HitTestType.MovePoint));
            return _this;
        }
        VerticalLinePaneView.prototype._internal__updateImpl = function (height, width) {
            this._internal__renderer = null;
            var priceScale = this._internal__source.priceScale();
            var timeScale = this._internal__model.timeScale();
            if (!priceScale || priceScale.isEmpty() || timeScale.isEmpty()) {
                return;
            }
            var points = this._internal__source.points();
            if (points.length < 1) {
                return;
            }
            var startTime = timeScale.coordinateToTime(0);
            var endTime = timeScale.coordinateToTime(width);
            var options = this._internal__source.options();
            var isOutsideView = (points[0].timestamp > endTime.timestamp) || (points[0].timestamp < startTime.timestamp);
            if (!isOutsideView) {
                _super.prototype._internal__updateImpl.call(this);
                if (this._internal__points.length < 1) {
                    return;
                }
                var point = this._internal__points[0];
                var start = new AnchorPoint(point.x, height, 0);
                var end = new AnchorPoint(point.x, 0, 1);
                point.y = height / 2;
                point._internal_square = true;
                var ends = { _internal_left: 0 /* Normal */, _internal_right: 0 /* Normal */ };
                var extend = { _internal_left: false, _internal_right: false };
                var compositeRenderer = new CompositeRenderer();
                this._internal__lineRenderer._internal_setData({ _internal_line: __assign(__assign({}, deepCopy(options.line)), { end: ends, extend: extend }), _internal_points: [start, end] });
                compositeRenderer._internal_append(this._internal__lineRenderer);
                if (options.text.value) {
                    var angle = Math.atan((end.y - start.y) / (end.x - start.x));
                    var align = options.text.box.alignment.horizontal;
                    var pivot = align === "left" /* Left */
                        ? start.clone() : align === "right" /* Right */
                        ? end.clone() : new Point((start.x + end.x) / 2, (start.y + end.y) / 2);
                    var labelOptions = deepCopy(options.text);
                    labelOptions.box = __assign(__assign({}, labelOptions.box), { angle: angle });
                    this._internal__labelRenderer._internal_setData({ _internal_text: labelOptions, _internal_points: [pivot] });
                    compositeRenderer._internal_append(this._internal__labelRenderer);
                }
                this._internal_addAnchors(compositeRenderer);
                this._internal__renderer = compositeRenderer;
            }
        };
        return VerticalLinePaneView;
    }(LineToolPaneView));

    var LineToolVerticalLine = /** @class */ (function (_super) {
        __extends(LineToolVerticalLine, _super);
        function LineToolVerticalLine(model, options, points) {
            if (points === void 0) { points = []; }
            var _this = _super.call(this, model, options, points) || this;
            _this._toolType = 'VerticalLine';
            _this._setPaneViews([new VerticalLinePaneView(_this, model)]);
            return _this;
        }
        LineToolVerticalLine.prototype.pointsCount = function () {
            return 1;
        };
        LineToolVerticalLine.prototype.priceAxisViews = function () {
            return [];
        };
        LineToolVerticalLine.prototype.priceAxisPoints = function () {
            return [];
        };
        LineToolVerticalLine.prototype.timeAxisLabelColor = function () {
            return this.options().line.color;
        };
        return LineToolVerticalLine;
    }(LineTool));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    var LineTools = {
        FibRetracement: LineToolFibRetracement,
        ParallelChannel: LineToolParallelChannel,
        HorizontalLine: LineToolHorizontalLine,
        VerticalLine: LineToolVerticalLine,
        Highlighter: LineToolHighlighter,
        CrossLine: LineToolCrossLine,
        TrendLine: LineToolTrendLine,
        Rectangle: LineToolRectangle,
        Triangle: LineToolTriangle,
        Brush: LineToolBrush,
        Path: LineToolPath,
        Text: LineToolText,
        Ray: LineToolRay,
        Arrow: LineToolArrow,
        ExtendedLine: LineToolExtendedLine,
        HorizontalRay: LineToolHorizontalRay,
    };

    var LineToolCreator = /** @class */ (function () {
        function LineToolCreator(model) {
            this._lastLineTool = null;
            this._activeOptions = null;
            this._activeType = null;
            this._model = model;
        }
        LineToolCreator.prototype.setActiveLineTool = function (lineToolType, options) {
            this._activeOptions = options || {};
            this._activeType = lineToolType;
            this._model.dataSources().forEach(function (source) {
                if (source instanceof LineTool) {
                    source.setSelected(false);
                    source.setHovered(false);
                    source.setEditing(false);
                }
            });
            this._model.lightUpdate();
        };
        LineToolCreator.prototype.hasActiveToolLine = function () {
            return this._activeType !== null;
        };
        LineToolCreator.prototype.onInputEvent = function (paneWidget, eventType, event) {
            var _a;
            if (!this._activeType || !this._activeOptions) {
                return;
            }
            event.consumed = true;
            if (eventType !== 6 /* MouseDown */) {
                return;
            }
            var priceScaleId = ((_a = paneWidget.state().dataSources()[0].priceScale()) === null || _a === void 0 ? void 0 : _a.id()) || paneWidget.state().model().defaultVisiblePriceScaleId();
            var strictOptions = merge(clone(LineToolsOptionDefaults[this._activeType]), this._activeOptions || {});
            this._lastLineTool = new LineTools[this._activeType](this._model, strictOptions, []);
            paneWidget.state().addDataSource(this._lastLineTool, priceScaleId);
            this._activeType = null;
            this._activeOptions = null;
        };
        return LineToolCreator;
    }());

    var VolumeFormatter = /** @class */ (function () {
        function VolumeFormatter(precision) {
            this._private__precision = precision;
        }
        VolumeFormatter.prototype.format = function (vol) {
            var sign = '';
            if (vol < 0) {
                sign = '-';
                vol = -vol;
            }
            if (vol < 995) {
                return sign + this._private__formatNumber(vol);
            }
            else if (vol < 999995) {
                return sign + this._private__formatNumber(vol / 1000) + 'K';
            }
            else if (vol < 999999995) {
                vol = 1000 * Math.round(vol / 1000);
                return sign + this._private__formatNumber(vol / 1000000) + 'M';
            }
            else {
                vol = 1000000 * Math.round(vol / 1000000);
                return sign + this._private__formatNumber(vol / 1000000000) + 'B';
            }
        };
        VolumeFormatter.prototype._private__formatNumber = function (value) {
            var res;
            var priceScale = Math.pow(10, this._private__precision);
            value = Math.round(value * priceScale) / priceScale;
            if (value >= 1e-15 && value < 1) {
                res = value.toFixed(this._private__precision).replace(/\.?0+$/, ''); // regex removes trailing zeroes
            }
            else {
                res = String(value);
            }
            return res.replace(/(\.[1-9]*)0+$/, function (e, p1) { return p1; });
        };
        return VolumeFormatter;
    }());

    /**
     * BEWARE: The method must be called after beginPath and before stroke/fill/closePath/etc
     */
    function walkLine(ctx, points, lineType, visibleRange) {
        if (points.length === 0) {
            return;
        }
        var colorUsedMap = {};
        for (var j = visibleRange.from; j < visibleRange.to; ++j) {
            var currentColor = points[j]._internal_color;
            if (colorUsedMap[currentColor || 'undefiend']) {
                continue;
            }
            if (Object.keys(colorUsedMap).length) {
                ctx.stroke();
                ctx.closePath();
                ctx.beginPath();
            }
            var x = points[j].x;
            var y = points[j].y;
            ctx.moveTo(x, y);
            ctx.strokeStyle = currentColor !== null && currentColor !== void 0 ? currentColor : ctx.strokeStyle;
            colorUsedMap[currentColor || 'undefiend'] = true;
            for (var i = j + 1; i < visibleRange.to; ++i) {
                var currItem = points[i];
                //  x---x---x   or   x---x   o   or   start
                if (points[i - 1]._internal_color === currentColor) {
                    if (lineType === 1 /* WithSteps */) {
                        var prevY = points[i - 1].y;
                        var currX = currItem.x;
                        ctx.lineTo(currX, prevY);
                    }
                    else if (lineType === 2 /* WithStepsUpsideDown */) {
                        var prevX = points[i - 1].x;
                        var currY = currItem.y;
                        ctx.lineTo(prevX, currY);
                    }
                    ctx.lineTo(currItem.x, currItem.y);
                }
                else {
                    ctx.moveTo(currItem.x, currItem.y);
                }
            }
        }
    }

    var PaneRendererAreaBase = /** @class */ (function (_super) {
        __extends(PaneRendererAreaBase, _super);
        function PaneRendererAreaBase() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this._internal__data = null;
            return _this;
        }
        PaneRendererAreaBase.prototype._internal_setData = function (data) {
            this._internal__data = data;
        };
        PaneRendererAreaBase.prototype._internal__drawImpl = function (ctx) {
            if (this._internal__data === null ||
                this._internal__data._internal_items.length === 0 ||
                this._internal__data._internal_visibleRange === null) {
                return;
            }
            ctx.lineCap = 'butt';
            ctx.lineJoin = 'round';
            ctx.lineWidth = this._internal__data._internal_lineWidth;
            setLineStyle(ctx, this._internal__data._internal_lineStyle);
            // walk lines with width=1 to have more accurate gradient's filling
            ctx.lineWidth = 1;
            ctx.beginPath();
            if (this._internal__data._internal_items.length === 1) {
                var point = this._internal__data._internal_items[0];
                var halfBarWidth = this._internal__data._internal_barWidth / 2;
                ctx.moveTo(point.x - halfBarWidth, this._internal__data._internal_baseLevelCoordinate);
                ctx.lineTo(point.x - halfBarWidth, point.y);
                ctx.lineTo(point.x + halfBarWidth, point.y);
                ctx.lineTo(point.x + halfBarWidth, this._internal__data._internal_baseLevelCoordinate);
            }
            else {
                ctx.moveTo(this._internal__data._internal_items[this._internal__data._internal_visibleRange.from].x, this._internal__data._internal_baseLevelCoordinate);
                ctx.lineTo(this._internal__data._internal_items[this._internal__data._internal_visibleRange.from].x, this._internal__data._internal_items[this._internal__data._internal_visibleRange.from].y);
                walkLine(ctx, this._internal__data._internal_items, this._internal__data._internal_lineType, this._internal__data._internal_visibleRange);
                if (this._internal__data._internal_visibleRange.to > this._internal__data._internal_visibleRange.from) {
                    ctx.lineTo(this._internal__data._internal_items[this._internal__data._internal_visibleRange.to - 1].x, this._internal__data._internal_baseLevelCoordinate);
                    ctx.lineTo(this._internal__data._internal_items[this._internal__data._internal_visibleRange.from].x, this._internal__data._internal_baseLevelCoordinate);
                }
            }
            ctx.closePath();
            ctx.fillStyle = this._internal__fillStyle(ctx);
            ctx.fill();
        };
        return PaneRendererAreaBase;
    }(ScaledRenderer));
    var PaneRendererArea = /** @class */ (function (_super) {
        __extends(PaneRendererArea, _super);
        function PaneRendererArea() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        PaneRendererArea.prototype._internal__fillStyle = function (ctx) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            var data = this._internal__data;
            var gradient = ctx.createLinearGradient(0, 0, 0, data._internal_bottom);
            gradient.addColorStop(0, data._internal_topColor);
            gradient.addColorStop(1, data._internal_bottomColor);
            return gradient;
        };
        return PaneRendererArea;
    }(PaneRendererAreaBase));

    var PaneRendererLineBase = /** @class */ (function (_super) {
        __extends(PaneRendererLineBase, _super);
        function PaneRendererLineBase() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this._internal__data = null;
            return _this;
        }
        PaneRendererLineBase.prototype._internal_setData = function (data) {
            this._internal__data = data;
        };
        PaneRendererLineBase.prototype._internal__drawImpl = function (ctx) {
            if (this._internal__data === null ||
                this._internal__data._internal_items.length === 0 ||
                this._internal__data._internal_visibleRange === null) {
                return;
            }
            ctx.lineCap = 'butt';
            ctx.lineWidth = this._internal__data._internal_lineWidth;
            setLineStyle(ctx, this._internal__data._internal_lineStyle);
            ctx.strokeStyle = this._internal__strokeStyle(ctx);
            ctx.lineJoin = 'round';
            ctx.beginPath();
            // TODO: implement drawing a colored line, see https://github.com/tradingview/lightweight-charts/issues/195#issuecomment-961850692
            if (this._internal__data._internal_items.length === 1) {
                var point = this._internal__data._internal_items[0];
                ctx.moveTo(point.x - this._internal__data._internal_barWidth / 2, point.y);
                ctx.lineTo(point.x + this._internal__data._internal_barWidth / 2, point.y);
                if (point._internal_color !== undefined) {
                    ctx.strokeStyle = point._internal_color;
                }
            }
            else {
                walkLine(ctx, this._internal__data._internal_items, this._internal__data._internal_lineType, this._internal__data._internal_visibleRange);
            }
        };
        PaneRendererLineBase.prototype._internal__drawLine = function (ctx, data) {
            ctx.beginPath();
            walkLine(ctx, data._internal_items, data._internal_lineType, data._internal_visibleRange);
            ctx.stroke();
        };
        return PaneRendererLineBase;
    }(ScaledRenderer));
    var PaneRendererLine = /** @class */ (function (_super) {
        __extends(PaneRendererLine, _super);
        function PaneRendererLine() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        /**
         * Similar to {@link walkLine}, but supports color changes
         */
        PaneRendererLine.prototype._internal__drawLine = function (ctx, data) {
            var _a, _b;
            var items = data._internal_items, visibleRange = data._internal_visibleRange, lineType = data._internal_lineType, lineColor = data._internal_lineColor;
            if (items.length === 0 || visibleRange === null) {
                return;
            }
            ctx.beginPath();
            var firstItem = items[visibleRange.from];
            ctx.moveTo(firstItem.x, firstItem.y);
            var prevStrokeStyle = (_a = firstItem._internal_color) !== null && _a !== void 0 ? _a : lineColor;
            ctx.strokeStyle = prevStrokeStyle;
            var changeColor = function (color) {
                ctx.stroke();
                ctx.beginPath();
                ctx.strokeStyle = color;
                prevStrokeStyle = color;
            };
            for (var i = visibleRange.from + 1; i < visibleRange.to; ++i) {
                var currItem = items[i];
                var prevItem = items[i - 1];
                var currentStrokeStyle = (_b = currItem._internal_color) !== null && _b !== void 0 ? _b : lineColor;
                if (lineType === 1 /* WithSteps */) {
                    ctx.lineTo(currItem.x, prevItem.y);
                    if (currentStrokeStyle !== prevStrokeStyle) {
                        changeColor(currentStrokeStyle);
                        ctx.moveTo(currItem.x, prevItem.y);
                    }
                }
                ctx.lineTo(currItem.x, currItem.y);
                if (lineType !== 1 /* WithSteps */ && currentStrokeStyle !== prevStrokeStyle) {
                    changeColor(currentStrokeStyle);
                    ctx.moveTo(currItem.x, currItem.y);
                }
            }
            ctx.stroke();
        };
        PaneRendererLine.prototype._internal__strokeStyle = function () {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            return this._internal__data._internal_lineColor;
        };
        return PaneRendererLine;
    }(PaneRendererLineBase));

    /**
     * Binary function that accepts two arguments (the first of the type of array elements, and the second is always val), and returns a value convertible to bool.
     * The value returned indicates whether the first argument is considered to go before the second.
     * The function shall not modify any of its arguments.
     */
    function lowerbound(arr, value, compare, start, to) {
        if (start === void 0) { start = 0; }
        if (to === void 0) { to = arr.length; }
        var count = to - start;
        while (0 < count) {
            var count2 = (count >> 1);
            var mid = start + count2;
            if (compare(arr[mid], value)) {
                start = mid + 1;
                count -= count2 + 1;
            }
            else {
                count = count2;
            }
        }
        return start;
    }
    function upperbound(arr, value, compare, start, to) {
        if (start === void 0) { start = 0; }
        if (to === void 0) { to = arr.length; }
        var count = to - start;
        while (0 < count) {
            var count2 = (count >> 1);
            var mid = start + count2;
            if (!(compare(value, arr[mid]))) {
                start = mid + 1;
                count -= count2 + 1;
            }
            else {
                count = count2;
            }
        }
        return start;
    }
    function findLastIndex(items, callback) {
        return items.reduce(function (acc, curr, index) { return callback(curr, index) ? index : acc; }, 0);
    }

    function lowerBoundItemsCompare(item, time) {
        return item.time < time;
    }
    function upperBoundItemsCompare(time, item) {
        return time < item.time;
    }
    function visibleTimedValues(items, range, extendedRange) {
        var firstBar = range.left();
        var lastBar = range.right();
        var from = lowerbound(items, firstBar, lowerBoundItemsCompare);
        var to = upperbound(items, lastBar, upperBoundItemsCompare);
        if (!extendedRange) {
            return { from: from, to: to };
        }
        var extendedFrom = from;
        var extendedTo = to;
        if (from > 0 && from < items.length && items[from].time >= firstBar) {
            extendedFrom = from - 1;
        }
        if (to > 0 && to < items.length && items[to - 1].time <= lastBar) {
            extendedTo = to + 1;
        }
        return { from: extendedFrom, to: extendedTo };
    }

    var SeriesPaneViewBase = /** @class */ (function () {
        function SeriesPaneViewBase(series, model, extendedVisibleRange) {
            this._internal__invalidated = true;
            this._internal__dataInvalidated = true;
            this._internal__optionsInvalidated = true;
            this._internal__items = [];
            this._internal__itemsVisibleRange = null;
            this._internal__series = series;
            this._internal__model = model;
            this._internal__extendedVisibleRange = extendedVisibleRange;
        }
        SeriesPaneViewBase.prototype.update = function (updateType) {
            this._internal__invalidated = true;
            if (updateType === 'data') {
                this._internal__dataInvalidated = true;
            }
            if (updateType === 'options') {
                this._internal__optionsInvalidated = true;
            }
        };
        SeriesPaneViewBase.prototype._internal__makeValid = function () {
            if (this._internal__dataInvalidated) {
                this._internal__fillRawPoints();
                this._internal__dataInvalidated = false;
            }
            if (this._internal__invalidated) {
                this._internal__updatePoints();
                this._internal__invalidated = false;
            }
            if (this._internal__optionsInvalidated) {
                this._internal__updateOptions();
                this._internal__optionsInvalidated = false;
            }
        };
        SeriesPaneViewBase.prototype._internal__clearVisibleRange = function () {
            this._internal__itemsVisibleRange = null;
        };
        SeriesPaneViewBase.prototype._internal__updatePoints = function () {
            var priceScale = this._internal__series.priceScale();
            var timeScale = this._internal__model.timeScale();
            this._internal__clearVisibleRange();
            if (timeScale.isEmpty() || priceScale.isEmpty()) {
                return;
            }
            var visibleBars = timeScale.visibleStrictRange();
            if (visibleBars === null) {
                return;
            }
            if (this._internal__series.bars().size() === 0) {
                return;
            }
            var firstValue = this._internal__series.firstValue();
            if (firstValue === null) {
                return;
            }
            this._internal__itemsVisibleRange = visibleTimedValues(this._internal__items, visibleBars, this._internal__extendedVisibleRange);
            this._internal__convertToCoordinates(priceScale, timeScale, firstValue.value);
        };
        return SeriesPaneViewBase;
    }());

    var LinePaneViewBase = /** @class */ (function (_super) {
        __extends(LinePaneViewBase, _super);
        function LinePaneViewBase(series, model) {
            return _super.call(this, series, model, true) || this;
        }
        LinePaneViewBase.prototype._internal__convertToCoordinates = function (priceScale, timeScale, firstValue) {
            timeScale.indexesToCoordinates(this._internal__items, undefinedIfNull(this._internal__itemsVisibleRange));
            priceScale.pointsArrayToCoordinates(this._internal__items, firstValue, undefinedIfNull(this._internal__itemsVisibleRange));
        };
        LinePaneViewBase.prototype._internal__createRawItemBase = function (time, price) {
            return {
                time: time,
                price: price,
                x: NaN,
                y: NaN,
            };
        };
        LinePaneViewBase.prototype._internal__updateOptions = function () { };
        LinePaneViewBase.prototype._internal__fillRawPoints = function () {
            var _this = this;
            var colorer = this._internal__series.barColorer();
            this._internal__items = this._internal__series.bars().rows().map(function (row) {
                var value = row.value[3 /* Close */];
                return _this._internal__createRawItem(row.index, value, colorer);
            });
        };
        return LinePaneViewBase;
    }(SeriesPaneViewBase));

    var SeriesAreaPaneView = /** @class */ (function (_super) {
        __extends(SeriesAreaPaneView, _super);
        function SeriesAreaPaneView(series, model) {
            var _this = _super.call(this, series, model) || this;
            _this._private__renderer = new CompositeRenderer();
            _this._private__areaRenderer = new PaneRendererArea();
            _this._private__lineRenderer = new PaneRendererLine();
            _this._private__renderer._internal_setRenderers([_this._private__areaRenderer, _this._private__lineRenderer]);
            return _this;
        }
        SeriesAreaPaneView.prototype.renderer = function (height, width) {
            if (!this._internal__series.visible()) {
                return null;
            }
            var areaStyleProperties = this._internal__series.options();
            this._internal__makeValid();
            this._private__areaRenderer._internal_setData({
                _internal_lineType: areaStyleProperties.lineType,
                _internal_items: this._internal__items,
                _internal_lineStyle: areaStyleProperties.lineStyle,
                _internal_lineWidth: areaStyleProperties.lineWidth,
                _internal_topColor: areaStyleProperties.topColor,
                _internal_bottomColor: areaStyleProperties.bottomColor,
                _internal_baseLevelCoordinate: height,
                _internal_bottom: height,
                _internal_visibleRange: this._internal__itemsVisibleRange,
                _internal_barWidth: this._internal__model.timeScale().barSpacing(),
            });
            this._private__lineRenderer._internal_setData({
                _internal_lineType: areaStyleProperties.lineType,
                _internal_items: this._internal__items,
                _internal_lineColor: areaStyleProperties.lineColor,
                _internal_lineStyle: areaStyleProperties.lineStyle,
                _internal_lineWidth: areaStyleProperties.lineWidth,
                _internal_visibleRange: this._internal__itemsVisibleRange,
                _internal_barWidth: this._internal__model.timeScale().barSpacing(),
            });
            return this._private__renderer;
        };
        SeriesAreaPaneView.prototype._internal__createRawItem = function (time, price) {
            return this._internal__createRawItemBase(time, price);
        };
        return SeriesAreaPaneView;
    }(LinePaneViewBase));

    var PaneRendererBars = /** @class */ (function () {
        function PaneRendererBars() {
            this._private__data = null;
            this._private__barWidth = 0;
            this._private__barLineWidth = 0;
        }
        PaneRendererBars.prototype._internal_setData = function (data) {
            this._private__data = data;
        };
        // eslint-disable-next-line complexity
        PaneRendererBars.prototype.draw = function (ctx, renderParams) {
            if (this._private__data === null || this._private__data._internal_bars.length === 0 || this._private__data._internal_visibleRange === null) {
                return;
            }
            var pixelRatio = renderParams.pixelRatio;
            this._private__barWidth = this._private__calcBarWidth(pixelRatio);
            // grid and crosshair have line width = Math.floor(pixelRatio)
            // if this value is odd, we have to make bars' width odd
            // if this value is even, we have to make bars' width even
            // in order of keeping crosshair-over-bar drawing symmetric
            if (this._private__barWidth >= 2) {
                var lineWidth = Math.max(1, Math.floor(pixelRatio));
                if ((lineWidth % 2) !== (this._private__barWidth % 2)) {
                    this._private__barWidth--;
                }
            }
            // if scale is compressed, bar could become less than 1 CSS pixel
            this._private__barLineWidth = this._private__data._internal_thinBars ? Math.min(this._private__barWidth, Math.floor(pixelRatio)) : this._private__barWidth;
            var prevColor = null;
            var drawOpenClose = this._private__barLineWidth <= this._private__barWidth && this._private__data._internal_barSpacing >= Math.floor(1.5 * pixelRatio);
            for (var i = this._private__data._internal_visibleRange.from; i < this._private__data._internal_visibleRange.to; ++i) {
                var bar = this._private__data._internal_bars[i];
                if (prevColor !== bar._internal_color) {
                    ctx.fillStyle = bar._internal_color;
                    prevColor = bar._internal_color;
                }
                var bodyWidthHalf = Math.floor(this._private__barLineWidth * 0.5);
                var bodyCenter = Math.round(bar.x * pixelRatio);
                var bodyLeft = bodyCenter - bodyWidthHalf;
                var bodyWidth = this._private__barLineWidth;
                var bodyRight = bodyLeft + bodyWidth - 1;
                var high = Math.min(bar.highY, bar.lowY);
                var low = Math.max(bar.highY, bar.lowY);
                var bodyTop = Math.round(high * pixelRatio) - bodyWidthHalf;
                var bodyBottom = Math.round(low * pixelRatio) + bodyWidthHalf;
                var bodyHeight = Math.max((bodyBottom - bodyTop), this._private__barLineWidth);
                ctx.fillRect(bodyLeft, bodyTop, bodyWidth, bodyHeight);
                var sideWidth = Math.ceil(this._private__barWidth * 1.5);
                if (drawOpenClose) {
                    if (this._private__data._internal_openVisible) {
                        var openLeft = bodyCenter - sideWidth;
                        var openTop = Math.max(bodyTop, Math.round(bar.openY * pixelRatio) - bodyWidthHalf);
                        var openBottom = openTop + bodyWidth - 1;
                        if (openBottom > bodyTop + bodyHeight - 1) {
                            openBottom = bodyTop + bodyHeight - 1;
                            openTop = openBottom - bodyWidth + 1;
                        }
                        ctx.fillRect(openLeft, openTop, bodyLeft - openLeft, openBottom - openTop + 1);
                    }
                    var closeRight = bodyCenter + sideWidth;
                    var closeTop = Math.max(bodyTop, Math.round(bar.closeY * pixelRatio) - bodyWidthHalf);
                    var closeBottom = closeTop + bodyWidth - 1;
                    if (closeBottom > bodyTop + bodyHeight - 1) {
                        closeBottom = bodyTop + bodyHeight - 1;
                        closeTop = closeBottom - bodyWidth + 1;
                    }
                    ctx.fillRect(bodyRight + 1, closeTop, closeRight - bodyRight, closeBottom - closeTop + 1);
                }
            }
        };
        PaneRendererBars.prototype._private__calcBarWidth = function (pixelRatio) {
            var limit = Math.floor(pixelRatio);
            return Math.max(limit, Math.floor(optimalBarWidth(ensureNotNull(this._private__data)._internal_barSpacing, pixelRatio)));
        };
        return PaneRendererBars;
    }());

    var BarsPaneViewBase = /** @class */ (function (_super) {
        __extends(BarsPaneViewBase, _super);
        function BarsPaneViewBase(series, model) {
            return _super.call(this, series, model, false) || this;
        }
        BarsPaneViewBase.prototype._internal__convertToCoordinates = function (priceScale, timeScale, firstValue) {
            timeScale.indexesToCoordinates(this._internal__items, undefinedIfNull(this._internal__itemsVisibleRange));
            priceScale.barPricesToCoordinates(this._internal__items, firstValue, undefinedIfNull(this._internal__itemsVisibleRange));
        };
        BarsPaneViewBase.prototype._internal__createDefaultItem = function (time, bar, colorer) {
            return {
                time: time,
                open: bar.value[0 /* Open */],
                high: bar.value[1 /* High */],
                low: bar.value[2 /* Low */],
                close: bar.value[3 /* Close */],
                x: NaN,
                openY: NaN,
                highY: NaN,
                lowY: NaN,
                closeY: NaN,
            };
        };
        BarsPaneViewBase.prototype._internal__fillRawPoints = function () {
            var _this = this;
            var colorer = this._internal__series.barColorer();
            this._internal__items = this._internal__series.bars().rows().map(function (row) { return _this._internal__createRawItem(row.index, row, colorer); });
        };
        return BarsPaneViewBase;
    }(SeriesPaneViewBase));

    var SeriesBarsPaneView = /** @class */ (function (_super) {
        __extends(SeriesBarsPaneView, _super);
        function SeriesBarsPaneView() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this._private__renderer = new PaneRendererBars();
            return _this;
        }
        SeriesBarsPaneView.prototype.renderer = function (height, width) {
            if (!this._internal__series.visible()) {
                return null;
            }
            var barStyleProps = this._internal__series.options();
            this._internal__makeValid();
            var data = {
                _internal_bars: this._internal__items,
                _internal_barSpacing: this._internal__model.timeScale().barSpacing(),
                _internal_openVisible: barStyleProps.openVisible,
                _internal_thinBars: barStyleProps.thinBars,
                _internal_visibleRange: this._internal__itemsVisibleRange,
            };
            this._private__renderer._internal_setData(data);
            return this._private__renderer;
        };
        SeriesBarsPaneView.prototype._internal__updateOptions = function () {
            var _this = this;
            this._internal__items.forEach(function (item) {
                item._internal_color = _this._internal__series.barColorer().barStyle(item.time).barColor;
            });
        };
        SeriesBarsPaneView.prototype._internal__createRawItem = function (time, bar, colorer) {
            return __assign(__assign({}, this._internal__createDefaultItem(time, bar, colorer)), { _internal_color: colorer.barStyle(time).barColor });
        };
        return SeriesBarsPaneView;
    }(BarsPaneViewBase));

    var PaneRendererBaselineArea = /** @class */ (function (_super) {
        __extends(PaneRendererBaselineArea, _super);
        function PaneRendererBaselineArea() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        PaneRendererBaselineArea.prototype._internal__fillStyle = function (ctx) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            var data = this._internal__data;
            var gradient = ctx.createLinearGradient(0, 0, 0, data._internal_bottom);
            var baselinePercent = clamp(data._internal_baseLevelCoordinate / data._internal_bottom, 0, 1);
            gradient.addColorStop(0, data._internal_topFillColor1);
            gradient.addColorStop(baselinePercent, data._internal_topFillColor2);
            gradient.addColorStop(baselinePercent, data._internal_bottomFillColor1);
            gradient.addColorStop(1, data._internal_bottomFillColor2);
            return gradient;
        };
        return PaneRendererBaselineArea;
    }(PaneRendererAreaBase));
    var PaneRendererBaselineLine = /** @class */ (function (_super) {
        __extends(PaneRendererBaselineLine, _super);
        function PaneRendererBaselineLine() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        PaneRendererBaselineLine.prototype._internal__strokeStyle = function (ctx) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            var data = this._internal__data;
            var gradient = ctx.createLinearGradient(0, 0, 0, data._internal_bottom);
            var baselinePercent = clamp(data._internal_baseLevelCoordinate / data._internal_bottom, 0, 1);
            gradient.addColorStop(0, data._internal_topColor);
            gradient.addColorStop(baselinePercent, data._internal_topColor);
            gradient.addColorStop(baselinePercent, data._internal_bottomColor);
            gradient.addColorStop(1, data._internal_bottomColor);
            return gradient;
        };
        return PaneRendererBaselineLine;
    }(PaneRendererLineBase));

    var SeriesBaselinePaneView = /** @class */ (function (_super) {
        __extends(SeriesBaselinePaneView, _super);
        function SeriesBaselinePaneView(series, model) {
            var _this = _super.call(this, series, model) || this;
            _this._private__baselineAreaRenderer = new PaneRendererBaselineArea();
            _this._private__baselineLineRenderer = new PaneRendererBaselineLine();
            _this._private__compositeRenderer = new CompositeRenderer();
            _this._private__compositeRenderer._internal_setRenderers([_this._private__baselineAreaRenderer, _this._private__baselineLineRenderer]);
            return _this;
        }
        SeriesBaselinePaneView.prototype.renderer = function (height, width) {
            if (!this._internal__series.visible()) {
                return null;
            }
            var firstValue = this._internal__series.firstValue();
            if (firstValue === null) {
                return null;
            }
            var baselineProps = this._internal__series.options();
            this._internal__makeValid();
            var baseLevelCoordinate = this._internal__series.priceScale().priceToCoordinate(baselineProps.baseValue.price, firstValue.value);
            var barWidth = this._internal__model.timeScale().barSpacing();
            this._private__baselineAreaRenderer._internal_setData({
                _internal_items: this._internal__items,
                _internal_topFillColor1: baselineProps.topFillColor1,
                _internal_topFillColor2: baselineProps.topFillColor2,
                _internal_bottomFillColor1: baselineProps.bottomFillColor1,
                _internal_bottomFillColor2: baselineProps.bottomFillColor2,
                _internal_lineWidth: baselineProps.lineWidth,
                _internal_lineStyle: baselineProps.lineStyle,
                _internal_lineType: baselineProps.lineType,
                _internal_baseLevelCoordinate: baseLevelCoordinate,
                _internal_bottom: height,
                _internal_visibleRange: this._internal__itemsVisibleRange,
                _internal_barWidth: barWidth,
            });
            this._private__baselineLineRenderer._internal_setData({
                _internal_items: this._internal__items,
                _internal_topColor: baselineProps.topLineColor,
                _internal_bottomColor: baselineProps.bottomLineColor,
                _internal_lineWidth: baselineProps.lineWidth,
                _internal_lineStyle: baselineProps.lineStyle,
                _internal_lineType: baselineProps.lineType,
                _internal_baseLevelCoordinate: baseLevelCoordinate,
                _internal_bottom: height,
                _internal_visibleRange: this._internal__itemsVisibleRange,
                _internal_barWidth: barWidth,
            });
            return this._private__compositeRenderer;
        };
        SeriesBaselinePaneView.prototype._internal__createRawItem = function (time, price) {
            return this._internal__createRawItemBase(time, price);
        };
        return SeriesBaselinePaneView;
    }(LinePaneViewBase));

    var PaneRendererBrokenArea = /** @class */ (function (_super) {
        __extends(PaneRendererBrokenArea, _super);
        function PaneRendererBrokenArea() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this._internal_extensionsBoundaries = {};
            _this._internal__data = null;
            return _this;
        }
        PaneRendererBrokenArea.prototype._internal_setData = function (data) {
            this._internal__data = data;
        };
        // eslint-disable-next-line complexity
        PaneRendererBrokenArea.prototype._internal__drawImpl = function (ctx) {
            if (this._internal__data === null ||
                this._internal__data._internal_items.length === 0 ||
                this._internal__data._internal_visibleRange === null) {
                return;
            }
            if (this._internal__data._internal_compositeOperation) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ctx.globalCompositeOperation = this._internal__data._internal_compositeOperation;
            }
            var chunks = [];
            var chunkStart = this._internal__data._internal_visibleRange ? this._internal__data._internal_visibleRange.from : 0;
            var chunkEnd = this._internal__data._internal_visibleRange ? this._internal__data._internal_visibleRange.to : 0;
            var lastTime = null;
            var lastColor = null;
            for (var i = chunkStart; i < chunkEnd; ++i) {
                var currItem = this._internal__data._internal_items[i];
                if (lastTime !== null && (currItem.time - lastTime > 1 || currItem._internal_color !== lastColor)) {
                    chunks.push([chunkStart, currItem.time - lastTime > 1 ? i - 1 : i]);
                    chunkStart = i;
                }
                lastTime = currItem.time;
                lastColor = currItem._internal_color;
            }
            chunks.push([chunkStart, chunkEnd ? chunkEnd - 1 : 0]);
            ctx.strokeStyle = this._internal__data._internal_strokeColor;
            ctx.lineWidth = this._internal__data._internal_strokeWidth;
            ctx.fillStyle = this._internal__data._internal_color;
            for (var i = 0; i < chunks.length; ++i) {
                var fromItemIndex = chunks[i][0];
                var toItemIndex = chunks[i][1];
                if (typeof this._internal__data._internal_items[fromItemIndex]._internal_label !== 'undefined') {
                    ctx.fillStyle = this._internal__data._internal_strokeColor;
                    ctx.fillText(this._internal__data._internal_items[fromItemIndex]._internal_label, this._internal__data._internal_items[fromItemIndex].x, this._internal__data._internal_items[fromItemIndex].higherY - 4);
                    ctx.fillStyle = this._internal__data._internal_color;
                }
                if (typeof this._internal__data._internal_items[fromItemIndex]._internal_color !== 'undefined') {
                    ctx.fillStyle = this._internal__data._internal_items[fromItemIndex]._internal_color;
                }
                ctx.beginPath();
                ctx.moveTo(this._internal__data._internal_items[fromItemIndex].x, this._internal__data._internal_items[fromItemIndex].higherY);
                if (this._internal__data._internal_items[0]._internal_extendRight && this._internal__data._internal_items[fromItemIndex].higherY === this._internal__data._internal_items[fromItemIndex].lowerY && this._internal__data._internal_items.length === 1) {
                    ctx.lineTo(this._internal__data._internal_items[toItemIndex].end, this._internal__data._internal_items[toItemIndex].higherY);
                    ctx.lineTo(this._internal__data._internal_items[toItemIndex].end, this._internal__data._internal_items[toItemIndex].lowerY);
                    if (this._internal__data._internal_strokeWidth) {
                        ctx.stroke();
                    }
                    continue;
                }
                for (var j = fromItemIndex; j <= toItemIndex; j++) {
                    ctx.lineTo(this._internal__data._internal_items[j].x, this._internal__data._internal_items[j].higherY);
                }
                if (this._internal__data._internal_items[0]._internal_extendRight) {
                    ctx.lineTo(this._internal__data._internal_items[toItemIndex].end, this._internal__data._internal_items[toItemIndex].higherY);
                    ctx.lineTo(this._internal__data._internal_items[toItemIndex].end, this._internal__data._internal_items[toItemIndex].lowerY);
                }
                for (var j = toItemIndex; j >= fromItemIndex; --j) {
                    ctx.lineTo(this._internal__data._internal_items[j].x, this._internal__data._internal_items[j].lowerY);
                }
                ctx.closePath();
                if (this._internal__data._internal_color) {
                    ctx.fill();
                }
                if (this._internal__data._internal_strokeWidth) {
                    ctx.stroke();
                }
            }
        };
        return PaneRendererBrokenArea;
    }(ScaledRenderer));

    var CloudAreaPaneViewBase = /** @class */ (function (_super) {
        __extends(CloudAreaPaneViewBase, _super);
        function CloudAreaPaneViewBase(series, model) {
            return _super.call(this, series, model, true) || this;
        }
        CloudAreaPaneViewBase.prototype._internal__convertToCoordinates = function (priceScale, timeScale, firstValue) {
            timeScale.indexesToCoordinates(this._internal__items, undefinedIfNull(this._internal__itemsVisibleRange));
            priceScale.cloudPointsArrayToCoordinates(this._internal__items, firstValue, undefinedIfNull(this._internal__itemsVisibleRange));
        };
        CloudAreaPaneViewBase.prototype._internal__updateOptions = function () { };
        CloudAreaPaneViewBase.prototype._internal__updatePoints = function () {
            var priceScale = this._internal__series.priceScale();
            var timeScale = this._internal__model.timeScale();
            this._internal__clearVisibleRange();
            if (timeScale.isEmpty() || priceScale.isEmpty()) {
                return;
            }
            var visibleBars = timeScale.visibleStrictRange();
            if (visibleBars === null) {
                return;
            }
            if (this._internal__series.bars().size() === 0) {
                return;
            }
            var firstValue = this._internal__series.firstValue();
            if (firstValue === null) {
                return;
            }
            this._internal__itemsVisibleRange = visibleTimedValues(this._internal__items, visibleBars, this._internal__extendedVisibleRange);
            this._internal__convertToCoordinates(priceScale, timeScale, firstValue.value);
        };
        CloudAreaPaneViewBase.prototype._internal__fillRawPoints = function () {
            this._internal__items = this._internal__series.bars().rows().map(function (row) {
                var higherValue = row.value[1 /* High */];
                var lowerValue = row.value[2 /* Low */];
                return {
                    _internal_time: row.index,
                    _internal_higherPrice: higherValue,
                    _internal_lowerPrice: lowerValue,
                    _internal_x: NaN,
                    _internal_higherY: NaN,
                    _internal_lowerY: NaN,
                };
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            });
        };
        return CloudAreaPaneViewBase;
    }(SeriesPaneViewBase));

    var SeriesBrokenAreaPaneView = /** @class */ (function (_super) {
        __extends(SeriesBrokenAreaPaneView, _super);
        function SeriesBrokenAreaPaneView(series, model) {
            var _this = _super.call(this, series, model) || this;
            _this._private__renderer = new CompositeRenderer();
            _this._private__brokenAreaRenderer = new PaneRendererBrokenArea();
            _this._private__renderer._internal_setRenderers([_this._private__brokenAreaRenderer]);
            return _this;
        }
        SeriesBrokenAreaPaneView.prototype._internal_setExtensionsBoundaries = function (extensionsBoundaries) {
            this._private__brokenAreaRenderer._internal_extensionsBoundaries = extensionsBoundaries;
        };
        SeriesBrokenAreaPaneView.prototype.renderer = function (height, width) {
            if (!this._internal__series.visible()) {
                return null;
            }
            var areaStyleProperties = this._internal__series.options();
            this._internal__makeValid();
            var brokenAreaRenderer = {
                _internal_items: this._internal__items,
                _internal_color: areaStyleProperties.color,
                _internal_strokeColor: areaStyleProperties.strokeColor,
                _internal_strokeWidth: areaStyleProperties.strokeWidth,
                _internal_compositeOperation: areaStyleProperties.compositeOperation,
                _internal_width: width,
                _internal_visibleRange: this._internal__itemsVisibleRange,
                _internal_barWidth: this._internal__model.timeScale().barSpacing(),
            };
            this._private__brokenAreaRenderer._internal_setData(brokenAreaRenderer);
            return this._private__renderer;
        };
        SeriesBrokenAreaPaneView.prototype._internal__convertToCoordinates = function (priceScale, timeScale, firstValue) {
            timeScale.indexesToCoordinatesExtensions(this._internal__items, this._private__brokenAreaRenderer._internal_extensionsBoundaries, undefinedIfNull(this._internal__itemsVisibleRange));
            priceScale.cloudPointsArrayToCoordinates(this._internal__items, firstValue, undefinedIfNull(this._internal__itemsVisibleRange));
        };
        SeriesBrokenAreaPaneView.prototype._internal__fillRawPoints = function () {
            this._internal__items = this._internal__series.bars().rows().map(function (row) {
                var higherValue = row.value[1 /* High */];
                var lowerValue = row.value[2 /* Low */];
                var res = {
                    time: row.index,
                    higherPrice: higherValue,
                    lowerPrice: lowerValue,
                    x: NaN,
                    end: NaN,
                    higherY: NaN,
                    lowerY: NaN,
                };
                if (typeof row.color !== 'undefined') {
                    res._internal_color = row.color;
                }
                if (typeof row.id !== 'undefined') {
                    res.id = row.id;
                }
                if (typeof row.label !== 'undefined') {
                    res._internal_label = row.label;
                }
                if (typeof row.extendRight !== 'undefined') {
                    res._internal_extendRight = row.extendRight;
                }
                return res;
            });
        };
        return SeriesBrokenAreaPaneView;
    }(CloudAreaPaneViewBase));

    var PaneRendererCandlesticks = /** @class */ (function () {
        function PaneRendererCandlesticks() {
            this._private__data = null;
            // scaled with pixelRatio
            this._private__barWidth = 0;
        }
        PaneRendererCandlesticks.prototype._internal_setData = function (data) {
            this._private__data = data;
        };
        PaneRendererCandlesticks.prototype.draw = function (ctx, renderParams) {
            if (this._private__data === null || this._private__data._internal_bars.length === 0 || this._private__data._internal_visibleRange === null) {
                return;
            }
            var pixelRatio = renderParams.pixelRatio;
            // now we know pixelRatio and we could calculate barWidth effectively
            this._private__barWidth = optimalCandlestickWidth(this._private__data._internal_barSpacing, pixelRatio);
            // grid and crosshair have line width = Math.floor(pixelRatio)
            // if this value is odd, we have to make candlesticks' width odd
            // if this value is even, we have to make candlesticks' width even
            // in order of keeping crosshair-over-candlesticks drawing symmetric
            if (this._private__barWidth >= 2) {
                var wickWidth = Math.floor(pixelRatio);
                if ((wickWidth % 2) !== (this._private__barWidth % 2)) {
                    this._private__barWidth--;
                }
            }
            var bars = this._private__data._internal_bars;
            if (this._private__data._internal_wickVisible) {
                this._private__drawWicks(ctx, bars, this._private__data._internal_visibleRange, pixelRatio);
            }
            if (this._private__data._internal_borderVisible) {
                this._private__drawBorder(ctx, bars, this._private__data._internal_visibleRange, this._private__data._internal_barSpacing, pixelRatio);
            }
            var borderWidth = this._private__calculateBorderWidth(pixelRatio);
            if (!this._private__data._internal_borderVisible || this._private__barWidth > borderWidth * 2) {
                this._private__drawCandles(ctx, bars, this._private__data._internal_visibleRange, pixelRatio);
            }
        };
        PaneRendererCandlesticks.prototype._private__drawWicks = function (ctx, bars, visibleRange, pixelRatio) {
            if (this._private__data === null) {
                return;
            }
            var prevWickColor = '';
            var wickWidth = Math.min(Math.floor(pixelRatio), Math.floor(this._private__data._internal_barSpacing * pixelRatio));
            wickWidth = Math.max(Math.floor(pixelRatio), Math.min(wickWidth, this._private__barWidth));
            var wickOffset = Math.floor(wickWidth * 0.5);
            var prevEdge = null;
            for (var i = visibleRange.from; i < visibleRange.to; i++) {
                var bar = bars[i];
                if (bar._internal_wickColor !== prevWickColor) {
                    ctx.fillStyle = bar._internal_wickColor;
                    prevWickColor = bar._internal_wickColor;
                }
                var top_1 = Math.round(Math.min(bar.openY, bar.closeY) * pixelRatio);
                var bottom = Math.round(Math.max(bar.openY, bar.closeY) * pixelRatio);
                var high = Math.round(bar.highY * pixelRatio);
                var low = Math.round(bar.lowY * pixelRatio);
                var scaledX = Math.round(pixelRatio * bar.x);
                var left = scaledX - wickOffset;
                var right = left + wickWidth - 1;
                if (prevEdge !== null) {
                    left = Math.max(prevEdge + 1, left);
                    left = Math.min(left, right);
                }
                var width = right - left + 1;
                ctx.fillRect(left, high, width, top_1 - high);
                ctx.fillRect(left, bottom + 1, width, low - bottom);
                prevEdge = right;
            }
        };
        PaneRendererCandlesticks.prototype._private__calculateBorderWidth = function (pixelRatio) {
            var borderWidth = Math.floor(1 /* BarBorderWidth */ * pixelRatio);
            if (this._private__barWidth <= 2 * borderWidth) {
                borderWidth = Math.floor((this._private__barWidth - 1) * 0.5);
            }
            var res = Math.max(Math.floor(pixelRatio), borderWidth);
            if (this._private__barWidth <= res * 2) {
                // do not draw bodies, restore original value
                return Math.max(Math.floor(pixelRatio), Math.floor(1 /* BarBorderWidth */ * pixelRatio));
            }
            return res;
        };
        PaneRendererCandlesticks.prototype._private__drawBorder = function (ctx, bars, visibleRange, barSpacing, pixelRatio) {
            if (this._private__data === null) {
                return;
            }
            var prevBorderColor = '';
            var borderWidth = this._private__calculateBorderWidth(pixelRatio);
            var prevEdge = null;
            for (var i = visibleRange.from; i < visibleRange.to; i++) {
                var bar = bars[i];
                if (bar._internal_borderColor !== prevBorderColor) {
                    ctx.fillStyle = bar._internal_borderColor;
                    prevBorderColor = bar._internal_borderColor;
                }
                var left = Math.round(bar.x * pixelRatio) - Math.floor(this._private__barWidth * 0.5);
                // this is important to calculate right before patching left
                var right = left + this._private__barWidth - 1;
                var top_2 = Math.round(Math.min(bar.openY, bar.closeY) * pixelRatio);
                var bottom = Math.round(Math.max(bar.openY, bar.closeY) * pixelRatio);
                if (prevEdge !== null) {
                    left = Math.max(prevEdge + 1, left);
                    left = Math.min(left, right);
                }
                if (this._private__data._internal_barSpacing * pixelRatio > 2 * borderWidth) {
                    fillRectInnerBorder(ctx, left, top_2, right - left + 1, bottom - top_2 + 1, borderWidth);
                }
                else {
                    var width = right - left + 1;
                    ctx.fillRect(left, top_2, width, bottom - top_2 + 1);
                }
                prevEdge = right;
            }
        };
        PaneRendererCandlesticks.prototype._private__drawCandles = function (ctx, bars, visibleRange, pixelRatio) {
            if (this._private__data === null) {
                return;
            }
            var prevBarColor = '';
            var borderWidth = this._private__calculateBorderWidth(pixelRatio);
            for (var i = visibleRange.from; i < visibleRange.to; i++) {
                var bar = bars[i];
                var top_3 = Math.round(Math.min(bar.openY, bar.closeY) * pixelRatio);
                var bottom = Math.round(Math.max(bar.openY, bar.closeY) * pixelRatio);
                var left = Math.round(bar.x * pixelRatio) - Math.floor(this._private__barWidth * 0.5);
                var right = left + this._private__barWidth - 1;
                if (bar._internal_color !== prevBarColor) {
                    var barColor = bar._internal_color;
                    ctx.fillStyle = barColor;
                    prevBarColor = barColor;
                }
                if (this._private__data._internal_borderVisible) {
                    left += borderWidth;
                    top_3 += borderWidth;
                    right -= borderWidth;
                    bottom -= borderWidth;
                }
                if (top_3 > bottom) {
                    continue;
                }
                ctx.fillRect(left, top_3, right - left + 1, bottom - top_3 + 1);
            }
        };
        return PaneRendererCandlesticks;
    }());

    var SeriesCandlesticksPaneView = /** @class */ (function (_super) {
        __extends(SeriesCandlesticksPaneView, _super);
        function SeriesCandlesticksPaneView() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this._private__renderer = new PaneRendererCandlesticks();
            return _this;
        }
        SeriesCandlesticksPaneView.prototype.renderer = function (height, width) {
            if (!this._internal__series.visible()) {
                return null;
            }
            var candlestickStyleProps = this._internal__series.options();
            this._internal__makeValid();
            var data = {
                _internal_bars: this._internal__items,
                _internal_barSpacing: this._internal__model.timeScale().barSpacing(),
                _internal_wickVisible: candlestickStyleProps.wickVisible,
                _internal_borderVisible: candlestickStyleProps.borderVisible,
                _internal_visibleRange: this._internal__itemsVisibleRange,
            };
            this._private__renderer._internal_setData(data);
            return this._private__renderer;
        };
        SeriesCandlesticksPaneView.prototype._internal__updateOptions = function () {
            var _this = this;
            this._internal__items.forEach(function (item) {
                var style = _this._internal__series.barColorer().barStyle(item.time);
                item._internal_color = style.barColor;
                item._internal_wickColor = style.barWickColor;
                item._internal_borderColor = style.barBorderColor;
            });
        };
        SeriesCandlesticksPaneView.prototype._internal__createRawItem = function (time, bar, colorer) {
            var style = colorer.barStyle(time);
            return __assign(__assign({}, this._internal__createDefaultItem(time, bar, colorer)), { _internal_color: style.barColor, _internal_wickColor: style.barWickColor, _internal_borderColor: style.barBorderColor });
        };
        return SeriesCandlesticksPaneView;
    }(BarsPaneViewBase));

    var PaneRendererCloudArea = /** @class */ (function (_super) {
        __extends(PaneRendererCloudArea, _super);
        function PaneRendererCloudArea() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this._internal__data = null;
            return _this;
        }
        PaneRendererCloudArea.prototype._internal_setData = function (data) {
            this._internal__data = data;
        };
        // eslint-disable-next-line complexity
        PaneRendererCloudArea.prototype._internal__drawImpl = function (ctx) {
            if (this._internal__data === null || this._internal__data._internal_items.length === 0 || this._internal__data._internal_visibleRange === null) {
                return;
            }
            var startGreen = 1;
            var turningPoints = [];
            var sign = -2;
            for (var i = this._internal__data._internal_visibleRange.from + 1; i < this._internal__data._internal_visibleRange.to; ++i) {
                var currItem = this._internal__data._internal_items[i];
                var delta = currItem.higherPrice - currItem.lowerPrice;
                var newSign = delta > 0 ? 1 : -1;
                if (i === this._internal__data._internal_visibleRange.from + 1) {
                    startGreen = delta;
                }
                if (sign !== -2) {
                    if (sign * newSign === -1) {
                        turningPoints.push(i);
                    }
                }
                sign = newSign;
            }
            turningPoints.push(this._internal__data._internal_visibleRange.to);
            var firstPoint = this._internal__data._internal_visibleRange.from;
            var intersectionPoint = [0, 0];
            var newIntersectionPoint = [0, 0];
            var lastPoint;
            for (var i = 0; i < turningPoints.length; ++i) {
                lastPoint = turningPoints[i];
                ctx.beginPath();
                if (i === 0) {
                    ctx.moveTo(this._internal__data._internal_items[firstPoint].x, this._internal__data._internal_items[firstPoint].higherY);
                }
                else {
                    ctx.moveTo(intersectionPoint[0], intersectionPoint[1]);
                }
                for (var j = firstPoint; j < lastPoint; j++) {
                    ctx.lineTo(this._internal__data._internal_items[j].x, this._internal__data._internal_items[j].higherY);
                }
                if (i !== turningPoints.length - 1) {
                    newIntersectionPoint = this._private__calculateIntersection(lastPoint);
                    ctx.lineTo(newIntersectionPoint[0], newIntersectionPoint[1]);
                }
                for (var j = lastPoint - 1; j >= firstPoint; --j) {
                    ctx.lineTo(this._internal__data._internal_items[j].x, this._internal__data._internal_items[j].lowerY);
                }
                if (i !== 0) {
                    ctx.lineTo(intersectionPoint[0], intersectionPoint[1]);
                }
                ctx.closePath();
                if (startGreen * Math.pow(-1, i) > 0) {
                    ctx.fillStyle = this._internal__data._internal_positiveColor;
                }
                else {
                    ctx.fillStyle = this._internal__data._internal_negativeColor;
                }
                ctx.fill();
                firstPoint = lastPoint;
                intersectionPoint = newIntersectionPoint;
            }
        };
        PaneRendererCloudArea.prototype._private__calculateIntersection = function (turning) {
            if (this._internal__data === null || this._internal__data._internal_items.length === 0 || this._internal__data._internal_visibleRange === null) {
                throw new Error('Empty data');
            }
            return PaneRendererCloudArea._private__getIntersection(this._internal__data._internal_items[turning - 1].x, this._internal__data._internal_items[turning - 1].higherY, this._internal__data._internal_items[turning].x, this._internal__data._internal_items[turning].higherY, this._internal__data._internal_items[turning - 1].lowerY, this._internal__data._internal_items[turning].lowerY);
        };
        PaneRendererCloudArea._private__getIntersection = function (x11, y11, x12, y12, y21, y22) {
            var A1 = y12 - y11;
            var B1 = x11 - x12;
            var C1 = A1 * x11 + B1 * y11;
            var A2 = y22 - y21;
            var B2 = x11 - x12;
            var C2 = A2 * x11 + B2 * y21;
            var delta = A1 * B2 - A2 * B1;
            if (delta === 0) {
                throw new Error('Lines are parallel');
            }
            var IX = (B2 * C1 - B1 * C2) / delta;
            var IY = (A1 * C2 - A2 * C1) / delta;
            return [IX, IY];
        };
        return PaneRendererCloudArea;
    }(ScaledRenderer));

    var SeriesCloudAreaPaneView = /** @class */ (function (_super) {
        __extends(SeriesCloudAreaPaneView, _super);
        function SeriesCloudAreaPaneView(series, model) {
            var _this = _super.call(this, series, model) || this;
            _this._private__renderer = new CompositeRenderer();
            _this._private__cloudAreaRenderer = new PaneRendererCloudArea();
            _this._private__higherRenderer = new PaneRendererLine();
            _this._private__lowerRenderer = new PaneRendererLine();
            _this._private__renderer._internal_setRenderers([_this._private__cloudAreaRenderer, _this._private__higherRenderer, _this._private__lowerRenderer]);
            return _this;
        }
        SeriesCloudAreaPaneView.prototype.renderer = function (height, width) {
            if (!this._internal__series.visible()) {
                return null;
            }
            var areaStyleProperties = this._internal__series.options();
            this._internal__makeValid();
            var cloudRendererData = {
                _internal_items: this._internal__items,
                _internal_positiveColor: areaStyleProperties.positiveColor,
                _internal_negativeColor: areaStyleProperties.negativeColor,
                _internal_bottom: height,
                _internal_visibleRange: this._internal__itemsVisibleRange,
                _internal_barWidth: this._internal__model.timeScale().barSpacing(),
            };
            var higherLineData = [];
            for (var i = 0; i < this._internal__items.length; i++) {
                var temp = {
                    time: this._internal__items[i].time,
                    price: this._internal__items[i].higherPrice,
                    x: this._internal__items[i].x,
                    y: this._internal__items[i].higherY,
                };
                higherLineData.push(temp);
            }
            var higherRendererLineData = {
                _internal_items: higherLineData,
                _internal_lineColor: areaStyleProperties.higherLineColor,
                _internal_lineStyle: areaStyleProperties.higherLineStyle,
                _internal_lineType: areaStyleProperties.higherLineType,
                _internal_lineWidth: areaStyleProperties.higherLineWidth,
                _internal_visibleRange: this._internal__itemsVisibleRange,
                _internal_barWidth: this._internal__model.timeScale().barSpacing(),
            };
            var lowerLineData = [];
            for (var i = 0; i < this._internal__items.length; i++) {
                var temp = {
                    time: this._internal__items[i].time,
                    price: this._internal__items[i].lowerPrice,
                    x: this._internal__items[i].x,
                    y: this._internal__items[i].lowerY,
                };
                lowerLineData.push(temp);
            }
            var lowerRendererLineData = {
                _internal_items: lowerLineData,
                _internal_lineColor: areaStyleProperties.lowerLineColor,
                _internal_lineStyle: areaStyleProperties.lowerLineStyle,
                _internal_lineType: areaStyleProperties.lowerLineType,
                _internal_lineWidth: areaStyleProperties.lowerLineWidth,
                _internal_visibleRange: this._internal__itemsVisibleRange,
                _internal_barWidth: this._internal__model.timeScale().barSpacing(),
            };
            this._private__cloudAreaRenderer._internal_setData(cloudRendererData);
            this._private__higherRenderer._internal_setData(higherRendererLineData);
            this._private__lowerRenderer._internal_setData(lowerRendererLineData);
            return this._private__renderer;
        };
        return SeriesCloudAreaPaneView;
    }(CloudAreaPaneViewBase));

    var showSpacingMinimalBarWidth = 1;
    var alignToMinimalWidthLimit = 4;
    var PaneRendererHistogram = /** @class */ (function () {
        function PaneRendererHistogram() {
            this._private__data = null;
            this._private__precalculatedCache = [];
        }
        PaneRendererHistogram.prototype._internal_setData = function (data) {
            this._private__data = data;
            this._private__precalculatedCache = [];
        };
        PaneRendererHistogram.prototype.draw = function (ctx, renderParams) {
            if (this._private__data === null || this._private__data._internal_items.length === 0 || this._private__data._internal_visibleRange === null) {
                return;
            }
            var pixelRatio = renderParams.pixelRatio;
            if (!this._private__precalculatedCache.length) {
                this._private__fillPrecalculatedCache(pixelRatio);
            }
            var tickWidth = Math.max(1, Math.floor(pixelRatio));
            var histogramBase = Math.round((this._private__data._internal_histogramBase) * pixelRatio);
            var topHistogramBase = histogramBase - Math.floor(tickWidth / 2);
            var bottomHistogramBase = topHistogramBase + tickWidth;
            for (var i = this._private__data._internal_visibleRange.from; i < this._private__data._internal_visibleRange.to; i++) {
                var item = this._private__data._internal_items[i];
                var current = this._private__precalculatedCache[i - this._private__data._internal_visibleRange.from];
                var y = Math.round(item.y * pixelRatio);
                ctx.fillStyle = item._internal_color;
                var top_1 = void 0;
                var bottom = void 0;
                if (y <= topHistogramBase) {
                    top_1 = y;
                    bottom = bottomHistogramBase;
                }
                else {
                    top_1 = topHistogramBase;
                    bottom = y - Math.floor(tickWidth / 2) + tickWidth;
                }
                ctx.fillRect(current._internal_left, top_1, current._internal_right - current._internal_left + 1, bottom - top_1);
            }
        };
        // eslint-disable-next-line complexity
        PaneRendererHistogram.prototype._private__fillPrecalculatedCache = function (pixelRatio) {
            if (this._private__data === null || this._private__data._internal_items.length === 0 || this._private__data._internal_visibleRange === null) {
                this._private__precalculatedCache = [];
                return;
            }
            var spacing = Math.ceil(this._private__data._internal_barSpacing * pixelRatio) <= showSpacingMinimalBarWidth ? 0 : Math.max(1, Math.floor(pixelRatio));
            var columnWidth = Math.round(this._private__data._internal_barSpacing * pixelRatio) - spacing;
            this._private__precalculatedCache = new Array(this._private__data._internal_visibleRange.to - this._private__data._internal_visibleRange.from);
            for (var i = this._private__data._internal_visibleRange.from; i < this._private__data._internal_visibleRange.to; i++) {
                var item = this._private__data._internal_items[i];
                // force cast to avoid ensureDefined call
                var x = Math.round(item.x * pixelRatio);
                var left = void 0;
                var right = void 0;
                if (columnWidth % 2) {
                    var halfWidth = (columnWidth - 1) / 2;
                    left = x - halfWidth;
                    right = x + halfWidth;
                }
                else {
                    // shift pixel to left
                    var halfWidth = columnWidth / 2;
                    left = x - halfWidth;
                    right = x + halfWidth - 1;
                }
                this._private__precalculatedCache[i - this._private__data._internal_visibleRange.from] = {
                    _internal_left: left,
                    _internal_right: right,
                    _internal_roundedCenter: x,
                    _internal_center: (item.x * pixelRatio),
                    _internal_time: item.time,
                };
            }
            // correct positions
            for (var i = this._private__data._internal_visibleRange.from + 1; i < this._private__data._internal_visibleRange.to; i++) {
                var current = this._private__precalculatedCache[i - this._private__data._internal_visibleRange.from];
                var prev = this._private__precalculatedCache[i - this._private__data._internal_visibleRange.from - 1];
                if (current._internal_time !== prev._internal_time + 1) {
                    continue;
                }
                if (current._internal_left - prev._internal_right !== (spacing + 1)) {
                    // have to align
                    if (prev._internal_roundedCenter > prev._internal_center) {
                        // prev wasshifted to left, so add pixel to right
                        prev._internal_right = current._internal_left - spacing - 1;
                    }
                    else {
                        // extend current to left
                        current._internal_left = prev._internal_right + spacing + 1;
                    }
                }
            }
            var minWidth = Math.ceil(this._private__data._internal_barSpacing * pixelRatio);
            for (var i = this._private__data._internal_visibleRange.from; i < this._private__data._internal_visibleRange.to; i++) {
                var current = this._private__precalculatedCache[i - this._private__data._internal_visibleRange.from];
                // this could happen if barspacing < 1
                if (current._internal_right < current._internal_left) {
                    current._internal_right = current._internal_left;
                }
                var width = current._internal_right - current._internal_left + 1;
                minWidth = Math.min(width, minWidth);
            }
            if (spacing > 0 && minWidth < alignToMinimalWidthLimit) {
                for (var i = this._private__data._internal_visibleRange.from; i < this._private__data._internal_visibleRange.to; i++) {
                    var current = this._private__precalculatedCache[i - this._private__data._internal_visibleRange.from];
                    var width = current._internal_right - current._internal_left + 1;
                    if (width > minWidth) {
                        if (current._internal_roundedCenter > current._internal_center) {
                            current._internal_right -= 1;
                        }
                        else {
                            current._internal_left += 1;
                        }
                    }
                }
            }
        };
        return PaneRendererHistogram;
    }());

    function createEmptyHistogramData(barSpacing) {
        return {
            _internal_items: [],
            _internal_barSpacing: barSpacing,
            _internal_histogramBase: NaN,
            _internal_visibleRange: null,
        };
    }
    function createRawItem(time, price, color) {
        return {
            time: time,
            price: price,
            x: NaN,
            y: NaN,
            _internal_color: color,
        };
    }
    var SeriesHistogramPaneView = /** @class */ (function (_super) {
        __extends(SeriesHistogramPaneView, _super);
        function SeriesHistogramPaneView(series, model) {
            var _this = _super.call(this, series, model, false) || this;
            _this._private__compositeRenderer = new CompositeRenderer();
            _this._private__histogramData = createEmptyHistogramData(0);
            _this._private__renderer = new PaneRendererHistogram();
            return _this;
        }
        SeriesHistogramPaneView.prototype.renderer = function (height, width) {
            if (!this._internal__series.visible()) {
                return null;
            }
            this._internal__makeValid();
            return this._private__compositeRenderer;
        };
        SeriesHistogramPaneView.prototype._internal__fillRawPoints = function () {
            var barSpacing = this._internal__model.timeScale().barSpacing();
            this._private__histogramData = createEmptyHistogramData(barSpacing);
            var targetIndex = 0;
            var itemIndex = 0;
            var defaultColor = this._internal__series.options().color;
            for (var _i = 0, _a = this._internal__series.bars().rows(); _i < _a.length; _i++) {
                var row = _a[_i];
                var value = row.value[3 /* Close */];
                var color = row.color !== undefined ? row.color : defaultColor;
                var item = createRawItem(row.index, value, color);
                targetIndex++;
                if (targetIndex < this._private__histogramData._internal_items.length) {
                    this._private__histogramData._internal_items[targetIndex] = item;
                }
                else {
                    this._private__histogramData._internal_items.push(item);
                }
                this._internal__items[itemIndex++] = { time: row.index, x: 0 };
            }
            this._private__renderer._internal_setData(this._private__histogramData);
            this._private__compositeRenderer._internal_setRenderers([this._private__renderer]);
        };
        SeriesHistogramPaneView.prototype._internal__updateOptions = function () { };
        SeriesHistogramPaneView.prototype._internal__clearVisibleRange = function () {
            _super.prototype._internal__clearVisibleRange.call(this);
            this._private__histogramData._internal_visibleRange = null;
        };
        SeriesHistogramPaneView.prototype._internal__convertToCoordinates = function (priceScale, timeScale, firstValue) {
            if (this._internal__itemsVisibleRange === null) {
                return;
            }
            var barSpacing = timeScale.barSpacing();
            var visibleBars = ensureNotNull(timeScale.visibleStrictRange());
            var histogramBase = priceScale.priceToCoordinate(this._internal__series.options().base, firstValue);
            timeScale.indexesToCoordinates(this._private__histogramData._internal_items);
            priceScale.pointsArrayToCoordinates(this._private__histogramData._internal_items, firstValue);
            this._private__histogramData._internal_histogramBase = histogramBase;
            this._private__histogramData._internal_visibleRange = visibleTimedValues(this._private__histogramData._internal_items, visibleBars, false);
            this._private__histogramData._internal_barSpacing = barSpacing;
            // need this to update cache
            this._private__renderer._internal_setData(this._private__histogramData);
        };
        return SeriesHistogramPaneView;
    }(SeriesPaneViewBase));

    var SeriesLinePaneView = /** @class */ (function (_super) {
        __extends(SeriesLinePaneView, _super);
        // eslint-disable-next-line no-useless-constructor
        function SeriesLinePaneView(series, model) {
            var _this = _super.call(this, series, model) || this;
            _this._private__lineRenderer = new PaneRendererLine();
            return _this;
        }
        SeriesLinePaneView.prototype.renderer = function (height, width) {
            if (!this._internal__series.visible()) {
                return null;
            }
            var lineStyleProps = this._internal__series.options();
            this._internal__makeValid();
            var data = {
                _internal_items: this._internal__items,
                _internal_lineColor: lineStyleProps.color,
                _internal_lineStyle: lineStyleProps.lineStyle,
                _internal_lineType: lineStyleProps.lineType,
                _internal_lineWidth: lineStyleProps.lineWidth,
                _internal_visibleRange: this._internal__itemsVisibleRange,
                _internal_barWidth: this._internal__model.timeScale().barSpacing(),
            };
            this._private__lineRenderer._internal_setData(data);
            return this._private__lineRenderer;
        };
        SeriesLinePaneView.prototype._internal__updateOptions = function () {
            var _this = this;
            this._internal__items.forEach(function (item) {
                item._internal_color = _this._internal__series.barColorer().barStyle(item.time).barColor;
            });
        };
        SeriesLinePaneView.prototype._internal__createRawItem = function (time, price, colorer) {
            var item = this._internal__createRawItemBase(time, price);
            item._internal_color = colorer.barStyle(time).barColor;
            return item;
        };
        return SeriesLinePaneView;
    }(LinePaneViewBase));

    var PanePriceAxisLabelRenderer = /** @class */ (function () {
        function PanePriceAxisLabelRenderer() {
            this._private__priceAxisViewRenderer = null;
            this._private__rendererOptions = null;
        }
        PanePriceAxisLabelRenderer.prototype._internal_setParams = function (priceAxisViewRenderer, rendererOptions) {
            this._private__priceAxisViewRenderer = priceAxisViewRenderer;
            this._private__rendererOptions = rendererOptions;
        };
        PanePriceAxisLabelRenderer.prototype.draw = function (ctx, renderParams) {
            if (this._private__rendererOptions === null || this._private__priceAxisViewRenderer === null || !this._private__priceAxisViewRenderer.draw) {
                return;
            }
            this._private__priceAxisViewRenderer.draw(ctx, this._private__rendererOptions, renderParams);
        };
        return PanePriceAxisLabelRenderer;
    }());
    var PanePriceAxisLabelView = /** @class */ (function () {
        function PanePriceAxisLabelView(priceAxisView, dataSource, chartModel) {
            this._private__priceAxisLabelView = priceAxisView;
            this._private__dataSource = dataSource;
            this._private__chartModel = chartModel;
            this._private__renderer = new PanePriceAxisLabelRenderer();
        }
        PanePriceAxisLabelView.prototype.renderer = function (height, width) {
            var pane = this._private__chartModel.paneForSource(this._private__dataSource);
            if (pane === null) {
                return null;
            }
            // this price scale will be used to find label placement only (left, right, none)
            var priceScale = pane.isOverlay(this._private__dataSource) ? pane.defaultVisiblePriceScale() : this._private__dataSource.priceScale();
            if (priceScale === null) {
                return null;
            }
            var position = pane.priceScalePosition(priceScale);
            if (position === 'overlay') {
                return null;
            }
            var options = this._private__chartModel.priceAxisRendererOptions();
            options.align = position;
            this._private__renderer._internal_setParams(this._private__priceAxisLabelView._internal_paneRenderer(), options);
            return this._private__renderer;
        };
        return PanePriceAxisLabelView;
    }());

    var HorizontalLineRenderer = /** @class */ (function () {
        function HorizontalLineRenderer() {
            this._private__data = null;
        }
        HorizontalLineRenderer.prototype._internal_setData = function (data) {
            this._private__data = data;
        };
        HorizontalLineRenderer.prototype.draw = function (ctx, renderParams) {
            if (this._private__data === null) {
                return;
            }
            if (this._private__data._internal_visible === false) {
                return;
            }
            var pixelRatio = renderParams.pixelRatio;
            var y = Math.round(this._private__data._internal_y * pixelRatio);
            if (y < 0 || y > Math.ceil(this._private__data._internal_height * pixelRatio)) {
                return;
            }
            var x = 0;
            if (this._private__data._internal_x !== undefined) {
                x = Math.round(this._private__data._internal_x * pixelRatio);
            }
            var width = Math.ceil(this._private__data._internal_width * pixelRatio);
            ctx.lineCap = 'butt';
            ctx.strokeStyle = this._private__data._internal_color;
            ctx.lineWidth = Math.floor(this._private__data._internal_lineWidth * pixelRatio);
            setLineStyle(ctx, this._private__data._internal_lineStyle);
            drawHorizontalLine(ctx, y, x, width);
        };
        return HorizontalLineRenderer;
    }());

    var SeriesHorizontalLinePaneView = /** @class */ (function () {
        function SeriesHorizontalLinePaneView(series) {
            this._internal__lineRendererData = {
                _internal_width: 0,
                _internal_height: 0,
                _internal_y: 0,
                _internal_color: 'rgba(0, 0, 0, 0)',
                _internal_lineWidth: 1,
                _internal_lineStyle: 0 /* Solid */,
                _internal_visible: false,
            };
            this._internal__lineRenderer = new HorizontalLineRenderer();
            this._private__invalidated = true;
            this._internal__series = series;
            this._internal__model = series.model();
            this._internal__lineRenderer._internal_setData(this._internal__lineRendererData);
        }
        SeriesHorizontalLinePaneView.prototype._internal_update = function () {
            this._private__invalidated = true;
        };
        SeriesHorizontalLinePaneView.prototype.renderer = function (height, width) {
            if (!this._internal__series.visible()) {
                return null;
            }
            if (this._private__invalidated) {
                this._internal__updateImpl(height, width);
                this._private__invalidated = false;
            }
            return this._internal__lineRenderer;
        };
        return SeriesHorizontalLinePaneView;
    }());

    var SeriesHorizontalBaseLinePaneView = /** @class */ (function (_super) {
        __extends(SeriesHorizontalBaseLinePaneView, _super);
        // eslint-disable-next-line no-useless-constructor
        function SeriesHorizontalBaseLinePaneView(series) {
            return _super.call(this, series) || this;
        }
        SeriesHorizontalBaseLinePaneView.prototype._internal__updateImpl = function (height, width) {
            this._internal__lineRendererData._internal_visible = false;
            var priceScale = this._internal__series.priceScale();
            var mode = priceScale.mode().mode;
            if (mode !== 2 /* Percentage */ && mode !== 3 /* IndexedTo100 */) {
                return;
            }
            var seriesOptions = this._internal__series.options();
            if (!seriesOptions.baseLineVisible || !this._internal__series.visible()) {
                return;
            }
            var firstValue = this._internal__series.firstValue();
            if (firstValue === null) {
                return;
            }
            this._internal__lineRendererData._internal_visible = true;
            this._internal__lineRendererData._internal_y = priceScale.priceToCoordinate(firstValue.value, firstValue.value);
            this._internal__lineRendererData._internal_width = width;
            this._internal__lineRendererData._internal_height = height;
            this._internal__lineRendererData._internal_color = seriesOptions.baseLineColor;
            this._internal__lineRendererData._internal_lineWidth = seriesOptions.baseLineWidth;
            this._internal__lineRendererData._internal_lineStyle = seriesOptions.baseLineStyle;
        };
        return SeriesHorizontalBaseLinePaneView;
    }(SeriesHorizontalLinePaneView));

    var SeriesLastPriceAnimationRenderer = /** @class */ (function () {
        function SeriesLastPriceAnimationRenderer() {
            this._private__data = null;
        }
        SeriesLastPriceAnimationRenderer.prototype._internal_setData = function (data) {
            this._private__data = data;
        };
        SeriesLastPriceAnimationRenderer.prototype._internal_data = function () {
            return this._private__data;
        };
        SeriesLastPriceAnimationRenderer.prototype.draw = function (ctx, renderParams) {
            var data = this._private__data;
            if (data === null) {
                return;
            }
            ctx.save();
            var pixelRatio = renderParams.pixelRatio;
            var tickWidth = Math.max(1, Math.floor(pixelRatio));
            var correction = (tickWidth % 2) / 2;
            var centerX = Math.round(data._internal_center.x * pixelRatio) + correction; // correct x coordinate only
            var centerY = data._internal_center.y * pixelRatio;
            ctx.fillStyle = data._internal_seriesLineColor;
            ctx.beginPath();
            var centerPointRadius = Math.max(2, data._internal_seriesLineWidth * 1.5) * pixelRatio;
            ctx.arc(centerX, centerY, centerPointRadius, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.fillStyle = data._internal_fillColor;
            ctx.beginPath();
            ctx.arc(centerX, centerY, data._internal_radius * pixelRatio, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.lineWidth = tickWidth;
            ctx.strokeStyle = data._internal_strokeColor;
            ctx.beginPath();
            ctx.arc(centerX, centerY, data._internal_radius * pixelRatio + tickWidth / 2, 0, 2 * Math.PI, false);
            ctx.stroke();
            ctx.restore();
        };
        return SeriesLastPriceAnimationRenderer;
    }());

    var animationStagesData = [
        {
            _internal_start: 0,
            _internal_end: 0.25 /* Stage1Period */,
            _internal_startRadius: 4 /* Stage1StartCircleRadius */,
            _internal_endRadius: 10 /* Stage1EndCircleRadius */,
            _internal_startFillAlpha: 0.25 /* Stage1StartFillAlpha */,
            _internal_endFillAlpha: 0 /* Stage1EndFillAlpha */,
            _internal_startStrokeAlpha: 0.4 /* Stage1StartStrokeAlpha */,
            _internal_endStrokeAlpha: 0.8 /* Stage1EndStrokeAlpha */,
        },
        {
            _internal_start: 0.25 /* Stage1Period */,
            _internal_end: 0.25 /* Stage1Period */ + 0.275 /* Stage2Period */,
            _internal_startRadius: 10 /* Stage2StartCircleRadius */,
            _internal_endRadius: 14 /* Stage2EndCircleRadius */,
            _internal_startFillAlpha: 0 /* Stage2StartFillAlpha */,
            _internal_endFillAlpha: 0 /* Stage2EndFillAlpha */,
            _internal_startStrokeAlpha: 0.8 /* Stage2StartStrokeAlpha */,
            _internal_endStrokeAlpha: 0 /* Stage2EndStrokeAlpha */,
        },
        {
            _internal_start: 0.25 /* Stage1Period */ + 0.275 /* Stage2Period */,
            _internal_end: 0.25 /* Stage1Period */ + 0.275 /* Stage2Period */ + 0.475 /* Stage3Period */,
            _internal_startRadius: 14 /* Stage3StartCircleRadius */,
            _internal_endRadius: 14 /* Stage3EndCircleRadius */,
            _internal_startFillAlpha: 0 /* Stage3StartFillAlpha */,
            _internal_endFillAlpha: 0 /* Stage3EndFillAlpha */,
            _internal_startStrokeAlpha: 0 /* Stage3StartStrokeAlpha */,
            _internal_endStrokeAlpha: 0 /* Stage3EndStrokeAlpha */,
        },
    ];
    function color(seriesLineColor, stage, startAlpha, endAlpha) {
        var alpha = startAlpha + (endAlpha - startAlpha) * stage;
        return applyAlpha(seriesLineColor, alpha);
    }
    function radius(stage, startRadius, endRadius) {
        return startRadius + (endRadius - startRadius) * stage;
    }
    function animationData(durationSinceStart, lineColor) {
        var globalStage = (durationSinceStart % 2600 /* AnimationPeriod */) / 2600 /* AnimationPeriod */;
        var currentStageData;
        for (var _i = 0, animationStagesData_1 = animationStagesData; _i < animationStagesData_1.length; _i++) {
            var stageData = animationStagesData_1[_i];
            if (globalStage >= stageData._internal_start && globalStage <= stageData._internal_end) {
                currentStageData = stageData;
                break;
            }
        }
        assert(currentStageData !== undefined, 'Last price animation internal logic error');
        var subStage = (globalStage - currentStageData._internal_start) / (currentStageData._internal_end - currentStageData._internal_start);
        return {
            _internal_fillColor: color(lineColor, subStage, currentStageData._internal_startFillAlpha, currentStageData._internal_endFillAlpha),
            _internal_strokeColor: color(lineColor, subStage, currentStageData._internal_startStrokeAlpha, currentStageData._internal_endStrokeAlpha),
            _internal_radius: radius(subStage, currentStageData._internal_startRadius, currentStageData._internal_endRadius),
        };
    }
    var SeriesLastPriceAnimationPaneView = /** @class */ (function () {
        function SeriesLastPriceAnimationPaneView(series) {
            this._private__renderer = new SeriesLastPriceAnimationRenderer();
            this._private__invalidated = true;
            this._private__stageInvalidated = true;
            this._private__startTime = performance.now();
            this._private__endTime = this._private__startTime - 1;
            this._private__series = series;
        }
        SeriesLastPriceAnimationPaneView.prototype._internal_onDataCleared = function () {
            this._private__endTime = this._private__startTime - 1;
            this.update();
        };
        SeriesLastPriceAnimationPaneView.prototype._internal_onNewRealtimeDataReceived = function () {
            this.update();
            if (this._private__series.options().lastPriceAnimation === 2 /* OnDataUpdate */) {
                var now = performance.now();
                var timeToAnimationEnd = this._private__endTime - now;
                if (timeToAnimationEnd > 0) {
                    if (timeToAnimationEnd < 2600 /* AnimationPeriod */ / 4) {
                        this._private__endTime += 2600 /* AnimationPeriod */;
                    }
                    return;
                }
                this._private__startTime = now;
                this._private__endTime = now + 2600 /* AnimationPeriod */;
            }
        };
        SeriesLastPriceAnimationPaneView.prototype.update = function () {
            this._private__invalidated = true;
        };
        SeriesLastPriceAnimationPaneView.prototype._internal_invalidateStage = function () {
            this._private__stageInvalidated = true;
        };
        SeriesLastPriceAnimationPaneView.prototype._internal_visible = function () {
            // center point is always visible if lastPriceAnimation is not LastPriceAnimationMode.Disabled
            return this._private__series.options().lastPriceAnimation !== 0 /* Disabled */;
        };
        SeriesLastPriceAnimationPaneView.prototype._internal_animationActive = function () {
            switch (this._private__series.options().lastPriceAnimation) {
                case 0 /* Disabled */:
                    return false;
                case 1 /* Continuous */:
                    return true;
                case 2 /* OnDataUpdate */:
                    return performance.now() <= this._private__endTime;
            }
        };
        SeriesLastPriceAnimationPaneView.prototype.renderer = function (height, width) {
            if (this._private__invalidated) {
                this._private__updateImpl(height, width);
                this._private__invalidated = false;
                this._private__stageInvalidated = false;
            }
            else if (this._private__stageInvalidated) {
                this._private__updateRendererDataStage();
                this._private__stageInvalidated = false;
            }
            return this._private__renderer;
        };
        SeriesLastPriceAnimationPaneView.prototype._private__updateImpl = function (height, width) {
            this._private__renderer._internal_setData(null);
            var timeScale = this._private__series.model().timeScale();
            var visibleRange = timeScale.visibleStrictRange();
            var firstValue = this._private__series.firstValue();
            if (visibleRange === null || firstValue === null) {
                return;
            }
            var lastValue = this._private__series.lastValueData(true);
            if (lastValue.noData || !visibleRange.contains(lastValue.index)) {
                return;
            }
            var lastValuePoint = new Point(timeScale.indexToCoordinate(lastValue.index), this._private__series.priceScale().priceToCoordinate(lastValue.price, firstValue.value));
            var seriesLineColor = lastValue.color;
            var seriesLineWidth = this._private__series.options().lineWidth;
            var data = animationData(this._private__duration(), seriesLineColor);
            this._private__renderer._internal_setData({
                _internal_seriesLineColor: seriesLineColor,
                _internal_seriesLineWidth: seriesLineWidth,
                _internal_fillColor: data._internal_fillColor,
                _internal_strokeColor: data._internal_strokeColor,
                _internal_radius: data._internal_radius,
                _internal_center: lastValuePoint,
            });
        };
        SeriesLastPriceAnimationPaneView.prototype._private__updateRendererDataStage = function () {
            var rendererData = this._private__renderer._internal_data();
            if (rendererData !== null) {
                var data = animationData(this._private__duration(), rendererData._internal_seriesLineColor);
                rendererData._internal_fillColor = data._internal_fillColor;
                rendererData._internal_strokeColor = data._internal_strokeColor;
                rendererData._internal_radius = data._internal_radius;
            }
        };
        SeriesLastPriceAnimationPaneView.prototype._private__duration = function () {
            return this._internal_animationActive() ? performance.now() - this._private__startTime : 2600 /* AnimationPeriod */ - 1;
        };
        return SeriesLastPriceAnimationPaneView;
    }());

    function size(barSpacing, coeff) {
        var result = Math.min(Math.max(barSpacing, 12 /* MinShapeSize */), 30 /* MaxShapeSize */) * coeff;
        return ceiledOdd(result);
    }
    function shapeSize(shape, originalSize) {
        switch (shape) {
            case 'arrowDown':
            case 'arrowUp':
            case 'triangle':
                return size(originalSize, 1);
            case 'circle':
                return size(originalSize, 0.8);
            case 'square':
                return size(originalSize, 0.7);
        }
    }
    function calculateShapeHeight(barSpacing) {
        return ceiledEven(size(barSpacing, 1));
    }
    function shapeMargin(barSpacing) {
        return Math.max(size(barSpacing, 0.1), 3 /* MinShapeMargin */);
    }

    function drawSquare(ctx, centerX, centerY, size) {
        var squareSize = shapeSize('square', size);
        var halfSize = (squareSize - 1) / 2;
        var left = centerX - halfSize;
        var top = centerY - halfSize;
        ctx.fillRect(left, top, squareSize, squareSize);
    }

    function drawArrow(up, ctx, centerX, centerY, size) {
        var arrowSize = shapeSize('arrowUp', size);
        var halfArrowSize = (arrowSize - 1) / 2;
        var baseSize = ceiledOdd(size / 2);
        var halfBaseSize = (baseSize - 1) / 2;
        ctx.beginPath();
        if (up) {
            ctx.moveTo(centerX - halfArrowSize, centerY);
            ctx.lineTo(centerX, centerY - halfArrowSize);
            ctx.lineTo(centerX + halfArrowSize, centerY);
            ctx.lineTo(centerX + halfBaseSize, centerY);
            ctx.lineTo(centerX + halfBaseSize, centerY + halfArrowSize);
            ctx.lineTo(centerX - halfBaseSize, centerY + halfArrowSize);
            ctx.lineTo(centerX - halfBaseSize, centerY);
        }
        else {
            ctx.moveTo(centerX - halfArrowSize, centerY);
            ctx.lineTo(centerX, centerY + halfArrowSize);
            ctx.lineTo(centerX + halfArrowSize, centerY);
            ctx.lineTo(centerX + halfBaseSize, centerY);
            ctx.lineTo(centerX + halfBaseSize, centerY - halfArrowSize);
            ctx.lineTo(centerX - halfBaseSize, centerY - halfArrowSize);
            ctx.lineTo(centerX - halfBaseSize, centerY);
        }
        ctx.fill();
        ctx.stroke();
    }

    function drawCircle(ctx, centerX, centerY, size) {
        var circleSize = shapeSize('circle', size);
        var halfSize = (circleSize - 1) / 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, halfSize, 0, 2 * Math.PI, false);
        ctx.fill();
    }

    function drawText(ctx, text, x, y) {
        ctx.fillText(text, x, y);
    }

    function drawTriangle(ctx, centerX, centerY, size) {
        var halfArrowSize = size / 2;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - halfArrowSize);
        ctx.lineTo(centerX + halfArrowSize, centerY + halfArrowSize);
        ctx.lineTo(centerX - halfArrowSize, centerY + halfArrowSize);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    var SeriesMarkersRenderer = /** @class */ (function (_super) {
        __extends(SeriesMarkersRenderer, _super);
        function SeriesMarkersRenderer() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this._private__data = null;
            _this._private__textWidthCache = new TextWidthCache();
            _this._private__fontSize = -1;
            _this._private__fontFamily = '';
            _this._private__font = '';
            return _this;
        }
        SeriesMarkersRenderer.prototype._internal_setData = function (data) {
            this._private__data = data;
        };
        SeriesMarkersRenderer.prototype._internal_setParams = function (fontSize, fontFamily) {
            if (this._private__fontSize !== fontSize || this._private__fontFamily !== fontFamily) {
                this._private__fontSize = fontSize;
                this._private__fontFamily = fontFamily;
                this._private__font = makeFont(fontSize, fontFamily);
                this._private__textWidthCache.reset();
            }
        };
        // TODO: iosif check if neeeded
        // public hitTest(point: Point): HoveredObject | null {
        // 	if (this._data === null || this._data.visibleRange === null) {
        // 		return null;
        // 	}
        // 	for (let i = this._data.visibleRange.from; i < this._data.visibleRange.to; i++) {
        // 		const item = this._data.items[i];
        // 		if (hitTestItem(item, point.x, point.y)) {
        // 			return {
        // 				hitTestData: item.internalId,
        // 				externalId: item.externalId,
        // 			};
        // 		}
        // 	}
        // 	return null;
        // }
        SeriesMarkersRenderer.prototype._internal__drawImpl = function (ctx) {
            if (this._private__data === null || this._private__data._internal_visibleRange === null) {
                return;
            }
            ctx.textBaseline = 'middle';
            ctx.font = this._private__font;
            for (var i = this._private__data._internal_visibleRange.from; i < this._private__data._internal_visibleRange.to; i++) {
                var item = this._private__data._internal_items[i];
                if (item._internal_text !== undefined) {
                    item._internal_text._internal_width = this._private__textWidthCache.measureText(ctx, item._internal_text._internal_content);
                    item._internal_text._internal_height = this._private__fontSize;
                }
                drawItem(item, ctx);
            }
        };
        return SeriesMarkersRenderer;
    }(ScaledRenderer));
    function drawItem(item, ctx) {
        var _a, _b;
        var rotation = item._internal_rotation || (item._internal_anchor === 'bottom' ? 180 : item._internal_anchor === 'right' ? 90 : item._internal_anchor === 'left' ? -90 : 0);
        ctx.strokeStyle = ((_a = item._internal_stroke) === null || _a === void 0 ? void 0 : _a.color) || 'transparent';
        ctx.lineWidth = ((_b = item._internal_stroke) === null || _b === void 0 ? void 0 : _b.width) || 1;
        ctx.fillStyle = item._internal_color;
        if (item._internal_text !== undefined) {
            drawText(ctx, item._internal_text._internal_content, item.x - item._internal_text._internal_width / 2, item._internal_text._internal_y);
        }
        if (rotation) {
            ctx.save();
            ctx.translate(item.x, item._internal_y);
            ctx.rotate(rotation * (Math.PI / 180));
            ctx.translate(-item.x, -item._internal_y);
        }
        drawShape(item, ctx);
        if (rotation) {
            ctx.restore();
        }
    }
    function drawShape(item, ctx) {
        if (item._internal_size === 0) {
            return;
        }
        switch (item._internal_shape) {
            case 'triangle':
                drawTriangle(ctx, item.x, item._internal_y, item._internal_size);
                return;
            case 'arrowDown':
                drawArrow(false, ctx, item.x, item._internal_y, item._internal_size);
                return;
            case 'arrowUp':
                drawArrow(true, ctx, item.x, item._internal_y, item._internal_size);
                return;
            case 'circle':
                drawCircle(ctx, item.x, item._internal_y, item._internal_size);
                return;
            case 'square':
                drawSquare(ctx, item.x, item._internal_y, item._internal_size);
                return;
        }
        ensureNever(item._internal_shape);
    }
    // TODO: iosif might not be needed
    // function hitTestItem(item: SeriesMarkerRendererDataItem, x: Coordinate, y: Coordinate): boolean {
    // 	if (item.text !== undefined && hitTestText(item.x, item.text.y, item.text.width, item.text.height, x, y)) {
    // 		return true;
    // 	}
    // 	return hitTestShape(item, x, y);
    // }
    // function hitTestShape(item: SeriesMarkerRendererDataItem, x: Coordinate, y: Coordinate): boolean {
    // 	if (item.size === 0) {
    // 		return false;
    // 	}
    // 	switch (item.shape) {
    // 		case 'triangle':
    // 			return hitTestTriangle(item.x, item.y, item.size, x, y);
    // 		case 'arrowDown':
    // 			return hitTestArrow(true, item.x, item.y, item.size, x, y);
    // 		case 'arrowUp':
    // 			return hitTestArrow(false, item.x, item.y, item.size, x, y);
    // 		case 'circle':
    // 			return hitTestCircle(item.x, item.y, item.size, x, y);
    // 		case 'square':
    // 			return hitTestSquare(item.x, item.y, item.size, x, y);
    // 	}
    // }

    /* eslint-disable complexity */
    // eslint-disable-next-line max-params
    function fillSizeAndY(rendererItem, marker, seriesData, offsets, textHeight, shapeMargin, priceScale, timeScale, firstValue) {
        var inBarPrice = isNumber(seriesData) ? seriesData : seriesData.close;
        var highPrice = isNumber(seriesData) ? seriesData : seriesData.high;
        var lowPrice = isNumber(seriesData) ? seriesData : seriesData.low;
        var sizeMultiplier = isNumber(marker.size) ? Math.max(marker.size, 0) : 1;
        var shapeSize = calculateShapeHeight(timeScale.barSpacing()) * sizeMultiplier;
        var halfSize = shapeSize / 2;
        rendererItem._internal_size = shapeSize;
        switch (marker.position) {
            case 'price': {
                var markerPrice = marker.price || inBarPrice;
                var anchor = marker.anchor || 'center';
                var displaceY = anchor === 'top' ? 1 : anchor === 'bottom' ? -1 : 0;
                var displaceX = anchor === 'left' ? 1 : anchor === 'right' ? -1 : 0;
                rendererItem._internal_y = (priceScale.priceToCoordinate(markerPrice, firstValue) + halfSize * displaceY);
                rendererItem.x = (rendererItem.x + halfSize * displaceX);
                if (rendererItem._internal_text !== undefined) {
                    rendererItem._internal_text._internal_y = (rendererItem._internal_y + (halfSize + shapeMargin + textHeight * (0.5 + 0.1 /* TextMargin */)) * displaceY ||
                        1);
                }
                return;
            }
            case 'inBar': {
                rendererItem._internal_y = priceScale.priceToCoordinate(inBarPrice, firstValue);
                if (rendererItem._internal_text !== undefined) {
                    rendererItem._internal_text._internal_y = (rendererItem._internal_y + halfSize + shapeMargin + textHeight * (0.5 + 0.1 /* TextMargin */));
                }
                return;
            }
            case 'aboveBar': {
                rendererItem._internal_y = (priceScale.priceToCoordinate(highPrice, firstValue) - halfSize - offsets._internal_aboveBar);
                if (rendererItem._internal_text !== undefined) {
                    rendererItem._internal_text._internal_y = (rendererItem._internal_y - halfSize - textHeight * (0.5 + 0.1 /* TextMargin */));
                    offsets._internal_aboveBar += textHeight * (1 + 2 * 0.1 /* TextMargin */);
                }
                offsets._internal_aboveBar += shapeSize + shapeMargin;
                return;
            }
            case 'belowBar': {
                rendererItem._internal_y = (priceScale.priceToCoordinate(lowPrice, firstValue) + halfSize + offsets._internal_belowBar);
                if (rendererItem._internal_text !== undefined) {
                    rendererItem._internal_text._internal_y = (rendererItem._internal_y + halfSize + shapeMargin + textHeight * (0.5 + 0.1 /* TextMargin */));
                    offsets._internal_belowBar += textHeight * (1 + 2 * 0.1 /* TextMargin */);
                }
                offsets._internal_belowBar += shapeSize + shapeMargin;
                return;
            }
        }
        ensureNever(marker.position);
    }
    var SeriesMarkersPaneView = /** @class */ (function () {
        function SeriesMarkersPaneView(series, model) {
            this._private__invalidated = true;
            this._private__dataInvalidated = true;
            this._private__autoScaleMarginsInvalidated = true;
            this._private__autoScaleMargins = null;
            this._private__renderer = new SeriesMarkersRenderer();
            this._private__series = series;
            this._private__model = model;
            this._private__data = {
                _internal_items: [],
                _internal_visibleRange: null,
            };
        }
        SeriesMarkersPaneView.prototype.update = function (updateType) {
            this._private__invalidated = true;
            this._private__autoScaleMarginsInvalidated = true;
            if (updateType === 'data') {
                this._private__dataInvalidated = true;
            }
        };
        SeriesMarkersPaneView.prototype.renderer = function (height, width, pane) {
            if (!this._private__series.visible()) {
                return null;
            }
            if (this._private__invalidated) {
                this._internal__makeValid();
            }
            var layout = this._private__model.options().layout;
            this._private__renderer._internal_setParams(layout.fontSize, layout.fontFamily);
            this._private__renderer._internal_setData(this._private__data);
            return this._private__renderer;
        };
        SeriesMarkersPaneView.prototype._internal_autoScaleMargins = function () {
            if (this._private__autoScaleMarginsInvalidated) {
                if (this._private__series.indexedMarkers().length > 0) {
                    var barSpacing = this._private__model.timeScale().barSpacing();
                    var shapeMargin$1 = shapeMargin(barSpacing);
                    var marginsAboveAndBelow = calculateShapeHeight(barSpacing) * 1.5 + shapeMargin$1 * 2;
                    this._private__autoScaleMargins = {
                        above: marginsAboveAndBelow,
                        below: marginsAboveAndBelow,
                    };
                }
                else {
                    this._private__autoScaleMargins = null;
                }
                this._private__autoScaleMarginsInvalidated = false;
            }
            return this._private__autoScaleMargins;
        };
        SeriesMarkersPaneView.prototype._internal__makeValid = function () {
            var priceScale = this._private__series.priceScale();
            var timeScale = this._private__model.timeScale();
            var seriesMarkers = this._private__series.indexedMarkers();
            if (this._private__dataInvalidated) {
                this._private__data._internal_items = seriesMarkers.map(function (marker) { return ({
                    time: marker.time,
                    x: 0,
                    _internal_y: 0,
                    _internal_size: 0,
                    _internal_stroke: marker.stroke,
                    _internal_shape: marker.shape,
                    _internal_anchor: marker.anchor,
                    _internal_color: marker.color,
                    _internal_rotation: marker.rotation,
                    _internal_internalId: marker.internalId,
                    _internal_externalId: marker.id,
                    _internal_text: undefined,
                }); });
                this._private__dataInvalidated = false;
            }
            var layoutOptions = this._private__model.options().layout;
            this._private__data._internal_visibleRange = null;
            var visibleBars = timeScale.visibleStrictRange();
            if (visibleBars === null) {
                return;
            }
            var firstValue = this._private__series.firstValue();
            if (firstValue === null) {
                return;
            }
            if (this._private__data._internal_items.length === 0) {
                return;
            }
            var prevTimeIndex = NaN;
            var shapeMargin$1 = shapeMargin(timeScale.barSpacing());
            var offsets = {
                _internal_aboveBar: shapeMargin$1,
                _internal_belowBar: shapeMargin$1,
            };
            this._private__data._internal_visibleRange = visibleTimedValues(this._private__data._internal_items, visibleBars, true);
            for (var index = this._private__data._internal_visibleRange.from; index < this._private__data._internal_visibleRange.to; index++) {
                var marker = seriesMarkers[index];
                if (marker.time !== prevTimeIndex) {
                    // new bar, reset stack counter
                    offsets._internal_aboveBar = shapeMargin$1;
                    offsets._internal_belowBar = shapeMargin$1;
                    prevTimeIndex = marker.time;
                }
                var rendererItem = this._private__data._internal_items[index];
                rendererItem.x = timeScale.indexToCoordinate(marker.time);
                if (marker.text !== undefined && marker.text.length > 0) {
                    rendererItem._internal_text = {
                        _internal_content: marker.text,
                        _internal_y: 0,
                        _internal_width: 0,
                        _internal_height: 0,
                    };
                }
                var dataAt = this._private__series.dataAt(marker.time);
                if (dataAt === null) {
                    continue;
                }
                fillSizeAndY(rendererItem, marker, dataAt, offsets, layoutOptions.fontSize, shapeMargin$1, priceScale, timeScale, firstValue.value);
            }
            this._private__invalidated = false;
        };
        return SeriesMarkersPaneView;
    }());

    var SeriesPriceLinePaneView = /** @class */ (function (_super) {
        __extends(SeriesPriceLinePaneView, _super);
        // eslint-disable-next-line no-useless-constructor
        function SeriesPriceLinePaneView(series) {
            return _super.call(this, series) || this;
        }
        SeriesPriceLinePaneView.prototype._internal__updateImpl = function (height, width) {
            var data = this._internal__lineRendererData;
            data._internal_visible = false;
            var seriesOptions = this._internal__series.options();
            if (!seriesOptions.priceLineVisible || !this._internal__series.visible()) {
                return;
            }
            var lastValueData = this._internal__series.lastValueData(seriesOptions.priceLineSource === 0 /* LastBar */);
            if (lastValueData.noData) {
                return;
            }
            data._internal_visible = true;
            data._internal_y = lastValueData.coordinate;
            data._internal_color = this._internal__series.priceLineColor(lastValueData.color);
            data._internal_width = width;
            data._internal_height = height;
            data._internal_lineWidth = seriesOptions.priceLineWidth;
            data._internal_lineStyle = seriesOptions.priceLineStyle;
        };
        return SeriesPriceLinePaneView;
    }(SeriesHorizontalLinePaneView));

    var SeriesPriceAxisLabelView = /** @class */ (function (_super) {
        __extends(SeriesPriceAxisLabelView, _super);
        function SeriesPriceAxisLabelView(source) {
            var _this = _super.call(this) || this;
            _this._private__source = source;
            return _this;
        }
        SeriesPriceAxisLabelView.prototype._internal__updateRendererData = function (axisRendererData, paneRendererData, commonRendererData) {
            axisRendererData._internal_visible = false;
            paneRendererData._internal_visible = false;
            var source = this._private__source;
            if (!source.visible()) {
                return;
            }
            var seriesOptions = source.options();
            var showSeriesLastValue = seriesOptions.lastValueVisible;
            var showSymbolLabel = source.title() !== '';
            var showPriceAndPercentage = seriesOptions.seriesLastValueMode === 0 /* LastPriceAndPercentageValue */;
            var lastValueData = source.lastValueData(false);
            if (lastValueData.noData) {
                return;
            }
            if (showSeriesLastValue) {
                axisRendererData._internal_text = this._internal__axisText(lastValueData, showSeriesLastValue, showPriceAndPercentage);
                axisRendererData._internal_visible = axisRendererData._internal_text.length !== 0;
            }
            if (showSymbolLabel || showPriceAndPercentage) {
                paneRendererData._internal_text = this._internal__paneText(lastValueData, showSeriesLastValue, showSymbolLabel, showPriceAndPercentage);
                paneRendererData._internal_visible = paneRendererData._internal_text.length > 0;
            }
            var lastValueColor = source.priceLineColor(lastValueData.color);
            var colors = generateContrastColors(lastValueColor);
            commonRendererData._internal_background = colors._internal_background;
            commonRendererData._internal_color = colors._internal_foreground;
            commonRendererData._internal_coordinate = lastValueData.coordinate;
            paneRendererData._internal_borderColor = source.model().backgroundColorAtYPercentFromTop(lastValueData.coordinate / source.priceScale().height());
            axisRendererData._internal_borderColor = lastValueColor;
        };
        SeriesPriceAxisLabelView.prototype._internal__paneText = function (lastValue, showSeriesLastValue, showSymbolLabel, showPriceAndPercentage) {
            var result = '';
            var title = this._private__source.title();
            if (showSymbolLabel && title.length !== 0) {
                result += "".concat(title, " ");
            }
            if (showSeriesLastValue && showPriceAndPercentage) {
                result += this._private__source.priceScale().isPercentage() ?
                    lastValue.formattedPriceAbsolute : lastValue.formattedPricePercentage;
            }
            return result.trim();
        };
        SeriesPriceAxisLabelView.prototype._internal__axisText = function (lastValueData, showSeriesLastValue, showPriceAndPercentage) {
            if (!showSeriesLastValue) {
                return '';
            }
            if (!showPriceAndPercentage) {
                return lastValueData.text;
            }
            return this._private__source.priceScale().isPercentage() ?
                lastValueData.formattedPricePercentage : lastValueData.formattedPriceAbsolute;
        };
        return SeriesPriceAxisLabelView;
    }(PriceAxisLabelView));

    var AutoscaleInfoImpl = /** @class */ (function () {
        function AutoscaleInfoImpl(priceRange, margins) {
            this._private__priceRange = priceRange;
            this._private__margins = margins || null;
        }
        AutoscaleInfoImpl.prototype.priceRange = function () {
            return this._private__priceRange;
        };
        AutoscaleInfoImpl.prototype.margins = function () {
            return this._private__margins;
        };
        AutoscaleInfoImpl.prototype.toRaw = function () {
            if (this._private__priceRange === null) {
                return null;
            }
            return {
                priceRange: this._private__priceRange.toRaw(),
                margins: this._private__margins || undefined,
            };
        };
        AutoscaleInfoImpl.fromRaw = function (raw) {
            return (raw === null) ? null : new AutoscaleInfoImpl(PriceRangeImpl.fromRaw(raw.priceRange), raw.margins);
        };
        return AutoscaleInfoImpl;
    }());

    var CustomPriceLinePaneView = /** @class */ (function (_super) {
        __extends(CustomPriceLinePaneView, _super);
        function CustomPriceLinePaneView(series, priceLine) {
            var _this = _super.call(this, series) || this;
            _this._private__priceLine = priceLine;
            return _this;
        }
        CustomPriceLinePaneView.prototype._internal__updateImpl = function (height, width) {
            var lineOptions = this._private__priceLine.options();
            var data = this._internal__lineRendererData;
            data._internal_visible = false;
            if (!this._internal__series.visible() || (!lineOptions.visible || !lineOptions.lineVisible)) {
                return;
            }
            var y = this._private__priceLine.yCoord();
            if (y === null) {
                return;
            }
            var x;
            if (lineOptions.index !== undefined) {
                x = this._internal__model.timeScale().indexToCoordinate(lineOptions.index);
            }
            data._internal_visible = true;
            data._internal_y = y;
            data._internal_x = x;
            data._internal_color = lineOptions.color;
            data._internal_width = width;
            data._internal_height = height;
            data._internal_lineWidth = lineOptions.lineWidth;
            data._internal_lineStyle = lineOptions.lineStyle;
        };
        return CustomPriceLinePaneView;
    }(SeriesHorizontalLinePaneView));

    var CustomPriceLinePriceAxisLabelView = /** @class */ (function (_super) {
        __extends(CustomPriceLinePriceAxisLabelView, _super);
        function CustomPriceLinePriceAxisLabelView(series, priceLine) {
            var _this = _super.call(this) || this;
            _this._private__series = series;
            _this._private__priceLine = priceLine;
            return _this;
        }
        CustomPriceLinePriceAxisLabelView.prototype._internal__updateRendererData = function (axisRendererData, paneRendererData, commonData) {
            axisRendererData._internal_visible = false;
            paneRendererData._internal_visible = false;
            var options = this._private__priceLine.options();
            var labelVisible = options.axisLabelVisible;
            var showPaneLabel = options.title !== '';
            var series = this._private__series;
            if (!labelVisible || !options.visible || !series.visible()) {
                return;
            }
            var y = this._private__priceLine.yCoord();
            if (y === null) {
                return;
            }
            if (showPaneLabel) {
                paneRendererData._internal_text = options.title;
                paneRendererData._internal_visible = true;
            }
            paneRendererData._internal_borderColor = series.model().backgroundColorAtYPercentFromTop(y / series.priceScale().height());
            axisRendererData._internal_text = series.priceScale().formatPriceAbsolute(options.price);
            axisRendererData._internal_visible = true;
            var colors = generateContrastColors(options.color);
            commonData._internal_background = colors._internal_background;
            commonData._internal_color = colors._internal_foreground;
            commonData._internal_coordinate = y;
        };
        return CustomPriceLinePriceAxisLabelView;
    }(PriceAxisLabelView));

    var CustomPriceLine = /** @class */ (function () {
        function CustomPriceLine(series, options) {
            this._private__series = series;
            this._private__options = options;
            this._private__priceLineView = new CustomPriceLinePaneView(series, this);
            this._private__priceAxisView = new CustomPriceLinePriceAxisLabelView(series, this);
            this._private__panePriceAxisView = new PanePriceAxisLabelView(this._private__priceAxisView, series, series.model());
        }
        CustomPriceLine.prototype.applyOptions = function (options) {
            merge(this._private__options, options);
            this.update();
            this._private__series.model().lightUpdate();
        };
        CustomPriceLine.prototype.options = function () {
            return this._private__options;
        };
        CustomPriceLine.prototype.paneViews = function () {
            return [
                this._private__priceLineView,
                this._private__panePriceAxisView,
            ];
        };
        CustomPriceLine.prototype.priceAxisView = function () {
            return this._private__priceAxisView;
        };
        CustomPriceLine.prototype.update = function () {
            this._private__priceLineView._internal_update();
            this._private__priceAxisView.update();
        };
        CustomPriceLine.prototype.yCoord = function () {
            var series = this._private__series;
            var priceScale = series.priceScale();
            var timeScale = series.model().timeScale();
            if (timeScale.isEmpty() || priceScale.isEmpty()) {
                return null;
            }
            var firstValue = series.firstValue();
            if (firstValue === null) {
                return null;
            }
            return priceScale.priceToCoordinate(this._private__options.price, firstValue.value);
        };
        return CustomPriceLine;
    }());

    var PriceDataSource = /** @class */ (function (_super) {
        __extends(PriceDataSource, _super);
        function PriceDataSource(model) {
            var _this = _super.call(this) || this;
            _this._private__model = model;
            return _this;
        }
        PriceDataSource.prototype.model = function () {
            return this._private__model;
        };
        return PriceDataSource;
    }(DataSource));

    var emptyResult = {
        barColor: '',
        barBorderColor: '',
        barWickColor: '',
    };
    var SeriesBarColorer = /** @class */ (function () {
        function SeriesBarColorer(series) {
            this._private__series = series;
        }
        SeriesBarColorer.prototype.barStyle = function (barIndex, precomputedBars) {
            // precomputedBars: {value: [Array BarValues], previousValue: [Array BarValues] | undefined}
            // Used to avoid binary search if bars are already known
            var targetType = this._private__series.seriesType();
            var seriesOptions = this._private__series.options();
            switch (targetType) {
                case 'Line':
                    return this._private__lineStyle(seriesOptions, barIndex, precomputedBars);
                case 'Area':
                    return this._private__areaStyle(seriesOptions);
                case 'CloudArea':
                    return this._private__cloudAreaStyle(seriesOptions);
                case 'BrokenArea':
                    return this._private__brokenAreaStyle(seriesOptions);
                case 'Baseline':
                    return this._private__baselineStyle(seriesOptions, barIndex, precomputedBars);
                case 'Bar':
                    return this._private__barStyle(seriesOptions, barIndex, precomputedBars);
                case 'Candlestick':
                    return this._private__candleStyle(seriesOptions, barIndex, precomputedBars);
                case 'Histogram':
                    return this._private__histogramStyle(seriesOptions, barIndex, precomputedBars);
            }
            throw new Error('Unknown chart style');
        };
        SeriesBarColorer.prototype._private__barStyle = function (barStyle, barIndex, precomputedBars) {
            var result = __assign({}, emptyResult);
            var upColor = barStyle.upColor;
            var downColor = barStyle.downColor;
            var borderUpColor = upColor;
            var borderDownColor = downColor;
            var currentBar = ensureNotNull(this._private__findBar(barIndex, precomputedBars));
            var isUp = ensure(currentBar.value[0 /* Open */]) <= ensure(currentBar.value[3 /* Close */]);
            if (currentBar.color !== undefined) {
                result.barColor = currentBar.color;
                result.barBorderColor = currentBar.color;
            }
            else {
                result.barColor = isUp ? upColor : downColor;
                result.barBorderColor = isUp ? borderUpColor : borderDownColor;
            }
            return result;
        };
        SeriesBarColorer.prototype._private__candleStyle = function (candlestickStyle, barIndex, precomputedBars) {
            var _a, _b, _c;
            var result = __assign({}, emptyResult);
            var upColor = candlestickStyle.upColor;
            var downColor = candlestickStyle.downColor;
            var borderUpColor = candlestickStyle.borderUpColor;
            var borderDownColor = candlestickStyle.borderDownColor;
            var wickUpColor = candlestickStyle.wickUpColor;
            var wickDownColor = candlestickStyle.wickDownColor;
            var currentBar = ensureNotNull(this._private__findBar(barIndex, precomputedBars));
            var isUp = ensure(currentBar.value[0 /* Open */]) <= ensure(currentBar.value[3 /* Close */]);
            result.barColor = (_a = currentBar.color) !== null && _a !== void 0 ? _a : (isUp ? upColor : downColor);
            result.barBorderColor = (_b = currentBar.borderColor) !== null && _b !== void 0 ? _b : (isUp ? borderUpColor : borderDownColor);
            result.barWickColor = (_c = currentBar.wickColor) !== null && _c !== void 0 ? _c : (isUp ? wickUpColor : wickDownColor);
            return result;
        };
        SeriesBarColorer.prototype._private__areaStyle = function (areaStyle) {
            return __assign(__assign({}, emptyResult), { barColor: areaStyle.lineColor });
        };
        SeriesBarColorer.prototype._private__baselineStyle = function (baselineStyle, barIndex, precomputedBars) {
            var currentBar = ensureNotNull(this._private__findBar(barIndex, precomputedBars));
            var isAboveBaseline = currentBar.value[3 /* Close */] >= baselineStyle.baseValue.price;
            return __assign(__assign({}, emptyResult), { barColor: isAboveBaseline ? baselineStyle.topLineColor : baselineStyle.bottomLineColor });
        };
        SeriesBarColorer.prototype._private__cloudAreaStyle = function (cloudAreaStyle) {
            return __assign(__assign({}, emptyResult), { barColor: cloudAreaStyle.higherLineColor });
        };
        SeriesBarColorer.prototype._private__brokenAreaStyle = function (brokenAreaStyle) {
            return __assign(__assign({}, emptyResult), { barColor: brokenAreaStyle.color });
        };
        SeriesBarColorer.prototype._private__lineStyle = function (lineStyle, barIndex, precomputedBars) {
            var _a;
            var currentBar = ensureNotNull(this._private__findBar(barIndex, precomputedBars));
            return __assign(__assign({}, emptyResult), { barColor: (_a = currentBar.color) !== null && _a !== void 0 ? _a : lineStyle.color });
        };
        SeriesBarColorer.prototype._private__histogramStyle = function (histogramStyle, barIndex, precomputedBars) {
            var result = __assign({}, emptyResult);
            var currentBar = ensureNotNull(this._private__findBar(barIndex, precomputedBars));
            result.barColor = currentBar.color !== undefined ? currentBar.color : histogramStyle.color;
            return result;
        };
        SeriesBarColorer.prototype._private__findBar = function (barIndex, precomputedBars) {
            if (precomputedBars !== undefined) {
                return precomputedBars.value;
            }
            return this._private__series.bars().valueAt(barIndex);
        };
        return SeriesBarColorer;
    }());

    // TODO: think about changing it dynamically
    var CHUNK_SIZE = 30;
    /**
     * PlotList is an array of plot rows
     * each plot row consists of key (index in timescale) and plot value map
     */
    var PlotList = /** @class */ (function () {
        function PlotList() {
            this._private__items = [];
            this._private__minMaxCache = new Map();
            this._private__rowSearchCache = new Map();
        }
        // @returns Last row
        PlotList.prototype.last = function () {
            return this.size() > 0 ? this._private__items[this._private__items.length - 1] : null;
        };
        PlotList.prototype.firstIndex = function () {
            return this.size() > 0 ? this._private__indexAt(0) : null;
        };
        PlotList.prototype.lastIndex = function () {
            return this.size() > 0 ? this._private__indexAt((this._private__items.length - 1)) : null;
        };
        PlotList.prototype.size = function () {
            return this._private__items.length;
        };
        PlotList.prototype.isEmpty = function () {
            return this.size() === 0;
        };
        PlotList.prototype.contains = function (index) {
            return this._private__search(index, 0 /* Exact */) !== null;
        };
        PlotList.prototype.valueAt = function (index) {
            return this.search(index);
        };
        PlotList.prototype.search = function (index, searchMode) {
            if (searchMode === void 0) { searchMode = 0 /* Exact */; }
            var pos = this._private__search(index, searchMode);
            if (pos === null) {
                return null;
            }
            return __assign(__assign({}, this._private__valueAt(pos)), { index: this._private__indexAt(pos) });
        };
        PlotList.prototype.rows = function () {
            return this._private__items;
        };
        PlotList.prototype.minMaxOnRangeCached = function (start, end, plots) {
            // this code works for single series only
            // could fail after whitespaces implementation
            if (this.isEmpty()) {
                return null;
            }
            var result = null;
            for (var _i = 0, plots_1 = plots; _i < plots_1.length; _i++) {
                var plot = plots_1[_i];
                var plotMinMax = this._private__minMaxOnRangeCachedImpl(start, end, plot);
                result = mergeMinMax(result, plotMinMax);
            }
            return result;
        };
        PlotList.prototype.setData = function (plotRows) {
            this._private__rowSearchCache.clear();
            this._private__minMaxCache.clear();
            this._private__items = plotRows;
        };
        PlotList.prototype._private__indexAt = function (offset) {
            return this._private__items[offset].index;
        };
        PlotList.prototype._private__valueAt = function (offset) {
            return this._private__items[offset];
        };
        PlotList.prototype._private__search = function (index, searchMode) {
            var exactPos = this._private__bsearch(index);
            if (exactPos === null && searchMode !== 0 /* Exact */) {
                switch (searchMode) {
                    case -1 /* NearestLeft */:
                        return this._private__searchNearestLeft(index);
                    case 1 /* NearestRight */:
                        return this._private__searchNearestRight(index);
                    default:
                        throw new TypeError('Unknown search mode');
                }
            }
            return exactPos;
        };
        PlotList.prototype._private__searchNearestLeft = function (index) {
            var nearestLeftPos = this._private__lowerbound(index);
            if (nearestLeftPos > 0) {
                nearestLeftPos = nearestLeftPos - 1;
            }
            return (nearestLeftPos !== this._private__items.length && this._private__indexAt(nearestLeftPos) < index) ? nearestLeftPos : null;
        };
        PlotList.prototype._private__searchNearestRight = function (index) {
            var nearestRightPos = this._private__upperbound(index);
            return (nearestRightPos !== this._private__items.length && index < this._private__indexAt(nearestRightPos)) ? nearestRightPos : null;
        };
        PlotList.prototype._private__bsearch = function (index) {
            var start = this._private__lowerbound(index);
            if (start !== this._private__items.length && !(index < this._private__items[start].index)) {
                return start;
            }
            return null;
        };
        PlotList.prototype._private__lowerbound = function (index) {
            return lowerbound(this._private__items, index, function (a, b) { return a.index < b; });
        };
        PlotList.prototype._private__upperbound = function (index) {
            return upperbound(this._private__items, index, function (a, b) { return b.index > a; });
        };
        PlotList.prototype._private__plotMinMax = function (startIndex, endIndexExclusive, plotIndex) {
            var result = null;
            for (var i = startIndex; i < endIndexExclusive; i++) {
                var values = this._private__items[i].value;
                var v = values[plotIndex];
                if (Number.isNaN(v)) {
                    continue;
                }
                if (result === null) {
                    result = { min: v, max: v };
                }
                else {
                    if (v < result.min) {
                        result.min = v;
                    }
                    if (v > result.max) {
                        result.max = v;
                    }
                }
            }
            return result;
        };
        PlotList.prototype._private__minMaxOnRangeCachedImpl = function (start, end, plotIndex) {
            // this code works for single series only
            // could fail after whitespaces implementation
            if (this.isEmpty()) {
                return null;
            }
            var result = null;
            // assume that bar indexes only increase
            var firstIndex = ensureNotNull(this.firstIndex());
            var lastIndex = ensureNotNull(this.lastIndex());
            var s = Math.max(start, firstIndex);
            var e = Math.min(end, lastIndex);
            var cachedLow = Math.ceil(s / CHUNK_SIZE) * CHUNK_SIZE;
            var cachedHigh = Math.max(cachedLow, Math.floor(e / CHUNK_SIZE) * CHUNK_SIZE);
            {
                var startIndex = this._private__lowerbound(s);
                var endIndex = this._private__upperbound(Math.min(e, cachedLow, end)); // non-inclusive end
                var plotMinMax = this._private__plotMinMax(startIndex, endIndex, plotIndex);
                result = mergeMinMax(result, plotMinMax);
            }
            var minMaxCache = this._private__minMaxCache.get(plotIndex);
            if (minMaxCache === undefined) {
                minMaxCache = new Map();
                this._private__minMaxCache.set(plotIndex, minMaxCache);
            }
            // now go cached
            for (var c = Math.max(cachedLow + 1, s); c < cachedHigh; c += CHUNK_SIZE) {
                var chunkIndex = Math.floor(c / CHUNK_SIZE);
                var chunkMinMax = minMaxCache.get(chunkIndex);
                if (chunkMinMax === undefined) {
                    var chunkStart = this._private__lowerbound(chunkIndex * CHUNK_SIZE);
                    var chunkEnd = this._private__upperbound((chunkIndex + 1) * CHUNK_SIZE - 1);
                    chunkMinMax = this._private__plotMinMax(chunkStart, chunkEnd, plotIndex);
                    minMaxCache.set(chunkIndex, chunkMinMax);
                }
                result = mergeMinMax(result, chunkMinMax);
            }
            // tail
            {
                var startIndex = this._private__lowerbound(cachedHigh);
                var endIndex = this._private__upperbound(e); // non-inclusive end
                var plotMinMax = this._private__plotMinMax(startIndex, endIndex, plotIndex);
                result = mergeMinMax(result, plotMinMax);
            }
            return result;
        };
        return PlotList;
    }());
    function mergeMinMax(first, second) {
        if (first === null) {
            return second;
        }
        else {
            if (second === null) {
                return first;
            }
            else {
                // merge MinMax values
                var min = Math.min(first.min, second.min);
                var max = Math.max(first.max, second.max);
                return { min: min, max: max };
            }
        }
    }

    function createSeriesPlotList() {
        return new PlotList();
    }

    var Series = /** @class */ (function (_super) {
        __extends(Series, _super);
        function Series(model, options, seriesType) {
            var _this = _super.call(this, model) || this;
            _this._private__data = createSeriesPlotList();
            _this._private__priceLineView = new SeriesPriceLinePaneView(_this);
            _this._private__customPriceLines = [];
            _this._private__baseHorizontalLineView = new SeriesHorizontalBaseLinePaneView(_this);
            _this._private__lastPriceAnimationPaneView = null;
            _this._private__barColorerCache = null;
            _this._private__markers = [];
            _this._private__indexedMarkers = [];
            _this._private__animationTimeoutId = null;
            _this._private__options = options;
            _this._private__seriesType = seriesType;
            var priceAxisView = new SeriesPriceAxisLabelView(_this);
            _this._private__priceAxisViews = [priceAxisView];
            _this._private__panePriceAxisLabelView = new PanePriceAxisLabelView(priceAxisView, _this, model);
            if (seriesType === 'Area' || seriesType === 'Line' || seriesType === 'Baseline') {
                _this._private__lastPriceAnimationPaneView = new SeriesLastPriceAnimationPaneView(_this);
            }
            _this._private__recreateFormatter();
            _this._private__recreatePaneViews();
            return _this;
        }
        Series.prototype.destroy = function () {
            if (this._private__animationTimeoutId !== null) {
                clearTimeout(this._private__animationTimeoutId);
            }
        };
        Series.prototype.priceLineColor = function (lastBarColor) {
            return this._private__options.priceLineColor || lastBarColor;
        };
        Series.prototype.lastValueData = function (globalLast) {
            var noDataRes = { noData: true };
            var priceScale = this.priceScale();
            if (this.model().timeScale().isEmpty() || priceScale.isEmpty() || this._private__data.isEmpty()) {
                return noDataRes;
            }
            var visibleBars = this.model().timeScale().visibleStrictRange();
            var firstValue = this.firstValue();
            if (visibleBars === null || firstValue === null) {
                return noDataRes;
            }
            // find range of bars inside range
            // TODO: make it more optimal
            var bar;
            var lastIndex;
            if (globalLast) {
                var lastBar = this._private__data.last();
                if (lastBar === null) {
                    return noDataRes;
                }
                bar = lastBar;
                lastIndex = lastBar.index;
            }
            else {
                var endBar = this._private__data.search(visibleBars.right(), -1 /* NearestLeft */);
                if (endBar === null) {
                    return noDataRes;
                }
                bar = this._private__data.valueAt(endBar.index);
                if (bar === null) {
                    return noDataRes;
                }
                lastIndex = endBar.index;
            }
            var price = bar.value[3 /* Close */];
            var barColorer = this.barColorer();
            var style = barColorer.barStyle(lastIndex, { value: bar });
            var coordinate = priceScale.priceToCoordinate(price, firstValue.value);
            return {
                noData: false,
                price: price,
                text: priceScale.formatPrice(price, firstValue.value),
                formattedPriceAbsolute: priceScale.formatPriceAbsolute(price),
                formattedPricePercentage: priceScale.formatPricePercentage(price, firstValue.value),
                color: style.barColor,
                coordinate: coordinate,
                index: lastIndex,
            };
        };
        Series.prototype.barColorer = function () {
            if (this._private__barColorerCache !== null) {
                return this._private__barColorerCache;
            }
            this._private__barColorerCache = new SeriesBarColorer(this);
            return this._private__barColorerCache;
        };
        Series.prototype.options = function () {
            return this._private__options;
        };
        Series.prototype.applyOptions = function (options) {
            var _a;
            var targetPriceScaleId = options.priceScaleId;
            if (targetPriceScaleId !== undefined && targetPriceScaleId !== this._private__options.priceScaleId) {
                // series cannot do it itself, ask model
                this.model().moveSeriesToScale(this, targetPriceScaleId);
            }
            var previousPaneIndex = (_a = this._private__options.pane) !== null && _a !== void 0 ? _a : 0;
            merge(this._private__options, options);
            // eslint-disable-next-line deprecation/deprecation
            if (this._priceScale !== null && options.scaleMargins !== undefined) {
                this._priceScale.applyOptions({
                    // eslint-disable-next-line deprecation/deprecation
                    scaleMargins: options.scaleMargins,
                });
            }
            if (options.priceFormat !== undefined) {
                this._private__recreateFormatter();
                // updated formatter might affect rendering  and as a consequence of this the width of price axis might be changed
                // thus we need to force the chart to do a full update to apply changes correctly
                // full update is quite heavy operation in terms of performance
                // but updating formatter looks like quite rare so forcing a full update here shouldn't affect the performance a lot
                this.model().fullUpdate();
            }
            if (options.pane && previousPaneIndex !== options.pane) {
                this.model().moveSeriesToPane(this, previousPaneIndex, options.pane);
            }
            this.model().updateSource(this);
            // a series might affect crosshair by some options (like crosshair markers)
            // that's why we need to update crosshair as well
            this.model().updateCrosshair();
            this._private__paneView.update('options');
        };
        Series.prototype.setData = function (data, updateInfo) {
            this._private__data.setData(data);
            this._private__recalculateMarkers();
            this._private__paneView.update('data');
            this._private__markersPaneView.update('data');
            if (this._private__lastPriceAnimationPaneView !== null) {
                if (updateInfo && updateInfo.lastBarUpdatedOrNewBarsAddedToTheRight) {
                    this._private__lastPriceAnimationPaneView._internal_onNewRealtimeDataReceived();
                }
                else if (data.length === 0) {
                    this._private__lastPriceAnimationPaneView._internal_onDataCleared();
                }
            }
            var sourcePane = this.model().paneForSource(this);
            this.model().recalculatePane(sourcePane);
            this.model().updateSource(this);
            this.model().updateCrosshair();
            this.model().lightUpdate();
        };
        Series.prototype.setMarkers = function (data) {
            this._private__markers = data.map(function (item) { return (__assign({}, item)); });
            this._private__recalculateMarkers();
            var sourcePane = this.model().paneForSource(this);
            this._private__markersPaneView.update('data');
            this.model().recalculatePane(sourcePane);
            this.model().updateSource(this);
            this.model().updateCrosshair();
            this.model().lightUpdate();
        };
        Series.prototype.indexedMarkers = function () {
            return this._private__indexedMarkers;
        };
        Series.prototype.createPriceLine = function (options) {
            var result = new CustomPriceLine(this, options);
            this._private__customPriceLines.push(result);
            this.model().updateSource(this);
            return result;
        };
        Series.prototype.removePriceLine = function (line) {
            var index = this._private__customPriceLines.indexOf(line);
            if (index !== -1) {
                this._private__customPriceLines.splice(index, 1);
            }
            this.model().updateSource(this);
        };
        Series.prototype.getPriceLine = function (cursorPrice, cursorIndex) {
            var priceScale = this.priceScale();
            var priceRange = priceScale.priceRange();
            if (priceScale.isLog()) {
                priceRange = convertPriceRangeFromLog(priceRange, priceScale.logFormula());
            }
            var magnetPercent = 0.0001;
            if (priceRange) {
                var lookAroundPercent = 16 / priceScale.height();
                var percentRange = Math.abs(priceRange.length()) / cursorPrice;
                magnetPercent = lookAroundPercent * percentRange;
            }
            for (var i = 0; i < this._private__customPriceLines.length; i++) {
                var customPriceLine = this._private__customPriceLines[i];
                var _a = this._private__customPriceLines[i].options(), price = _a.price, index = _a.index;
                if ((typeof cursorIndex === 'undefined' || typeof index === 'undefined' || cursorIndex >= index) && Math.abs(Math.abs(price - cursorPrice) / cursorPrice) < Math.abs(magnetPercent)) {
                    return customPriceLine;
                }
            }
            return null;
        };
        Series.prototype.removeAllPriceLines = function () {
            this._private__customPriceLines.splice(0, this._private__customPriceLines.length);
        };
        Series.prototype.seriesType = function () {
            return this._private__seriesType;
        };
        Series.prototype.firstValue = function () {
            var bar = this.firstBar();
            if (bar === null) {
                return null;
            }
            return {
                value: bar.value[3 /* Close */],
                timePoint: bar.time,
            };
        };
        Series.prototype.firstBar = function () {
            var visibleBars = this.model().timeScale().visibleStrictRange();
            if (visibleBars === null) {
                return null;
            }
            var startTimePoint = visibleBars.left();
            return this._private__data.search(startTimePoint, 1 /* NearestRight */);
        };
        Series.prototype.bars = function () {
            return this._private__data;
        };
        Series.prototype.dataAt = function (time) {
            var prices = this._private__data.valueAt(time);
            if (prices === null) {
                return null;
            }
            if (this._private__seriesType === 'Bar' || this._private__seriesType === 'Candlestick') {
                return {
                    open: prices.value[0 /* Open */],
                    high: prices.value[1 /* High */],
                    low: prices.value[2 /* Low */],
                    close: prices.value[3 /* Close */],
                };
            }
            else {
                return prices.value[3 /* Close */];
            }
        };
        Series.prototype.topPaneViews = function (pane) {
            var _this = this;
            var animationPaneView = this._private__lastPriceAnimationPaneView;
            if (animationPaneView === null || !animationPaneView._internal_visible()) {
                return [];
            }
            if (this._private__animationTimeoutId === null && animationPaneView._internal_animationActive()) {
                this._private__animationTimeoutId = setTimeout(function () {
                    _this._private__animationTimeoutId = null;
                    _this.model().cursorUpdate();
                    // eslint-disable-next-line @typescript-eslint/tslint/config
                }, 0);
            }
            animationPaneView._internal_invalidateStage();
            return [animationPaneView];
        };
        Series.prototype.paneViews = function () {
            var res = [];
            if (!this._private__isOverlay()) {
                res.push(this._private__baseHorizontalLineView);
            }
            for (var _i = 0, _a = this._private__customPriceLines; _i < _a.length; _i++) {
                var customPriceLine = _a[_i];
                res.push.apply(res, customPriceLine.paneViews());
            }
            res.push(this._private__paneView, this._private__priceLineView, this._private__panePriceAxisLabelView, this._private__markersPaneView);
            return res;
        };
        Series.prototype.priceAxisViews = function (pane, priceScale) {
            if (priceScale !== this._priceScale && !this._private__isOverlay()) {
                return [];
            }
            var result = __spreadArray([], this._private__priceAxisViews, true);
            for (var _i = 0, _a = this._private__customPriceLines; _i < _a.length; _i++) {
                var customPriceLine = _a[_i];
                result.push(customPriceLine.priceAxisView());
            }
            return result;
        };
        Series.prototype.autoscaleInfo = function (startTimePoint, endTimePoint) {
            var _this = this;
            if (this._private__options.autoscaleInfoProvider !== undefined) {
                var autoscaleInfo = this._private__options.autoscaleInfoProvider(function () {
                    var res = _this._private__autoscaleInfoImpl(startTimePoint, endTimePoint);
                    return res === null ? null : res.toRaw();
                });
                return AutoscaleInfoImpl.fromRaw(autoscaleInfo);
            }
            return this._private__autoscaleInfoImpl(startTimePoint, endTimePoint);
        };
        Series.prototype.minMove = function () {
            return this._private__options.priceFormat.minMove;
        };
        Series.prototype.formatter = function () {
            return this._private__formatter;
        };
        Series.prototype.updateAllViews = function () {
            var _a;
            this._private__paneView.update();
            this._private__markersPaneView.update();
            for (var _i = 0, _b = this._private__priceAxisViews; _i < _b.length; _i++) {
                var priceAxisView = _b[_i];
                priceAxisView.update();
            }
            for (var _c = 0, _d = this._private__customPriceLines; _c < _d.length; _c++) {
                var customPriceLine = _d[_c];
                customPriceLine.update();
            }
            this._private__priceLineView._internal_update();
            this._private__baseHorizontalLineView._internal_update();
            (_a = this._private__lastPriceAnimationPaneView) === null || _a === void 0 ? void 0 : _a.update();
        };
        Series.prototype.priceScale = function () {
            return ensureNotNull(_super.prototype.priceScale.call(this));
        };
        Series.prototype.markerDataAtIndex = function (index) {
            var getValue = (this._private__seriesType === 'Line' || this._private__seriesType === 'Area' || this._private__seriesType === 'Baseline') &&
                this._private__options.crosshairMarkerVisible;
            if (!getValue) {
                return null;
            }
            var bar = this._private__data.valueAt(index);
            if (bar === null) {
                return null;
            }
            var price = bar.value[3 /* Close */];
            var radius = this._private__markerRadius();
            var borderColor = this._private__markerBorderColor();
            var backgroundColor = this._private__markerBackgroundColor(index);
            return { price: price, radius: radius, borderColor: borderColor, backgroundColor: backgroundColor };
        };
        Series.prototype.title = function () {
            return this._private__options.title;
        };
        Series.prototype.visible = function () {
            return this._private__options.visible;
        };
        Series.prototype.setExtensionsBoundaries = function (extensionsBoundaries) {
            this._private__paneView._internal_setExtensionsBoundaries(extensionsBoundaries);
        };
        Series.prototype._private__isOverlay = function () {
            var priceScale = this.priceScale();
            return !isDefaultPriceScale(priceScale.id());
        };
        Series.prototype._private__autoscaleInfoImpl = function (startTimePoint, endTimePoint) {
            if (!isInteger(startTimePoint) || !isInteger(endTimePoint) || this._private__data.isEmpty()) {
                return null;
            }
            // TODO: refactor this
            // series data is strongly hardcoded to keep bars
            var plots = this._private__seriesType === 'Line' || this._private__seriesType === 'Area' || this._private__seriesType === 'Baseline' || this._private__seriesType === 'Histogram'
                ? [3 /* Close */]
                : [2 /* Low */, 1 /* High */];
            var barsMinMax = this._private__data.minMaxOnRangeCached(startTimePoint, endTimePoint, plots);
            var range = barsMinMax !== null ? new PriceRangeImpl(barsMinMax.min, barsMinMax.max) : null;
            if (this.seriesType() === 'Histogram') {
                var base = this._private__options.base;
                var rangeWithBase = new PriceRangeImpl(base, base);
                range = range !== null ? range.merge(rangeWithBase) : rangeWithBase;
            }
            return new AutoscaleInfoImpl(range, this._private__markersPaneView._internal_autoScaleMargins());
        };
        Series.prototype._private__markerRadius = function () {
            switch (this._private__seriesType) {
                case 'Line':
                case 'Area':
                case 'Baseline':
                    return this._private__options.crosshairMarkerRadius;
            }
            return 0;
        };
        Series.prototype._private__markerBorderColor = function () {
            switch (this._private__seriesType) {
                case 'Line':
                case 'Area':
                case 'Baseline': {
                    var crosshairMarkerBorderColor = this._private__options
                        .crosshairMarkerBorderColor;
                    if (crosshairMarkerBorderColor.length !== 0) {
                        return crosshairMarkerBorderColor;
                    }
                }
            }
            return null;
        };
        Series.prototype._private__markerBackgroundColor = function (index) {
            switch (this._private__seriesType) {
                case 'Line':
                case 'Area':
                case 'Baseline': {
                    var crosshairMarkerBackgroundColor = this._private__options
                        .crosshairMarkerBackgroundColor;
                    if (crosshairMarkerBackgroundColor.length !== 0) {
                        return crosshairMarkerBackgroundColor;
                    }
                }
            }
            return this.barColorer().barStyle(index).barColor;
        };
        Series.prototype._private__recreateFormatter = function () {
            switch (this._private__options.priceFormat.type) {
                case 'custom': {
                    this._private__formatter = { format: this._private__options.priceFormat.formatter };
                    break;
                }
                case 'volume': {
                    this._private__formatter = new VolumeFormatter(this._private__options.priceFormat.precision);
                    break;
                }
                case 'percent': {
                    this._private__formatter = new PercentageFormatter(this._private__options.priceFormat.precision);
                    break;
                }
                default: {
                    var priceScale = Math.pow(10, this._private__options.priceFormat.precision);
                    this._private__formatter = new PriceFormatter(priceScale, this._private__options.priceFormat.minMove * priceScale);
                }
            }
            if (this._priceScale !== null) {
                this._priceScale.updateFormatter();
            }
        };
        Series.prototype._private__recalculateMarkers = function () {
            var _this = this;
            var timeScale = this.model().timeScale();
            if (timeScale.isEmpty() || this._private__data.size() === 0) {
                this._private__indexedMarkers = [];
                return;
            }
            var firstDataIndex = ensureNotNull(this._private__data.firstIndex());
            this._private__indexedMarkers = this._private__markers.map(function (marker, index) {
                // the first find index on the time scale (across all series)
                var timePointIndex = ensureNotNull(timeScale.timeToIndex(marker.time, true));
                // and then search that index inside the series data
                var searchMode = timePointIndex < firstDataIndex ? 1 /* NearestRight */ : -1 /* NearestLeft */;
                var seriesDataIndex = ensureNotNull(_this._private__data.search(timePointIndex, searchMode)).index;
                return {
                    time: seriesDataIndex,
                    position: marker.position,
                    rotation: marker.rotation,
                    shape: marker.shape,
                    color: marker.color,
                    stroke: marker.stroke,
                    anchor: marker.anchor,
                    price: marker.price,
                    id: marker.id,
                    internalId: index,
                    text: marker.text,
                    size: marker.size,
                };
            });
        };
        Series.prototype._private__recreatePaneViews = function () {
            this._private__markersPaneView = new SeriesMarkersPaneView(this, this.model());
            switch (this._private__seriesType) {
                case 'Bar': {
                    this._private__paneView = new SeriesBarsPaneView(this, this.model());
                    break;
                }
                case 'Candlestick': {
                    this._private__paneView = new SeriesCandlesticksPaneView(this, this.model());
                    break;
                }
                case 'Line': {
                    this._private__paneView = new SeriesLinePaneView(this, this.model());
                    break;
                }
                case 'Area': {
                    this._private__paneView = new SeriesAreaPaneView(this, this.model());
                    break;
                }
                case 'CloudArea': {
                    this._private__paneView = new SeriesCloudAreaPaneView(this, this.model());
                    break;
                }
                case 'BrokenArea': {
                    this._private__paneView = new SeriesBrokenAreaPaneView(this, this.model());
                    break;
                }
                case 'Baseline': {
                    this._private__paneView = new SeriesBaselinePaneView(this, this.model());
                    break;
                }
                case 'Histogram': {
                    this._private__paneView = new SeriesHistogramPaneView(this, this.model());
                    break;
                }
                default:
                    throw Error('Unknown chart style assigned: ' + this._private__seriesType);
            }
        };
        return Series;
    }(PriceDataSource));

    var Magnet = /** @class */ (function () {
        function Magnet(threashold) {
            this._private__enabled = false;
            this._private__threashold = threashold;
        }
        Magnet.prototype.enable = function () {
            this._private__enabled = true;
        };
        Magnet.prototype.disable = function () {
            this._private__enabled = false;
        };
        Magnet.prototype.align = function (price, index, pane) {
            if (!this._private__enabled) {
                return price;
            }
            var res = price;
            var defaultPriceScale = pane.defaultPriceScale();
            var firstValue = defaultPriceScale.firstValue();
            if (firstValue === null) {
                return res;
            }
            var y = defaultPriceScale.priceToCoordinate(price, firstValue);
            // get all serieses from the pane
            var serieses = pane.dataSources().filter((function (ds) { return (ds instanceof Series); }));
            var candidates = serieses.reduce(function (acc, series) {
                if (pane.isOverlay(series) || !series.visible()) {
                    return acc;
                }
                var ps = series.priceScale();
                var bars = series.bars();
                if (ps.isEmpty() || !bars.contains(index)) {
                    return acc;
                }
                var bar = bars.valueAt(index);
                if (bar === null) {
                    return acc;
                }
                // convert bar to pixels
                var firstPrice = ensure(series.firstValue());
                acc.push(ps.priceToCoordinate(bar.value[3 /* Close */], firstPrice.value), ps.priceToCoordinate(bar.value[2 /* Low */], firstPrice.value), ps.priceToCoordinate(bar.value[1 /* High */], firstPrice.value), ps.priceToCoordinate(bar.value[0 /* Open */], firstPrice.value));
                return acc;
            }, []);
            if (candidates.length === 0) {
                return res;
            }
            candidates.sort(function (y1, y2) { return Math.abs(y1 - y) - Math.abs(y2 - y); });
            var nearest = candidates[0];
            if (Math.abs(nearest - y) < this._private__threashold) {
                res = defaultPriceScale.coordinateToPrice(nearest, firstValue);
            }
            return res;
        };
        return Magnet;
    }());

    var getMonth = function (date) { return date.getUTCMonth() + 1; };
    var getDay = function (date) { return date.getUTCDate(); };
    var getYear = function (date) { return date.getUTCFullYear(); };
    var dd = function (date) { return numberToStringWithLeadingZero(getDay(date), 2); };
    var MMMM = function (date, locale) { return new Date(date.getUTCFullYear(), date.getUTCMonth(), 1)
        .toLocaleString(locale, { month: 'long' }); };
    var MMM = function (date, locale) { return new Date(date.getUTCFullYear(), date.getUTCMonth(), 1)
        .toLocaleString(locale, { month: 'short' }); };
    var MM = function (date) { return numberToStringWithLeadingZero(getMonth(date), 2); };
    var yy = function (date) { return numberToStringWithLeadingZero(getYear(date) % 100, 2); };
    var yyyy = function (date) { return numberToStringWithLeadingZero(getYear(date), 4); };
    function formatDate(date, format, locale) {
        return format
            .replace(/yyyy/g, yyyy(date))
            .replace(/yy/g, yy(date))
            .replace(/MMMM/g, MMMM(date, locale))
            .replace(/MMM/g, MMM(date, locale))
            .replace(/MM/g, MM(date))
            .replace(/dd/g, dd(date));
    }

    var DateFormatter = /** @class */ (function () {
        function DateFormatter(dateFormat, locale) {
            if (dateFormat === void 0) { dateFormat = 'yyyy-MM-dd'; }
            if (locale === void 0) { locale = 'default'; }
            this._private__dateFormat = dateFormat;
            this._private__locale = locale;
        }
        DateFormatter.prototype._internal_format = function (date) {
            return formatDate(date, this._private__dateFormat, this._private__locale);
        };
        return DateFormatter;
    }());

    var TimeFormatter = /** @class */ (function () {
        function TimeFormatter(format) {
            this._private__formatStr = format || '%h:%m:%s';
        }
        TimeFormatter.prototype._internal_format = function (date) {
            return this._private__formatStr.replace('%h', numberToStringWithLeadingZero(date.getUTCHours(), 2)).
                replace('%m', numberToStringWithLeadingZero(date.getUTCMinutes(), 2)).
                replace('%s', numberToStringWithLeadingZero(date.getUTCSeconds(), 2));
        };
        return TimeFormatter;
    }());

    var defaultParams = {
        _internal_dateFormat: 'yyyy-MM-dd',
        _internal_timeFormat: '%h:%m:%s',
        _internal_dateTimeSeparator: ' ',
        _internal_locale: 'default',
    };
    var DateTimeFormatter = /** @class */ (function () {
        function DateTimeFormatter(params) {
            if (params === void 0) { params = {}; }
            var formatterParams = __assign(__assign({}, defaultParams), params);
            this._private__dateFormatter = new DateFormatter(formatterParams._internal_dateFormat, formatterParams._internal_locale);
            this._private__timeFormatter = new TimeFormatter(formatterParams._internal_timeFormat);
            this._private__separator = formatterParams._internal_dateTimeSeparator;
        }
        DateTimeFormatter.prototype._internal_format = function (dateTime) {
            return "".concat(this._private__dateFormatter._internal_format(dateTime)).concat(this._private__separator).concat(this._private__timeFormatter._internal_format(dateTime));
        };
        return DateTimeFormatter;
    }());

    function defaultTickMarkFormatter(timePoint, tickMarkType, locale) {
        var formatOptions = {};
        switch (tickMarkType) {
            case 0 /* Year */:
                formatOptions.year = 'numeric';
                break;
            case 1 /* Month */:
                formatOptions.month = 'short';
                break;
            case 2 /* DayOfMonth */:
                formatOptions.day = 'numeric';
                break;
            case 3 /* Time */:
                formatOptions.hour12 = false;
                formatOptions.hour = '2-digit';
                formatOptions.minute = '2-digit';
                break;
            case 4 /* TimeWithSeconds */:
                formatOptions.hour12 = false;
                formatOptions.hour = '2-digit';
                formatOptions.minute = '2-digit';
                formatOptions.second = '2-digit';
                break;
        }
        var date = timePoint.businessDay === undefined
            ? new Date(timePoint.timestamp * 1000)
            : new Date(Date.UTC(timePoint.businessDay.year, timePoint.businessDay.month - 1, timePoint.businessDay.day));
        // from given date we should use only as UTC date or timestamp
        // but to format as locale date we can convert UTC date to local date
        var localDateFromUtc = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds());
        return localDateFromUtc.toLocaleString(locale, formatOptions);
    }

    var FormattedLabelsCache = /** @class */ (function () {
        function FormattedLabelsCache(format, size) {
            if (size === void 0) { size = 50; }
            this._private__actualSize = 0;
            this._private__usageTick = 1;
            this._private__oldestTick = 1;
            this._private__cache = new Map();
            this._private__tick2Labels = new Map();
            this._private__format = format;
            this._private__maxSize = size;
        }
        FormattedLabelsCache.prototype._internal_format = function (value) {
            var cacheKey = value.businessDay === undefined
                ? new Date(value.timestamp * 1000).getTime()
                : new Date(Date.UTC(value.businessDay.year, value.businessDay.month - 1, value.businessDay.day)).getTime();
            var tick = this._private__cache.get(cacheKey);
            if (tick !== undefined) {
                return tick._internal_string;
            }
            if (this._private__actualSize === this._private__maxSize) {
                var oldestValue = this._private__tick2Labels.get(this._private__oldestTick);
                this._private__tick2Labels.delete(this._private__oldestTick);
                this._private__cache.delete(ensureDefined(oldestValue));
                this._private__oldestTick++;
                this._private__actualSize--;
            }
            var str = this._private__format(value);
            this._private__cache.set(cacheKey, { _internal_string: str, _internal_tick: this._private__usageTick });
            this._private__tick2Labels.set(this._private__usageTick, cacheKey);
            this._private__actualSize++;
            this._private__usageTick++;
            return str;
        };
        return FormattedLabelsCache;
    }());

    var RangeImpl = /** @class */ (function () {
        function RangeImpl(left, right) {
            assert(left <= right, 'right should be >= left');
            this._private__left = left;
            this._private__right = right;
        }
        RangeImpl.prototype.left = function () {
            return this._private__left;
        };
        RangeImpl.prototype.right = function () {
            return this._private__right;
        };
        RangeImpl.prototype.valueAt = function (position) {
            return (this._private__left + (this._private__right - this._private__left) * position);
        };
        RangeImpl.prototype.count = function () {
            return this._private__right - this._private__left + 1;
        };
        RangeImpl.prototype.contains = function (index) {
            return this._private__left <= index && index <= this._private__right;
        };
        RangeImpl.prototype.equals = function (other) {
            return this._private__left === other.left() && this._private__right === other.right();
        };
        return RangeImpl;
    }());
    function areRangesEqual(first, second) {
        if (first === null || second === null) {
            return first === second;
        }
        return first.equals(second);
    }

    var TickMarks = /** @class */ (function () {
        function TickMarks() {
            this._private__marksByWeight = new Map();
            this._private__cache = null;
        }
        TickMarks.prototype._internal_setTimeScalePoints = function (newPoints, firstChangedPointIndex) {
            this._private__removeMarksSinceIndex(firstChangedPointIndex);
            this._private__cache = null;
            for (var index = firstChangedPointIndex; index < newPoints.length; ++index) {
                var point = newPoints[index];
                var marksForWeight = this._private__marksByWeight.get(point.timeWeight);
                if (marksForWeight === undefined) {
                    marksForWeight = [];
                    this._private__marksByWeight.set(point.timeWeight, marksForWeight);
                }
                marksForWeight.push({
                    _internal_index: index,
                    _internal_time: point.time,
                    _internal_weight: point.timeWeight,
                });
            }
        };
        TickMarks.prototype._internal_build = function (spacing, maxWidth) {
            var maxIndexesPerMark = Math.ceil(maxWidth / spacing);
            if (this._private__cache === null || this._private__cache._internal_maxIndexesPerMark !== maxIndexesPerMark) {
                this._private__cache = {
                    _internal_marks: this._private__buildMarksImpl(maxIndexesPerMark),
                    _internal_maxIndexesPerMark: maxIndexesPerMark,
                };
            }
            return this._private__cache._internal_marks;
        };
        TickMarks.prototype._private__removeMarksSinceIndex = function (sinceIndex) {
            if (sinceIndex === 0) {
                this._private__marksByWeight.clear();
                return;
            }
            var weightsToClear = [];
            this._private__marksByWeight.forEach(function (marks, timeWeight) {
                if (sinceIndex <= marks[0]._internal_index) {
                    weightsToClear.push(timeWeight);
                }
                else {
                    marks.splice(lowerbound(marks, sinceIndex, function (tm) { return tm._internal_index < sinceIndex; }), Infinity);
                }
            });
            for (var _i = 0, weightsToClear_1 = weightsToClear; _i < weightsToClear_1.length; _i++) {
                var weight = weightsToClear_1[_i];
                this._private__marksByWeight.delete(weight);
            }
        };
        TickMarks.prototype._private__buildMarksImpl = function (maxIndexesPerMark) {
            var marks = [];
            for (var _i = 0, _a = Array.from(this._private__marksByWeight.keys()).sort(function (a, b) { return b - a; }); _i < _a.length; _i++) {
                var weight = _a[_i];
                if (!this._private__marksByWeight.get(weight)) {
                    continue;
                }
                // Built tickMarks are now prevMarks, and marks it as new array
                var prevMarks = marks;
                marks = [];
                var prevMarksLength = prevMarks.length;
                var prevMarksPointer = 0;
                var currentWeight = ensureDefined(this._private__marksByWeight.get(weight));
                var currentWeightLength = currentWeight.length;
                var rightIndex = Infinity;
                var leftIndex = -Infinity;
                for (var i = 0; i < currentWeightLength; i++) {
                    var mark = currentWeight[i];
                    var currentIndex = mark._internal_index;
                    // Determine indexes with which current index will be compared
                    // All marks to the right is moved to new array
                    while (prevMarksPointer < prevMarksLength) {
                        var lastMark = prevMarks[prevMarksPointer];
                        var lastIndex = lastMark._internal_index;
                        if (lastIndex < currentIndex) {
                            prevMarksPointer++;
                            marks.push(lastMark);
                            leftIndex = lastIndex;
                            rightIndex = Infinity;
                        }
                        else {
                            rightIndex = lastIndex;
                            break;
                        }
                    }
                    if (rightIndex - currentIndex >= maxIndexesPerMark && currentIndex - leftIndex >= maxIndexesPerMark) {
                        // TickMark fits. Place it into new array
                        marks.push(mark);
                        leftIndex = currentIndex;
                    }
                }
                // Place all unused tickMarks into new array;
                for (; prevMarksPointer < prevMarksLength; prevMarksPointer++) {
                    marks.push(prevMarks[prevMarksPointer]);
                }
            }
            return marks;
        };
        return TickMarks;
    }());

    var TimeScaleVisibleRange = /** @class */ (function () {
        function TimeScaleVisibleRange(logicalRange) {
            this._private__logicalRange = logicalRange;
        }
        TimeScaleVisibleRange.prototype._internal_strictRange = function () {
            if (this._private__logicalRange === null) {
                return null;
            }
            return new RangeImpl(Math.floor(this._private__logicalRange.left()), Math.ceil(this._private__logicalRange.right()));
        };
        TimeScaleVisibleRange.prototype._internal_logicalRange = function () {
            return this._private__logicalRange;
        };
        TimeScaleVisibleRange._internal_invalid = function () {
            return new TimeScaleVisibleRange(null);
        };
        return TimeScaleVisibleRange;
    }());

    /**
     * Represents the type of a tick mark on the time axis.
     */
    var TickMarkType;
    (function (TickMarkType) {
        /**
         * The start of the year (e.g. it's the first tick mark in a year).
         */
        TickMarkType[TickMarkType["Year"] = 0] = "Year";
        /**
         * The start of the month (e.g. it's the first tick mark in a month).
         */
        TickMarkType[TickMarkType["Month"] = 1] = "Month";
        /**
         * A day of the month.
         */
        TickMarkType[TickMarkType["DayOfMonth"] = 2] = "DayOfMonth";
        /**
         * A time without seconds.
         */
        TickMarkType[TickMarkType["Time"] = 3] = "Time";
        /**
         * A time with seconds.
         */
        TickMarkType[TickMarkType["TimeWithSeconds"] = 4] = "TimeWithSeconds";
    })(TickMarkType || (TickMarkType = {}));
    /**
     * Represents the time scale mode.
     */
    var TimeScaleMode;
    (function (TimeScaleMode) {
        /**
         * Time scale shows every signle time on a new bar
         */
        TimeScaleMode[TimeScaleMode["Normal"] = 0] = "Normal";
        /**
         * Price range changes based on the distance between the different time points
         */
        TimeScaleMode[TimeScaleMode["Euclidean"] = 1] = "Euclidean";
    })(TimeScaleMode || (TimeScaleMode = {}));
    var TimeScale = /** @class */ (function () {
        function TimeScale(model, options, localizationOptions) {
            this._private__width = 0;
            this._private__baseIndexOrNull = null;
            this._private__points = [];
            this._private__scrollStartPoint = null;
            this._private__scaleStartPoint = null;
            this._private__tickMarks = new TickMarks();
            this._private__formattedByWeight = new Map();
            this._private__visibleRange = TimeScaleVisibleRange._internal_invalid();
            this._private__visibleValueRange = TimeScaleVisibleRange._internal_invalid();
            this._private__visibleRangeInvalidated = true;
            this._private__visibleBarsChanged = new Delegate();
            this._private__logicalRangeChanged = new Delegate();
            this._private__optionsApplied = new Delegate();
            this._private__commonTransitionStartState = null;
            this._private__timeMarksCache = null;
            this._private__labels = [];
            this._private__options = options;
            this._private__localizationOptions = localizationOptions;
            this._private__rightOffset = options.rightOffset;
            this._private__barSpacing = options.barSpacing;
            this._private__model = model;
            this._private__updateDateTimeFormatter();
        }
        TimeScale.prototype.options = function () {
            return this._private__options;
        };
        TimeScale.prototype.applyLocalizationOptions = function (localizationOptions) {
            merge(this._private__localizationOptions, localizationOptions);
            this._private__invalidateTickMarks();
            this._private__updateDateTimeFormatter();
        };
        TimeScale.prototype.applyOptions = function (options, localizationOptions) {
            var _a;
            merge(this._private__options, options);
            if (this._private__options.fixLeftEdge) {
                this._private__doFixLeftEdge();
            }
            if (this._private__options.fixRightEdge) {
                this._private__doFixRightEdge();
            }
            // note that bar spacing should be applied before right offset
            // because right offset depends on bar spacing
            if (options.barSpacing !== undefined) {
                this._private__model.setBarSpacing(options.barSpacing);
            }
            if (options.rightOffset !== undefined) {
                this._private__model.setRightOffset(options.rightOffset);
            }
            if (options.minBarSpacing !== undefined) {
                // yes, if we apply min bar spacing then we need to correct bar spacing
                // the easiest way is to apply it once again
                this._private__model.setBarSpacing((_a = options.barSpacing) !== null && _a !== void 0 ? _a : this._private__barSpacing);
            }
            this._private__invalidateTickMarks();
            this._private__updateDateTimeFormatter();
            this._private__optionsApplied.fire();
        };
        TimeScale.prototype.indexToTime = function (index) {
            var _a;
            return ((_a = this._private__points[index]) === null || _a === void 0 ? void 0 : _a.time) || null;
        };
        TimeScale.prototype.floatIndexToTime = function (index) {
            var _a, _b, _c, _d;
            var index1 = Math.floor(index);
            var index2 = Math.ceil(index);
            var time1 = (_a = this._private__points[index1]) === null || _a === void 0 ? void 0 : _a.time.timestamp;
            var time2 = (_b = this._private__points[index2]) === null || _b === void 0 ? void 0 : _b.time.timestamp;
            var firstTime = (_c = this._private__points[0]) === null || _c === void 0 ? void 0 : _c.time.timestamp;
            var lastTime = (_d = this._private__points[this._private__points.length - 1]) === null || _d === void 0 ? void 0 : _d.time.timestamp;
            var interval = 0;
            if (this._private__points.length >= 2) {
                interval = this._private__points[1].time.timestamp - this._private__points[0].time.timestamp;
            }
            else {
                interval = 0 - this._private__points[0].time.timestamp;
            }
            if (index >= this._private__points.length - 1) {
                return lastTime + interval * (index - this._private__points.length + 1);
            }
            else if (index < 0) {
                return firstTime - interval * -index;
            }
            else if (time1 && time2) {
                return time1 + (time2 - time1) * (index - index1);
            }
            else {
                return null;
            }
        };
        TimeScale.prototype.timeToIndex = function (time, findNearest) {
            if (this._private__points.length < 1) {
                // no time points available
                return null;
            }
            if (time.timestamp > this._private__points[this._private__points.length - 1].time.timestamp) {
                // special case
                return findNearest ? this._private__points.length - 1 : null;
            }
            var index = lowerbound(this._private__points, time.timestamp, function (a, b) { return a.time.timestamp < b; });
            if (time.timestamp < this._private__points[index].time.timestamp) {
                return findNearest ? index : null;
            }
            return index;
        };
        TimeScale.prototype.timeToFloatIndex = function (time, findNearest) {
            var toIndex = this.timeToIndex(time, findNearest);
            if (toIndex === null) {
                return null;
            }
            var fromIndex = Math.max(toIndex - 1, 0);
            var fromValue = this._private__points[fromIndex].time.timestamp;
            var toValue = this._private__points[toIndex].time.timestamp;
            return (fromIndex + (1 - (toValue - time.timestamp) / (toValue - fromValue)));
        };
        TimeScale.prototype.isEmpty = function () {
            return this._private__width === 0 || this._private__points.length === 0 || this._private__baseIndexOrNull === null;
        };
        // strict range: integer indices of the bars in the visible range rounded in more wide direction
        TimeScale.prototype.visibleStrictRange = function () {
            this._private__updateVisibleRange();
            return this._private__visibleRange._internal_strictRange();
        };
        TimeScale.prototype.visibleLogicalRange = function () {
            this._private__updateVisibleRange();
            return this._private__visibleRange._internal_logicalRange();
        };
        TimeScale.prototype.visibleTimeRange = function () {
            var visibleBars = this.visibleStrictRange();
            if (visibleBars === null) {
                return null;
            }
            var range = {
                from: visibleBars.left(),
                to: visibleBars.right(),
            };
            return this.timeRangeForLogicalRange(range);
        };
        TimeScale.prototype.timeRangeForLogicalRange = function (range) {
            var from = Math.round(range.from);
            var to = Math.round(range.to);
            var firstIndex = ensureNotNull(this._private__firstIndex());
            var lastIndex = ensureNotNull(this._private__lastIndex());
            return {
                from: ensureNotNull(this.indexToTime(Math.max(firstIndex, from))),
                to: ensureNotNull(this.indexToTime(Math.min(lastIndex, to))),
            };
        };
        TimeScale.prototype.logicalRangeForTimeRange = function (range) {
            return {
                from: ensureNotNull(this.timeToFloatIndex(range.from, true)),
                to: ensureNotNull(this.timeToFloatIndex(range.to, true)),
            };
        };
        TimeScale.prototype.width = function () {
            return this._private__width;
        };
        TimeScale.prototype.setWidth = function (width) {
            if (!isFinite(width) || width <= 0) {
                return;
            }
            if (this._private__width === width) {
                return;
            }
            if (this._private__options.lockVisibleTimeRangeOnResize && this._private__width) {
                // recalculate bar spacing
                var newBarSpacing = this._private__barSpacing * width / this._private__width;
                this._private__barSpacing = newBarSpacing;
            }
            // if time scale is scrolled to the end of data and we have fixed right edge
            // keep left edge instead of right
            // we need it to avoid "shaking" if the last bar visibility affects time scale width
            if (this._private__options.fixLeftEdge) {
                var visibleRange = this.visibleStrictRange();
                if (visibleRange !== null) {
                    var firstVisibleBar = visibleRange.left();
                    // firstVisibleBar could be less than 0
                    // since index is a center of bar
                    if (firstVisibleBar <= 0) {
                        var delta = this._private__width - width;
                        // reduce  _rightOffset means move right
                        // we could move more than required - this will be fixed by _correctOffset()
                        this._private__rightOffset -= Math.round(delta / this._private__barSpacing) + 1;
                    }
                }
            }
            this._private__width = width;
            this._private__visibleRangeInvalidated = true;
            // updating bar spacing should be first because right offset depends on it
            this._private__correctBarSpacing();
            this._private__correctOffset();
        };
        TimeScale.prototype.indexToCoordinate = function (index) {
            if (this.isEmpty()) {
                return 0;
            }
            if (this._private__options.mode === 1 /* Euclidean */) {
                var time = this.indexToTime(index);
                if (!time) {
                    return 0;
                }
                return this.timeToCoordinate(time);
            }
            else {
                if (!isInteger(index)) {
                    return 0;
                }
                var baseIndex = this.baseIndex();
                var deltaFromRight = baseIndex + this._private__rightOffset - index;
                var coordinate = this._private__width - (deltaFromRight + 0.5) * this._private__barSpacing - 1;
                return coordinate;
            }
        };
        TimeScale.prototype.indexesToCoordinates = function (points, visibleRange) {
            var _a;
            if (this._private__options.mode === 1 /* Euclidean */) {
                var intervalRange = this._private__visibleValueRange._internal_logicalRange();
                var start = (intervalRange === null || intervalRange === void 0 ? void 0 : intervalRange.left()) || 0;
                var end = (intervalRange === null || intervalRange === void 0 ? void 0 : intervalRange.right()) || 0;
                for (var i = 0; i < points.length; i++) {
                    var utc = (((_a = this.indexToTime(points[i].time)) === null || _a === void 0 ? void 0 : _a.timestamp) || 0);
                    points[i].x = this._private__width * ((utc - start) / (end - start));
                }
            }
            else {
                var baseIndex = this.baseIndex();
                var indexFrom = (visibleRange === undefined) ? 0 : visibleRange.from;
                var indexTo = (visibleRange === undefined) ? points.length : visibleRange.to;
                for (var i = indexFrom; i < indexTo; i++) {
                    var index = points[i].time;
                    var deltaFromRight = baseIndex + this._private__rightOffset - index;
                    var coordinate = this._private__width - (deltaFromRight + 0.5) * this._private__barSpacing - 1;
                    points[i].x = coordinate;
                }
            }
        };
        TimeScale.prototype.timeToCoordinate = function (timePoint) {
            if (this._private__options.mode === 1 /* Euclidean */) {
                var intervalRange = this._private__visibleValueRange._internal_logicalRange();
                var start = (intervalRange === null || intervalRange === void 0 ? void 0 : intervalRange.left()) || 0;
                var end = (intervalRange === null || intervalRange === void 0 ? void 0 : intervalRange.right()) || 0;
                var utc = timePoint.timestamp;
                return this._private__width * ((utc - start) / (end - start));
            }
            else {
                var index = this.timeToIndex(timePoint, true);
                var timestamp = this._private__points[index].time.timestamp;
                var x = this.indexToCoordinate(index);
                if (timestamp === timePoint.timestamp) {
                    return x;
                }
                else if (index === 0 || index === this._private__points.length - 1) {
                    var interval = 0 - this._private__points[0].time.timestamp;
                    if (this._private__points.length === 2) {
                        interval = this._private__points[1].time.timestamp - this._private__points[0].time.timestamp;
                    }
                    var timeDiff = timePoint.timestamp - timestamp;
                    var bars = timeDiff / interval;
                    return x + (bars * this.barSpacing());
                }
                else {
                    return x;
                }
            }
        };
        TimeScale.prototype.indexesToCoordinatesExtensions = function (points, extensionsBoundaries, visibleRange) {
            var baseIndex = this.baseIndex();
            var indexFrom = (visibleRange === undefined) ? 0 : visibleRange.from;
            var indexTo = (visibleRange === undefined) ? points.length : visibleRange.to;
            for (var i = indexFrom; i < indexTo; i++) {
                var index = points[i].time;
                var deltaFromRight = baseIndex + this._private__rightOffset - index;
                var coordinate = this._private__width - (deltaFromRight + 0.5) * this._private__barSpacing - 1;
                points[i].x = coordinate;
                if (typeof points[i].id !== 'undefined' && extensionsBoundaries[points[i].id]) {
                    deltaFromRight = baseIndex + this._private__rightOffset - extensionsBoundaries[points[i].id];
                    coordinate = this._private__width - (deltaFromRight + 0.5) * this._private__barSpacing - 1;
                    points[i].end = coordinate;
                }
                else {
                    points[i].end = this._private__width;
                }
            }
        };
        TimeScale.prototype.coordinateToIndex = function (x) {
            return Math.ceil(this._private__coordinateToFloatIndex(x));
        };
        TimeScale.prototype.coordinateToTime = function (x) {
            var interval = 0 - this._private__points[0].time.timestamp;
            if (this._private__points.length >= 2) {
                interval = this._private__points[1].time.timestamp - this._private__points[0].time.timestamp;
            }
            var index = this.coordinateToIndex(x);
            if (index >= this._private__points.length) {
                var extraTime = interval * (index - this._private__points.length + 1);
                return { timestamp: this._private__points[this._private__points.length - 1].time.timestamp + extraTime };
            }
            else if (index < 0) {
                var extraTime = interval * -index;
                return { timestamp: this._private__points[0].time.timestamp - extraTime };
            }
            return this._private__points[index].time;
        };
        TimeScale.prototype.setRightOffset = function (offset) {
            this._private__visibleRangeInvalidated = true;
            this._private__rightOffset = offset;
            this._private__correctOffset();
            this._private__model.recalculateAllPanes();
            this._private__model.lightUpdate();
        };
        TimeScale.prototype.barSpacing = function () {
            return this._private__barSpacing;
        };
        TimeScale.prototype.setBarSpacing = function (newBarSpacing) {
            this._private__setBarSpacing(newBarSpacing);
            // do not allow scroll out of visible bars
            this._private__correctOffset();
            this._private__model.recalculateAllPanes();
            this._private__model.lightUpdate();
        };
        TimeScale.prototype.rightOffset = function () {
            return this._private__rightOffset;
        };
        // eslint-disable-next-line complexity
        TimeScale.prototype.marks = function () {
            if (this.isEmpty()) {
                return null;
            }
            if (this._private__timeMarksCache !== null) {
                return this._private__timeMarksCache;
            }
            var spacing = this._private__barSpacing;
            var fontSize = this._private__model.options().layout.fontSize;
            var maxLabelWidth = (fontSize + 4) * (this._private__options.mode === 1 /* Euclidean */ ? 12 : 5);
            var indexPerLabel = Math.round(maxLabelWidth / spacing);
            var visibleBars = ensureNotNull(this.visibleStrictRange());
            var firstBar = Math.max(visibleBars.left(), visibleBars.left() - indexPerLabel);
            var lastBar = Math.max(visibleBars.right(), visibleBars.right() - indexPerLabel);
            var items = this._private__tickMarks._internal_build(spacing, maxLabelWidth);
            // according to indexPerLabel value this value means "earliest index which _might be_ used as the second label on time scale"
            var earliestIndexOfSecondLabel = this._private__firstIndex() + indexPerLabel;
            // according to indexPerLabel value this value means "earliest index which _might be_ used as the second last label on time scale"
            var indexOfSecondLastLabel = this._private__lastIndex() - indexPerLabel;
            var isAllScalingAndScrollingDisabled = this._private__isAllScalingAndScrollingDisabled();
            var isLeftEdgeFixed = this._private__options.fixLeftEdge || isAllScalingAndScrollingDisabled;
            var isRightEdgeFixed = this._private__options.fixRightEdge || isAllScalingAndScrollingDisabled;
            var targetIndex = 0;
            for (var _i = 0, items_1 = items; _i < items_1.length; _i++) {
                var tm = items_1[_i];
                var index = this._private__options.mode === 1 /* Euclidean */
                    ? this.timeToFloatIndex(tm._internal_time, true)
                    : tm._internal_index;
                if (!(firstBar <= index && index <= lastBar)) {
                    continue;
                }
                var label = void 0;
                if (targetIndex < this._private__labels.length) {
                    label = this._private__labels[targetIndex];
                    label.label = this._private__formatLabel(tm._internal_time, tm._internal_weight);
                    label.weight = tm._internal_weight;
                    label.coord = this._private__options.mode === 1 /* Euclidean */
                        ? this.timeToCoordinate(tm._internal_time)
                        : this.indexToCoordinate(index);
                }
                else {
                    label = {
                        needAlignCoordinate: false,
                        label: this._private__formatLabel(tm._internal_time, tm._internal_weight),
                        weight: tm._internal_weight,
                        coord: this._private__options.mode === 1 /* Euclidean */
                            ? this.timeToCoordinate(tm._internal_time)
                            : this.indexToCoordinate(index),
                    };
                    this._private__labels.push(label);
                }
                if (this._private__barSpacing > (maxLabelWidth / 2) && !isAllScalingAndScrollingDisabled) {
                    // if there is enough space then let's show all tick marks as usual
                    label.needAlignCoordinate = false;
                }
                else {
                    // if a user is able to scroll after a tick mark then show it as usual, otherwise the coordinate might be aligned
                    // if the index is for the second (last) label or later (earlier) then most likely this label might be displayed without correcting the coordinate
                    label.needAlignCoordinate = (isLeftEdgeFixed && tm._internal_index <= earliestIndexOfSecondLabel) || (isRightEdgeFixed && tm._internal_index >= indexOfSecondLastLabel);
                }
                targetIndex++;
            }
            this._private__labels.length = targetIndex;
            this._private__timeMarksCache = this._private__labels;
            return this._private__labels;
        };
        TimeScale.prototype.restoreDefault = function () {
            this._private__visibleRangeInvalidated = true;
            this.setBarSpacing(this._private__options.barSpacing);
            this.setRightOffset(this._private__options.rightOffset);
        };
        TimeScale.prototype.setBaseIndex = function (baseIndex) {
            this._private__visibleRangeInvalidated = true;
            this._private__baseIndexOrNull = baseIndex;
            this._private__correctOffset();
            this._private__doFixLeftEdge();
        };
        /**
         * Zoom in/out the scale around a `zoomPoint` on `scale` value.
         *
         * @param zoomPoint - X coordinate of the point to apply the zoom.
         * If `rightBarStaysOnScroll` option is disabled, then will be used to restore right offset.
         * @param scale - Zoom value (in 1/10 parts of current bar spacing).
         * Negative value means zoom out, positive - zoom in.
         */
        TimeScale.prototype.zoom = function (zoomPoint, scale) {
            var floatIndexAtZoomPoint = this._private__coordinateToFloatIndex(zoomPoint);
            var barSpacing = this.barSpacing();
            var newBarSpacing = barSpacing + scale * (barSpacing / 10);
            // zoom in/out bar spacing
            this.setBarSpacing(newBarSpacing);
            if (!this._private__options.rightBarStaysOnScroll) {
                // and then correct right offset to move index under zoomPoint back to its coordinate
                this.setRightOffset(this.rightOffset() + (floatIndexAtZoomPoint - this._private__coordinateToFloatIndex(zoomPoint)));
            }
        };
        TimeScale.prototype.startScale = function (x) {
            if (this._private__scrollStartPoint) {
                this.endScroll();
            }
            if (this._private__scaleStartPoint !== null || this._private__commonTransitionStartState !== null) {
                return;
            }
            if (this.isEmpty()) {
                return;
            }
            this._private__scaleStartPoint = x;
            this._private__saveCommonTransitionsStartState();
        };
        TimeScale.prototype.scaleTo = function (x) {
            if (this._private__commonTransitionStartState === null) {
                return;
            }
            var startLengthFromRight = clamp(this._private__width - x, 0, this._private__width);
            var currentLengthFromRight = clamp(this._private__width - ensureNotNull(this._private__scaleStartPoint), 0, this._private__width);
            if (startLengthFromRight === 0 || currentLengthFromRight === 0) {
                return;
            }
            this.setBarSpacing(this._private__commonTransitionStartState._internal_barSpacing * startLengthFromRight / currentLengthFromRight);
        };
        TimeScale.prototype.endScale = function () {
            if (this._private__scaleStartPoint === null) {
                return;
            }
            this._private__scaleStartPoint = null;
            this._private__clearCommonTransitionsStartState();
        };
        TimeScale.prototype.startScroll = function (x) {
            if (this._private__scrollStartPoint !== null || this._private__commonTransitionStartState !== null) {
                return;
            }
            if (this.isEmpty()) {
                return;
            }
            this._private__scrollStartPoint = x;
            this._private__saveCommonTransitionsStartState();
        };
        TimeScale.prototype.scrollTo = function (x) {
            if (this._private__scrollStartPoint === null) {
                return;
            }
            var shiftInLogical = (this._private__scrollStartPoint - x) / this.barSpacing();
            this._private__rightOffset = ensureNotNull(this._private__commonTransitionStartState)._internal_rightOffset + shiftInLogical;
            this._private__visibleRangeInvalidated = true;
            // do not allow scroll out of visible bars
            this._private__correctOffset();
        };
        TimeScale.prototype.endScroll = function () {
            if (this._private__scrollStartPoint === null) {
                return;
            }
            this._private__scrollStartPoint = null;
            this._private__clearCommonTransitionsStartState();
        };
        TimeScale.prototype.scrollToRealTime = function () {
            this.scrollToOffsetAnimated(this._private__options.rightOffset);
        };
        TimeScale.prototype.scrollToOffsetAnimated = function (offset, animationDuration) {
            var _this = this;
            if (animationDuration === void 0) { animationDuration = 400 /* DefaultAnimationDuration */; }
            if (!isFinite(offset)) {
                throw new RangeError('offset is required and must be finite number');
            }
            if (!isFinite(animationDuration) || animationDuration <= 0) {
                throw new RangeError('animationDuration (optional) must be finite positive number');
            }
            var source = this._private__rightOffset;
            var animationStart = performance.now();
            var animationFn = function () {
                var animationProgress = (performance.now() - animationStart) / animationDuration;
                var finishAnimation = animationProgress >= 1;
                var rightOffset = finishAnimation ? offset : source + (offset - source) * animationProgress;
                _this.setRightOffset(rightOffset);
                if (!finishAnimation) {
                    setTimeout(animationFn, 20);
                }
            };
            animationFn();
        };
        TimeScale.prototype.update = function (newPoints, firstChangedPointIndex) {
            this._private__visibleRangeInvalidated = true;
            this._private__points = newPoints;
            if (this._private__options.mode === 1 /* Euclidean */) {
                var to = newPoints[newPoints.length - 1].time.timestamp;
                var from = newPoints[0].time.timestamp;
                var tickSize = (to - from) / newPoints.length;
                var interval = Math.pow(10, Math.floor(Math.log10(tickSize)));
                var start = Math.floor(from / interval) * interval;
                var end = Math.ceil(to / interval) * interval;
                var points = [];
                for (var index = start; index < end; index += interval) {
                    points.push({ time: { timestamp: index }, timeWeight: 50 /* Day */ });
                }
                this._private__tickMarks._internal_setTimeScalePoints(points, 0);
            }
            else {
                this._private__tickMarks._internal_setTimeScalePoints(newPoints, firstChangedPointIndex);
            }
            this._private__correctOffset();
        };
        TimeScale.prototype.visibleBarsChanged = function () {
            return this._private__visibleBarsChanged;
        };
        TimeScale.prototype.logicalRangeChanged = function () {
            return this._private__logicalRangeChanged;
        };
        TimeScale.prototype.optionsApplied = function () {
            return this._private__optionsApplied;
        };
        TimeScale.prototype.baseIndex = function () {
            // null is used to known that baseIndex is not set yet
            // so in methods which should known whether it is set or not
            // we should check field `_baseIndexOrNull` instead of getter `baseIndex()`
            // see minRightOffset for example
            return this._private__baseIndexOrNull || 0;
        };
        TimeScale.prototype.setVisibleRange = function (range) {
            if (this._private__options.mode === 1 /* Euclidean */) {
                var leftValue = this.floatIndexToTime(range.left());
                var rightValue = this.floatIndexToTime(range.right());
                if (!leftValue || !rightValue) {
                    return;
                }
                var lastValue = this._private__points[this._private__points.length - 1].time.timestamp;
                var firstValue = this._private__points[0].time.timestamp;
                var avg = (lastValue - firstValue) / this._private__points.length;
                var right = (rightValue - firstValue) / avg;
                var left = (leftValue - firstValue) / avg;
                var offset = right - this.baseIndex();
                var barsLength = right - left + 1;
                var space = this._private__width / barsLength;
                this._private__setBarSpacing(space);
                this._private__rightOffset = (offset);
            }
            else {
                var length_1 = range.count();
                this._private__setBarSpacing(this._private__width / length_1);
                this._private__rightOffset = range.right() - this.baseIndex();
            }
            this._private__correctOffset();
            this._private__visibleRangeInvalidated = true;
            this._private__model.recalculateAllPanes();
            this._private__model.lightUpdate();
        };
        TimeScale.prototype.fitContent = function () {
            var first = this._private__firstIndex();
            var last = this._private__lastIndex();
            if (first === null || last === null) {
                return;
            }
            this.setVisibleRange(new RangeImpl(first, last + this._private__options.rightOffset));
        };
        TimeScale.prototype.setLogicalRange = function (range) {
            var barRange = new RangeImpl(range.from, range.to);
            this.setVisibleRange(barRange);
        };
        TimeScale.prototype.formatDateTime = function (time) {
            if (this._private__localizationOptions.timeFormatter !== undefined) {
                return this._private__localizationOptions.timeFormatter(time.businessDay || time.timestamp);
            }
            return this._private__dateTimeFormatter._internal_format(new Date(time.timestamp * 1000));
        };
        TimeScale.prototype._private__isAllScalingAndScrollingDisabled = function () {
            var _a = this._private__model.options(), handleScroll = _a.handleScroll, handleScale = _a.handleScale;
            return !handleScroll.horzTouchDrag
                && !handleScroll.mouseWheel
                && !handleScroll.pressedMouseMove
                && !handleScroll.vertTouchDrag
                && !handleScale.axisDoubleClickReset
                && !handleScale.axisPressedMouseMove.time
                && !handleScale.mouseWheel
                && !handleScale.pinch;
        };
        TimeScale.prototype._private__firstIndex = function () {
            return this._private__points.length === 0 ? null : 0;
        };
        TimeScale.prototype._private__lastIndex = function () {
            return this._private__points.length === 0 ? null : (this._private__points.length - 1);
        };
        TimeScale.prototype._private__rightOffsetForCoordinate = function (x) {
            return (this._private__width - 1 - x) / this._private__barSpacing;
        };
        TimeScale.prototype._private__coordinateToFloatIndex = function (x) {
            var valueRange = this._private__visibleValueRange._internal_logicalRange();
            if (this._private__options.mode === 1 /* Euclidean */ && valueRange) {
                var value = valueRange.valueAt(x / this._private__width);
                return this.timeToFloatIndex({ timestamp: value }, true) || 0;
            }
            else {
                var deltaFromRight = this._private__rightOffsetForCoordinate(x);
                var baseIndex = this.baseIndex();
                var index = baseIndex + this._private__rightOffset - deltaFromRight;
                // JavaScript uses very strange rounding
                // we need rounding to avoid problems with calculation errors
                return Math.round(index * 1000000) / 1000000;
            }
        };
        TimeScale.prototype._private__setBarSpacing = function (newBarSpacing) {
            var oldBarSpacing = this._private__barSpacing;
            this._private__barSpacing = newBarSpacing;
            this._private__correctBarSpacing();
            // this._barSpacing might be changed in _correctBarSpacing
            if (oldBarSpacing !== this._private__barSpacing) {
                this._private__visibleRangeInvalidated = true;
                this._private__resetTimeMarksCache();
            }
        };
        TimeScale.prototype._private__updateVisibleRange = function () {
            var _this = this;
            if (!this._private__visibleRangeInvalidated) {
                return;
            }
            this._private__visibleRangeInvalidated = false;
            if (this.isEmpty()) {
                this._private__setVisibleRange(TimeScaleVisibleRange._internal_invalid());
                return;
            }
            var baseIndex = this.baseIndex();
            var newBarsLength = this._private__width / this._private__barSpacing;
            var rightBorder = this._private__rightOffset + baseIndex;
            var leftBorder = rightBorder - newBarsLength + 1;
            if (this._private__options.mode === 1 /* Euclidean */ && this._private__points.length) {
                var lastValue = this._private__points[this._private__points.length - 1].time.timestamp;
                var firstValue = this._private__points[0].time.timestamp;
                var avg = (lastValue - firstValue) / this._private__points.length;
                var leftValue_1 = firstValue + leftBorder * avg;
                var rightValue_1 = firstValue + rightBorder * avg;
                this._private__visibleValueRange = new TimeScaleVisibleRange(new RangeImpl(leftValue_1, rightValue_1));
                leftBorder = leftValue_1 < firstValue
                    ? (leftValue_1 - firstValue) / avg
                    : this._private__points.findIndex(function (e, i) { return _this._private__points[i + 1].time.timestamp >= leftValue_1; });
                rightBorder = rightValue_1 > lastValue
                    ? this._private__points.length - 1 + (rightValue_1 - lastValue) / avg
                    : findLastIndex(this._private__points, function (e) { return e.time.timestamp <= rightValue_1; });
            }
            var logicalRange = new RangeImpl(leftBorder, rightBorder);
            this._private__setVisibleRange(new TimeScaleVisibleRange(logicalRange));
        };
        TimeScale.prototype._private__correctBarSpacing = function () {
            var minBarSpacing = this._private__minBarSpacing();
            if (this._private__barSpacing < minBarSpacing) {
                this._private__barSpacing = minBarSpacing;
                this._private__visibleRangeInvalidated = true;
            }
            if (this._private__width !== 0) {
                // make sure that this (1 / Constants.MinVisibleBarsCount) >= coeff in max bar spacing (it's 0.5 here)
                var maxBarSpacing = this._private__width * 0.5;
                if (this._private__barSpacing > maxBarSpacing) {
                    this._private__barSpacing = maxBarSpacing;
                    this._private__visibleRangeInvalidated = true;
                }
            }
        };
        TimeScale.prototype._private__minBarSpacing = function () {
            // if both options are enabled then limit bar spacing so that zooming-out is not possible
            // if it would cause either the first or last points to move too far from an edge
            if (this._private__options.fixLeftEdge && this._private__options.fixRightEdge && this._private__points.length !== 0) {
                return this._private__width / this._private__points.length;
            }
            return this._private__options.minBarSpacing;
        };
        TimeScale.prototype._private__correctOffset = function () {
            // block scrolling of to future
            var maxRightOffset = this._private__maxRightOffset();
            if (this._private__rightOffset > maxRightOffset) {
                this._private__rightOffset = maxRightOffset;
                this._private__visibleRangeInvalidated = true;
            }
            // block scrolling of to past
            var minRightOffset = this._private__minRightOffset();
            if (minRightOffset !== null && this._private__rightOffset < minRightOffset) {
                this._private__rightOffset = minRightOffset;
                this._private__visibleRangeInvalidated = true;
            }
        };
        TimeScale.prototype._private__minRightOffset = function () {
            var firstIndex = this._private__firstIndex();
            var baseIndex = this._private__baseIndexOrNull;
            if (firstIndex === null || baseIndex === null) {
                return null;
            }
            var barsEstimation = this._private__options.fixLeftEdge
                ? this._private__width / this._private__barSpacing
                : Math.min(2 /* MinVisibleBarsCount */, this._private__points.length);
            return firstIndex - baseIndex - 1 + barsEstimation;
        };
        TimeScale.prototype._private__maxRightOffset = function () {
            return this._private__options.fixRightEdge
                ? 0
                : (this._private__width / this._private__barSpacing) - Math.min(2 /* MinVisibleBarsCount */, this._private__points.length);
        };
        TimeScale.prototype._private__saveCommonTransitionsStartState = function () {
            this._private__commonTransitionStartState = {
                _internal_barSpacing: this.barSpacing(),
                _internal_rightOffset: this.rightOffset(),
            };
        };
        TimeScale.prototype._private__clearCommonTransitionsStartState = function () {
            this._private__commonTransitionStartState = null;
        };
        TimeScale.prototype._private__formatLabel = function (time, weight) {
            var _this = this;
            var formatter = this._private__formattedByWeight.get(weight);
            if (formatter === undefined) {
                formatter = new FormattedLabelsCache(function (timePoint) {
                    return _this._private__formatLabelImpl(timePoint, weight);
                });
                this._private__formattedByWeight.set(weight, formatter);
            }
            return formatter._internal_format(time);
        };
        TimeScale.prototype._private__formatLabelImpl = function (timePoint, weight) {
            var _a;
            var tickMarkType = weightToTickMarkType(weight, this._private__options.timeVisible, this._private__options.secondsVisible);
            if (this._private__options.tickMarkFormatter !== undefined) {
                // this is temporary solution to make more consistency API
                // it looks like that all time types in API should have the same form
                // but for know defaultTickMarkFormatter is on model level and can't determine whether passed time is business day or UTCTimestamp
                // because type guards are declared on API level
                // in other hand, type guards couldn't be declared on model level so far
                // because they are know about string representation of business day ¯\_(ツ)_/¯
                // let's fix in for all cases for the whole API
                return this._private__options.tickMarkFormatter((_a = timePoint.businessDay) !== null && _a !== void 0 ? _a : timePoint.timestamp, tickMarkType, this._private__localizationOptions.locale);
            }
            return defaultTickMarkFormatter(timePoint, tickMarkType, this._private__localizationOptions.locale);
        };
        TimeScale.prototype._private__setVisibleRange = function (newVisibleRange) {
            var oldVisibleRange = this._private__visibleRange;
            this._private__visibleRange = newVisibleRange;
            if (!areRangesEqual(oldVisibleRange._internal_strictRange(), this._private__visibleRange._internal_strictRange())) {
                this._private__visibleBarsChanged.fire();
            }
            if (!areRangesEqual(oldVisibleRange._internal_logicalRange(), this._private__visibleRange._internal_logicalRange())) {
                this._private__logicalRangeChanged.fire();
            }
            // TODO: reset only coords in case when this._visibleBars has not been changed
            this._private__resetTimeMarksCache();
        };
        TimeScale.prototype._private__resetTimeMarksCache = function () {
            this._private__timeMarksCache = null;
        };
        TimeScale.prototype._private__invalidateTickMarks = function () {
            this._private__resetTimeMarksCache();
            this._private__formattedByWeight.clear();
        };
        TimeScale.prototype._private__updateDateTimeFormatter = function () {
            var dateFormat = this._private__localizationOptions.dateFormat;
            if (this._private__options.timeVisible) {
                this._private__dateTimeFormatter = new DateTimeFormatter({
                    _internal_dateFormat: dateFormat,
                    _internal_timeFormat: this._private__options.secondsVisible ? '%h:%m:%s' : '%h:%m',
                    _internal_dateTimeSeparator: '   ',
                    _internal_locale: this._private__localizationOptions.locale,
                });
            }
            else {
                this._private__dateTimeFormatter = new DateFormatter(dateFormat, this._private__localizationOptions.locale);
            }
        };
        TimeScale.prototype._private__doFixLeftEdge = function () {
            if (!this._private__options.fixLeftEdge) {
                return;
            }
            var firstIndex = this._private__firstIndex();
            if (firstIndex === null) {
                return;
            }
            var visibleRange = this.visibleStrictRange();
            if (visibleRange === null) {
                return;
            }
            var delta = visibleRange.left() - firstIndex;
            if (delta < 0) {
                var leftEdgeOffset = this._private__rightOffset - delta - 1;
                this.setRightOffset(leftEdgeOffset);
            }
            this._private__correctBarSpacing();
        };
        TimeScale.prototype._private__doFixRightEdge = function () {
            this._private__correctOffset();
            this._private__correctBarSpacing();
        };
        return TimeScale;
    }());
    // eslint-disable-next-line complexity
    function weightToTickMarkType(weight, timeVisible, secondsVisible) {
        switch (weight) {
            case 0 /* LessThanSecond */:
            case 10 /* Second */:
                return timeVisible
                    ? (secondsVisible ? 4 /* TimeWithSeconds */ : 3 /* Time */)
                    : 2 /* DayOfMonth */;
            case 20 /* Minute1 */:
            case 21 /* Minute5 */:
            case 22 /* Minute30 */:
            case 30 /* Hour1 */:
            case 31 /* Hour3 */:
            case 32 /* Hour6 */:
            case 33 /* Hour12 */:
                return timeVisible ? 3 /* Time */ : 2 /* DayOfMonth */;
            case 50 /* Day */:
                return 2 /* DayOfMonth */;
            case 60 /* Month */:
                return 1 /* Month */;
            case 70 /* Year */:
                return 0 /* Year */;
        }
    }

    var WatermarkRenderer = /** @class */ (function (_super) {
        __extends(WatermarkRenderer, _super);
        function WatermarkRenderer(data) {
            var _this = _super.call(this) || this;
            _this._private__metricsCache = new Map();
            _this._private__data = data;
            return _this;
        }
        WatermarkRenderer.prototype._internal__drawImpl = function (ctx) { };
        WatermarkRenderer.prototype._internal__drawBackgroundImpl = function (ctx) {
            if (!this._private__data._internal_visible) {
                return;
            }
            ctx.save();
            var textHeight = 0;
            for (var _i = 0, _a = this._private__data._internal_lines; _i < _a.length; _i++) {
                var line = _a[_i];
                if (line._internal_text.length === 0) {
                    continue;
                }
                ctx.font = line._internal_font;
                var textWidth = this._private__metrics(ctx, line._internal_text);
                if (textWidth > this._private__data._internal_width) {
                    line._internal_zoom = this._private__data._internal_width / textWidth;
                }
                else {
                    line._internal_zoom = 1;
                }
                textHeight += line._internal_lineHeight * line._internal_zoom;
            }
            var vertOffset = 0;
            switch (this._private__data._internal_vertAlign) {
                case 'top':
                    vertOffset = 0;
                    break;
                case 'center':
                    vertOffset = Math.max((this._private__data._internal_height - textHeight) / 2, 0);
                    break;
                case 'bottom':
                    vertOffset = Math.max((this._private__data._internal_height - textHeight), 0);
                    break;
            }
            ctx.fillStyle = this._private__data._internal_color;
            for (var _b = 0, _c = this._private__data._internal_lines; _b < _c.length; _b++) {
                var line = _c[_b];
                ctx.save();
                var horzOffset = 0;
                switch (this._private__data._internal_horzAlign) {
                    case 'left':
                        ctx.textAlign = 'left';
                        horzOffset = line._internal_lineHeight / 2;
                        break;
                    case 'center':
                        ctx.textAlign = 'center';
                        horzOffset = this._private__data._internal_width / 2;
                        break;
                    case 'right':
                        ctx.textAlign = 'right';
                        horzOffset = this._private__data._internal_width - 1 - line._internal_lineHeight / 2;
                        break;
                }
                ctx.translate(horzOffset, vertOffset);
                ctx.textBaseline = 'top';
                ctx.font = line._internal_font;
                ctx.scale(line._internal_zoom, line._internal_zoom);
                ctx.fillText(line._internal_text, 0, line._internal_vertOffset);
                ctx.restore();
                vertOffset += line._internal_lineHeight * line._internal_zoom;
            }
            ctx.restore();
        };
        WatermarkRenderer.prototype._private__metrics = function (ctx, text) {
            var fontCache = this._private__fontCache(ctx.font);
            var result = fontCache.get(text);
            if (result === undefined) {
                result = ctx.measureText(text).width;
                fontCache.set(text, result);
            }
            return result;
        };
        WatermarkRenderer.prototype._private__fontCache = function (font) {
            var fontCache = this._private__metricsCache.get(font);
            if (fontCache === undefined) {
                fontCache = new Map();
                this._private__metricsCache.set(font, fontCache);
            }
            return fontCache;
        };
        return WatermarkRenderer;
    }(ScaledRenderer));

    var WatermarkPaneView = /** @class */ (function () {
        function WatermarkPaneView(source) {
            this._private__invalidated = true;
            this._private__rendererData = {
                _internal_visible: false,
                _internal_color: '',
                _internal_height: 0,
                _internal_width: 0,
                _internal_lines: [],
                _internal_vertAlign: 'center',
                _internal_horzAlign: 'center',
            };
            this._private__renderer = new WatermarkRenderer(this._private__rendererData);
            this._private__source = source;
        }
        WatermarkPaneView.prototype.update = function () {
            this._private__invalidated = true;
        };
        WatermarkPaneView.prototype.renderer = function (height, width) {
            if (this._private__invalidated) {
                this._private__updateImpl(height, width);
                this._private__invalidated = false;
            }
            return this._private__renderer;
        };
        WatermarkPaneView.prototype._private__updateImpl = function (height, width) {
            var options = this._private__source.options();
            var data = this._private__rendererData;
            data._internal_visible = options.visible;
            if (!data._internal_visible) {
                return;
            }
            data._internal_color = options.color;
            data._internal_width = width;
            data._internal_height = height;
            data._internal_horzAlign = options.horzAlign;
            data._internal_vertAlign = options.vertAlign;
            data._internal_lines = [
                {
                    _internal_text: options.text,
                    _internal_font: makeFont(options.fontSize, options.fontFamily, options.fontStyle),
                    _internal_lineHeight: options.fontSize * 1.2,
                    _internal_vertOffset: 0,
                    _internal_zoom: 0,
                },
            ];
        };
        return WatermarkPaneView;
    }());

    var Watermark = /** @class */ (function (_super) {
        __extends(Watermark, _super);
        function Watermark(model, options) {
            var _this = _super.call(this) || this;
            _this._private__options = options;
            _this._private__paneView = new WatermarkPaneView(_this);
            return _this;
        }
        Watermark.prototype.priceAxisViews = function () {
            return [];
        };
        Watermark.prototype.paneViews = function () {
            return [this._private__paneView];
        };
        Watermark.prototype.options = function () {
            return this._private__options;
        };
        Watermark.prototype.updateAllViews = function () {
            this._private__paneView.update();
        };
        return Watermark;
    }(DataSource));

    /// <reference types="_build-time-constants" />
    /**
     * Determine how to exit the tracking mode.
     *
     * By default, mobile users will long press to deactivate the scroll and have the ability to check values and dates.
     * Another press is required to activate the scroll, be able to move left/right, zoom, etc.
     */
    var TrackingModeExitMode;
    (function (TrackingModeExitMode) {
        /**
         * Tracking Mode will be deactivated on touch end event.
         */
        TrackingModeExitMode[TrackingModeExitMode["OnTouchEnd"] = 0] = "OnTouchEnd";
        /**
         * Tracking Mode will be deactivated on the next tap event.
         */
        TrackingModeExitMode[TrackingModeExitMode["OnNextTap"] = 1] = "OnNextTap";
    })(TrackingModeExitMode || (TrackingModeExitMode = {}));
    var ChartModel = /** @class */ (function () {
        function ChartModel(invalidateHandler, options) {
            this._private__panes = [];
            this._private__panesToIndex = new Map();
            this._private__serieses = [];
            this._private__width = 0;
            this._private__initialTimeScrollPos = null;
            this._private__hoveredSource = null;
            this._private__priceScalesOptionsChanged = new Delegate();
            this._private__crosshairMoved = new Delegate();
            this._private__suppressSeriesMoving = false;
            this._private__gradientColorsCache = null;
            this._private__invalidateHandler = invalidateHandler;
            this._private__options = options;
            this._private__rendererOptionsProvider = new PriceAxisRendererOptionsProvider(this);
            this._private__timeScale = new TimeScale(this, options.timeScale, this._private__options.localization);
            this._private__crosshair = new Crosshair(this, options.crosshair);
            this._private__watermark = new Watermark(this, options.watermark);
            this._private__magnet = new Magnet(options.crosshair.magnetThreshold);
            this._private__lineToolCreator = new LineToolCreator(this);
            this.createPane();
            this._private__panes[0].setStretchFactor(DEFAULT_STRETCH_FACTOR * 2);
            this._private__backgroundTopColor = this._private__getBackgroundColor(0 /* Top */);
            this._private__backgroundBottomColor = this._private__getBackgroundColor(1 /* Bottom */);
        }
        ChartModel.prototype.fullUpdate = function () {
            this._private__invalidate(new InvalidateMask(3 /* Full */));
        };
        ChartModel.prototype.lightUpdate = function () {
            this._private__invalidate(new InvalidateMask(2 /* Light */));
        };
        ChartModel.prototype.cursorUpdate = function () {
            this._private__invalidate(new InvalidateMask(1 /* Cursor */));
        };
        ChartModel.prototype.updateSource = function (source) {
            var inv = this._private__invalidationMaskForSource(source);
            this._private__invalidate(inv);
        };
        ChartModel.prototype.hoveredSource = function () {
            return this._private__hoveredSource;
        };
        ChartModel.prototype.dataSources = function () {
            var sources = [];
            for (var _i = 0, _a = this._private__panes; _i < _a.length; _i++) {
                var pane = _a[_i];
                for (var _b = 0, _c = pane.dataSources(); _b < _c.length; _b++) {
                    var paneSource = _c[_b];
                    sources.push(paneSource);
                }
            }
            return sources;
        };
        ChartModel.prototype.setHoveredSource = function (source) {
            var prevSource = this._private__hoveredSource;
            this._private__hoveredSource = source;
            if (prevSource !== null) {
                this.updateSource(prevSource.source);
            }
            if (source !== null) {
                this.updateSource(source.source);
            }
        };
        ChartModel.prototype.options = function () {
            return this._private__options;
        };
        ChartModel.prototype.applyOptions = function (options) {
            merge(this._private__options, options);
            this._private__panes.forEach(function (p) { return p.applyScaleOptions(options); });
            if (options.timeScale !== undefined) {
                this._private__timeScale.applyOptions(options.timeScale);
            }
            if (options.localization !== undefined) {
                this._private__timeScale.applyLocalizationOptions(options.localization);
            }
            if (options.leftPriceScale || options.rightPriceScale) {
                this._private__priceScalesOptionsChanged.fire();
            }
            this._private__backgroundTopColor = this._private__getBackgroundColor(0 /* Top */);
            this._private__backgroundBottomColor = this._private__getBackgroundColor(1 /* Bottom */);
            this.fullUpdate();
        };
        ChartModel.prototype.applyPriceScaleOptions = function (priceScaleId, options) {
            if (priceScaleId === "left" /* Left */) {
                this.applyOptions({
                    leftPriceScale: options,
                });
                return;
            }
            else if (priceScaleId === "right" /* Right */) {
                this.applyOptions({
                    rightPriceScale: options,
                });
                return;
            }
            var res = this.findPriceScale(priceScaleId);
            if (res === null) {
                {
                    throw new Error("Trying to apply price scale options with incorrect ID: ".concat(priceScaleId));
                }
            }
            res.priceScale.applyOptions(options);
            this._private__priceScalesOptionsChanged.fire();
        };
        ChartModel.prototype.findPriceScale = function (priceScaleId) {
            for (var _i = 0, _a = this._private__panes; _i < _a.length; _i++) {
                var pane = _a[_i];
                var priceScale = pane.priceScaleById(priceScaleId);
                if (priceScale !== null) {
                    return {
                        pane: pane,
                        priceScale: priceScale,
                    };
                }
            }
            return null;
        };
        ChartModel.prototype.timeScale = function () {
            return this._private__timeScale;
        };
        ChartModel.prototype.panes = function () {
            return this._private__panes;
        };
        ChartModel.prototype.watermarkSource = function () {
            return this._private__watermark;
        };
        ChartModel.prototype.lineToolCreator = function () {
            return this._private__lineToolCreator;
        };
        ChartModel.prototype.crosshairSource = function () {
            return this._private__crosshair;
        };
        ChartModel.prototype.magnet = function () {
            return this._private__magnet;
        };
        ChartModel.prototype.crosshairMoved = function () {
            return this._private__crosshairMoved;
        };
        ChartModel.prototype.setPaneHeight = function (pane, height) {
            pane.setHeight(height);
            this.recalculateAllPanes();
        };
        ChartModel.prototype.setWidth = function (width) {
            this._private__width = width;
            this._private__timeScale.setWidth(this._private__width);
            this._private__panes.forEach(function (pane) { return pane.setWidth(width); });
            this.recalculateAllPanes();
        };
        ChartModel.prototype.createPane = function (index) {
            if (index !== undefined) {
                if (index > this._private__panes.length) {
                    for (var i = this._private__panes.length; i < index; i++) {
                        this.createPane(i);
                    }
                }
                else if (index < this._private__panes.length) {
                    return this._private__panes[index];
                }
            }
            var actualIndex = (index === undefined) ? (this._private__panes.length - 1) + 1 : index;
            var pane = new Pane(this._private__timeScale, this, actualIndex);
            if (index !== undefined) {
                this._private__panes.splice(index, 0, pane);
            }
            else {
                // adding to the end - common case
                this._private__panes.push(pane);
            }
            this._private__buildPaneIndexMapping();
            // we always do autoscaling on the creation
            // if autoscale option is true, it is ok, just recalculate by invalidation mask
            // if autoscale option is false, autoscale anyway on the first draw
            // also there is a scenario when autoscale is true in constructor and false later on applyOptions
            var mask = new InvalidateMask(3 /* Full */);
            mask.invalidatePane(actualIndex, {
                level: 0 /* None */,
                autoScale: true,
            });
            this._private__invalidate(mask);
            return pane;
        };
        ChartModel.prototype.removePane = function (index) {
            var _this = this;
            if (index === 0) {
                // we don't support removing the first pane.
                return;
            }
            var paneToRemove = this._private__panes[index];
            paneToRemove.orderedSources().forEach(function (source) {
                if (source instanceof Series) {
                    _this.removeSeries(source);
                }
            });
            this._private__suppressSeriesMoving = true;
            if (index !== this._private__panes.length - 1) {
                var _loop_1 = function (i) {
                    var pane = this_1._private__panes[i];
                    pane.orderedSources().forEach(function (source) {
                        if (source instanceof Series) {
                            source.applyOptions({ pane: i - 1 });
                        }
                    });
                };
                var this_1 = this;
                // this is not the last pane
                for (var i = index + 1; i < this._private__panes.length; i++) {
                    _loop_1(i);
                }
            }
            this._private__panes.splice(index, 1);
            this._private__suppressSeriesMoving = false;
            this._private__buildPaneIndexMapping();
            var mask = new InvalidateMask(3 /* Full */);
            this._private__invalidate(mask);
        };
        ChartModel.prototype.swapPane = function (first, second) {
            var firstPane = this._private__panes[first];
            var secondPane = this._private__panes[second];
            this._private__suppressSeriesMoving = true;
            firstPane.orderedSources().forEach(function (source) {
                if (source instanceof Series) {
                    source.applyOptions({ pane: second });
                }
            });
            secondPane.orderedSources().forEach(function (source) {
                if (source instanceof Series) {
                    source.applyOptions({ pane: first });
                }
            });
            this._private__panes[first] = secondPane;
            this._private__panes[second] = firstPane;
            this._private__suppressSeriesMoving = false;
            this._private__buildPaneIndexMapping();
            this._private__invalidate(new InvalidateMask(3 /* Full */));
        };
        ChartModel.prototype.startScalePrice = function (pane, priceScale, x) {
            pane.startScalePrice(priceScale, x);
        };
        ChartModel.prototype.scalePriceTo = function (pane, priceScale, x) {
            pane.scalePriceTo(priceScale, x);
            this.updateCrosshair();
            this._private__invalidate(this._private__paneInvalidationMask(pane, 2 /* Light */));
        };
        ChartModel.prototype.endScalePrice = function (pane, priceScale) {
            pane.endScalePrice(priceScale);
            this._private__invalidate(this._private__paneInvalidationMask(pane, 2 /* Light */));
        };
        ChartModel.prototype.startScrollPrice = function (pane, priceScale, x) {
            if (priceScale.isAutoScale()) {
                return;
            }
            pane.startScrollPrice(priceScale, x);
        };
        ChartModel.prototype.scrollPriceTo = function (pane, priceScale, x) {
            if (priceScale.isAutoScale()) {
                return;
            }
            pane.scrollPriceTo(priceScale, x);
            this.updateCrosshair();
            this._private__invalidate(this._private__paneInvalidationMask(pane, 2 /* Light */));
        };
        ChartModel.prototype.endScrollPrice = function (pane, priceScale) {
            if (priceScale.isAutoScale()) {
                return;
            }
            pane.endScrollPrice(priceScale);
            this._private__invalidate(this._private__paneInvalidationMask(pane, 2 /* Light */));
        };
        ChartModel.prototype.resetPriceScale = function (pane, priceScale) {
            pane.resetPriceScale(priceScale);
            this._private__invalidate(this._private__paneInvalidationMask(pane, 2 /* Light */));
        };
        ChartModel.prototype.startScaleTime = function (position) {
            this._private__timeScale.startScale(position);
        };
        /**
         * Zoom in/out the chart (depends on scale value).
         *
         * @param pointX - X coordinate of the point to apply the zoom (the point which should stay on its place)
         * @param scale - Zoom value. Negative value means zoom out, positive - zoom in.
         */
        ChartModel.prototype.zoomTime = function (pointX, scale) {
            var timeScale = this.timeScale();
            if (timeScale.isEmpty() || scale === 0) {
                return;
            }
            var timeScaleWidth = timeScale.width();
            pointX = Math.max(1, Math.min(pointX, timeScaleWidth));
            timeScale.zoom(pointX, scale);
            this.recalculateAllPanes();
        };
        ChartModel.prototype.scrollChart = function (x) {
            this.startScrollTime(0);
            this.scrollTimeTo(x);
            this.endScrollTime();
        };
        ChartModel.prototype.scaleTimeTo = function (x) {
            this._private__timeScale.scaleTo(x);
            this.recalculateAllPanes();
        };
        ChartModel.prototype.endScaleTime = function () {
            this._private__timeScale.endScale();
            this.lightUpdate();
        };
        ChartModel.prototype.startScrollTime = function (x) {
            this._private__initialTimeScrollPos = x;
            this._private__timeScale.startScroll(x);
        };
        ChartModel.prototype.scrollTimeTo = function (x) {
            var res = false;
            if (this._private__initialTimeScrollPos !== null && Math.abs(x - this._private__initialTimeScrollPos) > 20) {
                this._private__initialTimeScrollPos = null;
                res = true;
            }
            this._private__timeScale.scrollTo(x);
            this.recalculateAllPanes();
            return res;
        };
        ChartModel.prototype.endScrollTime = function () {
            this._private__timeScale.endScroll();
            this.lightUpdate();
            this._private__initialTimeScrollPos = null;
        };
        ChartModel.prototype.serieses = function () {
            return this._private__serieses;
        };
        ChartModel.prototype.setAndSaveCurrentPosition = function (x, y, pane) {
            this._private__crosshair.saveOriginCoord(x, y);
            var price = NaN;
            var index = this._private__timeScale.coordinateToIndex(x);
            var visibleBars = this._private__timeScale.visibleStrictRange();
            if (visibleBars !== null) {
                index = Math.min(Math.max(visibleBars.left(), index), visibleBars.right());
            }
            var priceScale = pane.defaultPriceScale();
            var firstValue = priceScale.firstValue();
            if (firstValue !== null) {
                price = priceScale.coordinateToPrice(y, firstValue);
            }
            price = this._private__magnet.align(price, index, pane);
            this._private__crosshair.setPosition(index, price, pane);
            this.cursorUpdate();
            var point = new Point(x, y);
            point.paneIndex = this.getPaneIndex(pane);
            this._private__crosshairMoved.fire(this._private__crosshair.appliedIndex(), point);
        };
        ChartModel.prototype.clearCurrentPosition = function () {
            var crosshair = this.crosshairSource();
            crosshair.clearPosition();
            this.cursorUpdate();
            this._private__crosshairMoved.fire(null, null);
        };
        ChartModel.prototype.updateCrosshair = function () {
            // apply magnet
            var pane = this._private__crosshair.pane();
            if (pane !== null) {
                var x = this._private__crosshair.originCoordX();
                var y = this._private__crosshair.originCoordY();
                this.setAndSaveCurrentPosition(x, y, pane);
            }
            this._private__crosshair.updateAllViews();
        };
        ChartModel.prototype.updateTimeScale = function (newBaseIndex, newPoints, firstChangedPointIndex) {
            var oldFirstTime = this._private__timeScale.indexToTime(0);
            if (newPoints !== undefined && firstChangedPointIndex !== undefined) {
                this._private__timeScale.update(newPoints, firstChangedPointIndex);
            }
            var newFirstTime = this._private__timeScale.indexToTime(0);
            var currentBaseIndex = this._private__timeScale.baseIndex();
            var visibleBars = this._private__timeScale.visibleStrictRange();
            // if time scale cannot return current visible bars range (e.g. time scale has zero-width)
            // then we do not need to update right offset to shift visible bars range to have the same right offset as we have before new bar
            // (and actually we cannot)
            if (visibleBars !== null && oldFirstTime !== null && newFirstTime !== null) {
                var isLastSeriesBarVisible = visibleBars.contains(currentBaseIndex);
                var isLeftBarShiftToLeft = oldFirstTime.timestamp > newFirstTime.timestamp;
                var isSeriesPointsAdded = newBaseIndex !== null && newBaseIndex > currentBaseIndex;
                var isSeriesPointsAddedToRight = isSeriesPointsAdded && !isLeftBarShiftToLeft;
                var needShiftVisibleRangeOnNewBar = isLastSeriesBarVisible && this._private__timeScale.options().shiftVisibleRangeOnNewBar;
                if (isSeriesPointsAddedToRight && !needShiftVisibleRangeOnNewBar) {
                    var compensationShift = newBaseIndex - currentBaseIndex;
                    this._private__timeScale.setRightOffset(this._private__timeScale.rightOffset() - compensationShift);
                }
            }
            this._private__timeScale.setBaseIndex(newBaseIndex);
        };
        ChartModel.prototype.recalculatePane = function (pane) {
            if (pane !== null) {
                pane.recalculate();
            }
        };
        ChartModel.prototype.paneForSource = function (source) {
            var pane = this._private__panes.find(function (p) { return p.orderedSources().includes(source); });
            return pane === undefined ? null : pane;
        };
        ChartModel.prototype.recalculateAllPanes = function () {
            this._private__watermark.updateAllViews();
            this._private__panes.forEach(function (p) { return p.recalculate(); });
            this.updateCrosshair();
        };
        ChartModel.prototype.destroy = function () {
            this._private__panes.forEach(function (p) { return p.destroy(); });
            this._private__panes.length = 0;
            // to avoid memleaks
            this._private__options.localization.priceFormatter = undefined;
            this._private__options.localization.timeFormatter = undefined;
        };
        ChartModel.prototype.rendererOptionsProvider = function () {
            return this._private__rendererOptionsProvider;
        };
        ChartModel.prototype.priceAxisRendererOptions = function () {
            return this._private__rendererOptionsProvider.options();
        };
        ChartModel.prototype.priceScalesOptionsChanged = function () {
            return this._private__priceScalesOptionsChanged;
        };
        ChartModel.prototype.createSeries = function (seriesType, options) {
            var paneIndex = options.pane || 0;
            if (this._private__panes.length - 1 <= paneIndex) {
                this.createPane(paneIndex);
            }
            var pane = this._private__panes[paneIndex];
            var series = this._private__createSeries(options, seriesType, pane);
            this._private__serieses.push(series);
            if (this._private__serieses.length === 1) {
                // call fullUpdate to recalculate chart's parts geometry
                this.fullUpdate();
            }
            else {
                this.lightUpdate();
            }
            return series;
        };
        ChartModel.prototype.removeSeries = function (series) {
            var pane = this.paneForSource(series);
            var seriesIndex = this._private__serieses.indexOf(series);
            assert(seriesIndex !== -1, 'Series not found');
            this._private__serieses.splice(seriesIndex, 1);
            ensureNotNull(pane).removeDataSource(series);
            if (series.destroy) {
                series.destroy();
            }
        };
        ChartModel.prototype.createLineTool = function (lineToolType, options, points) {
            var lineTool = new LineTools[lineToolType](this, options, points);
            // TODO: iosif add to ownerSourceId pane
            this._private__panes[0].addDataSource(lineTool, this.defaultVisiblePriceScaleId());
            return lineTool;
        };
        ChartModel.prototype.moveSeriesToScale = function (series, targetScaleId) {
            var pane = ensureNotNull(this.paneForSource(series));
            pane.removeDataSource(series);
            // check if targetScaleId exists
            var target = this.findPriceScale(targetScaleId);
            if (target === null) {
                // new scale on the same pane
                var zOrder = series.zorder();
                pane.addDataSource(series, targetScaleId, zOrder);
            }
            else {
                // if move to the new scale of the same pane, keep zorder
                // if move to new pane
                var zOrder = (target.pane === pane) ? series.zorder() : undefined;
                target.pane.addDataSource(series, targetScaleId, zOrder);
            }
        };
        ChartModel.prototype.fitContent = function () {
            var mask = new InvalidateMask(2 /* Light */);
            mask.setFitContent();
            this._private__invalidate(mask);
        };
        ChartModel.prototype.setTargetLogicalRange = function (range) {
            var mask = new InvalidateMask(2 /* Light */);
            mask.applyRange(range);
            this._private__invalidate(mask);
        };
        ChartModel.prototype.resetTimeScale = function () {
            var mask = new InvalidateMask(2 /* Light */);
            mask.resetTimeScale();
            this._private__invalidate(mask);
        };
        ChartModel.prototype.setBarSpacing = function (spacing) {
            var mask = new InvalidateMask(2 /* Light */);
            mask.setBarSpacing(spacing);
            this._private__invalidate(mask);
        };
        ChartModel.prototype.setRightOffset = function (offset) {
            var mask = new InvalidateMask(2 /* Light */);
            mask.setRightOffset(offset);
            this._private__invalidate(mask);
        };
        ChartModel.prototype.defaultVisiblePriceScaleId = function () {
            return this._private__options.rightPriceScale.visible ? "right" /* Right */ : "left" /* Left */;
        };
        ChartModel.prototype.moveSeriesToPane = function (series, fromPaneIndex, newPaneIndex) {
            if (newPaneIndex === fromPaneIndex || this._private__suppressSeriesMoving) {
                // no change
                return;
            }
            if (series.options().pane !== newPaneIndex) {
                series.applyOptions({ pane: newPaneIndex });
            }
            var previousPane = this.paneForSource(series);
            previousPane === null || previousPane === void 0 ? void 0 : previousPane.removeDataSource(series);
            var newPane = this.createPane(newPaneIndex);
            this._private__addSeriesToPane(series, newPane);
        };
        ChartModel.prototype.backgroundBottomColor = function () {
            return this._private__backgroundBottomColor;
        };
        ChartModel.prototype.backgroundTopColor = function () {
            return this._private__backgroundTopColor;
        };
        ChartModel.prototype.backgroundColorAtYPercentFromTop = function (percent) {
            var bottomColor = this._private__backgroundBottomColor;
            var topColor = this._private__backgroundTopColor;
            if (bottomColor === topColor) {
                // solid background
                return bottomColor;
            }
            // gradient background
            // percent should be from 0 to 100 (we're using only integer values to make cache more efficient)
            percent = Math.max(0, Math.min(100, Math.round(percent * 100)));
            if (this._private__gradientColorsCache === null ||
                this._private__gradientColorsCache._internal_topColor !== topColor || this._private__gradientColorsCache._internal_bottomColor !== bottomColor) {
                this._private__gradientColorsCache = {
                    _internal_topColor: topColor,
                    _internal_bottomColor: bottomColor,
                    _internal_colors: new Map(),
                };
            }
            else {
                var cachedValue = this._private__gradientColorsCache._internal_colors.get(percent);
                if (cachedValue !== undefined) {
                    return cachedValue;
                }
            }
            var result = gradientColorAtPercent(topColor, bottomColor, percent / 100);
            this._private__gradientColorsCache._internal_colors.set(percent, result);
            return result;
        };
        ChartModel.prototype.getPaneIndex = function (pane) {
            var _a;
            return (_a = this._private__panesToIndex.get(pane)) !== null && _a !== void 0 ? _a : 0;
        };
        ChartModel.prototype._private__paneInvalidationMask = function (pane, level) {
            var inv = new InvalidateMask(level);
            if (pane !== null) {
                var index = this._private__panes.indexOf(pane);
                inv.invalidatePane(index, {
                    level: level,
                });
            }
            return inv;
        };
        ChartModel.prototype._private__invalidationMaskForSource = function (source, invalidateType) {
            if (invalidateType === undefined) {
                invalidateType = 2 /* Light */;
            }
            return this._private__paneInvalidationMask(this.paneForSource(source), invalidateType);
        };
        ChartModel.prototype._private__invalidate = function (mask) {
            if (this._private__invalidateHandler) {
                this._private__invalidateHandler(mask);
            }
            this._private__panes.forEach(function (pane) { return pane.grid().paneView().update(); });
        };
        ChartModel.prototype._private__createSeries = function (options, seriesType, pane) {
            var series = new Series(this, options, seriesType);
            this._private__addSeriesToPane(series, pane);
            return series;
        };
        ChartModel.prototype._private__addSeriesToPane = function (series, pane) {
            var priceScaleId = series.options().priceScaleId;
            var targetScaleId = priceScaleId !== undefined ? priceScaleId : this.defaultVisiblePriceScaleId();
            pane.addDataSource(series, targetScaleId);
            if (!isDefaultPriceScale(targetScaleId)) {
                // let's apply that options again to apply margins
                series.applyOptions(series.options());
            }
        };
        ChartModel.prototype._private__getBackgroundColor = function (side) {
            var layoutOptions = this._private__options.layout;
            if (layoutOptions.background.type === "gradient" /* VerticalGradient */) {
                return side === 0 /* Top */ ?
                    layoutOptions.background.topColor :
                    layoutOptions.background.bottomColor;
            }
            return layoutOptions.background.color;
        };
        ChartModel.prototype._private__buildPaneIndexMapping = function () {
            this._private__panesToIndex.clear();
            for (var i = 0; i < this._private__panes.length; i++) {
                this._private__panesToIndex.set(this._private__panes[i], i);
            }
        };
        return ChartModel;
    }());

    function fillUpDownCandlesticksColors(options) {
        if (options.borderColor !== undefined) {
            options.borderUpColor = options.borderColor;
            options.borderDownColor = options.borderColor;
        }
        if (options.wickColor !== undefined) {
            options.wickUpColor = options.wickColor;
            options.wickDownColor = options.wickColor;
        }
    }
    /**
     * Represents the type of the last price animation for series such as area or line.
     */
    var LastPriceAnimationMode;
    (function (LastPriceAnimationMode) {
        /**
         * Animation is always disabled
         */
        LastPriceAnimationMode[LastPriceAnimationMode["Disabled"] = 0] = "Disabled";
        /**
         * Animation is always enabled.
         */
        LastPriceAnimationMode[LastPriceAnimationMode["Continuous"] = 1] = "Continuous";
        /**
         * Animation is active after new data.
         */
        LastPriceAnimationMode[LastPriceAnimationMode["OnDataUpdate"] = 2] = "OnDataUpdate";
    })(LastPriceAnimationMode || (LastPriceAnimationMode = {}));
    function precisionByMinMove(minMove) {
        if (minMove >= 1) {
            return 0;
        }
        var i = 0;
        for (; i < 8; i++) {
            var intPart = Math.round(minMove);
            var fractPart = Math.abs(intPart - minMove);
            if (fractPart < 1e-8) {
                return i;
            }
            minMove = minMove * 10;
        }
        return i;
    }
    /**
     * Represents the source of data to be used for the horizontal price line.
     */
    var PriceLineSource;
    (function (PriceLineSource) {
        /**
         * Use the last bar data.
         */
        PriceLineSource[PriceLineSource["LastBar"] = 0] = "LastBar";
        /**
         * Use the last visible data of the chart viewport.
         */
        PriceLineSource[PriceLineSource["LastVisible"] = 1] = "LastVisible";
    })(PriceLineSource || (PriceLineSource = {}));

    var BoxVerticalAlignment;
    (function (BoxVerticalAlignment) {
        BoxVerticalAlignment["Top"] = "top";
        BoxVerticalAlignment["Middle"] = "middle";
        BoxVerticalAlignment["Bottom"] = "bottom";
    })(BoxVerticalAlignment || (BoxVerticalAlignment = {}));
    var BoxHorizontalAlignment;
    (function (BoxHorizontalAlignment) {
        BoxHorizontalAlignment["Left"] = "left";
        BoxHorizontalAlignment["Center"] = "center";
        BoxHorizontalAlignment["Right"] = "right";
    })(BoxHorizontalAlignment || (BoxHorizontalAlignment = {}));
    var TextAlignment;
    (function (TextAlignment) {
        TextAlignment["Start"] = "start";
        TextAlignment["Center"] = "center";
        TextAlignment["End"] = "end";
        TextAlignment["Left"] = "left";
        TextAlignment["Right"] = "right";
    })(TextAlignment || (TextAlignment = {}));

    /**
     * Represents a type of color.
     */
    var ColorType;
    (function (ColorType) {
        /** Solid color */
        ColorType["Solid"] = "solid";
        /** Vertical gradient color */
        ColorType["VerticalGradient"] = "gradient";
    })(ColorType || (ColorType = {}));

    /**
     * Check if a time value is a business day object.
     *
     * @param time - The time to check.
     * @returns `true` if `time` is a {@link BusinessDay} object, false otherwise.
     */
    function isBusinessDay(time) {
        return !isNumber(time) && !isString(time);
    }
    /**
     * Check if a time value is a UTC timestamp number.
     *
     * @param time - The time to check.
     * @returns `true` if `time` is a {@link UTCTimestamp} number, false otherwise.
     */
    function isUTCTimestamp(time) {
        return isNumber(time);
    }
    function isWhitespaceData(data) {
        return data.lowerValue === undefined && data.open === undefined && data.value === undefined;
    }
    function isFulfilledData(data) {
        return data.lowerValue !== undefined || data.open !== undefined || data.value !== undefined;
    }

    var defaultBindingOptions = {
        allowDownsampling: true,
    };
    function bindToDevicePixelRatio(canvas, options) {
        if (options === void 0) { options = defaultBindingOptions; }
        return new DevicePixelRatioBinding(canvas, options);
    }
    var DevicePixelRatioBinding = /** @class */ (function () {
        function DevicePixelRatioBinding(canvas, options) {
            var _this = this;
            this._resolutionMediaQueryList = null;
            this._resolutionListener = function (ev) { return _this._onResolutionChanged(); };
            this._canvasConfiguredListeners = [];
            this.canvas = canvas;
            this._canvasSize = {
                width: this.canvas.clientWidth,
                height: this.canvas.clientHeight,
            };
            this._options = options;
            this._configureCanvas();
            this._installResolutionListener();
        }
        DevicePixelRatioBinding.prototype.destroy = function () {
            this._canvasConfiguredListeners.length = 0;
            this._uninstallResolutionListener();
            this.canvas = null;
        };
        Object.defineProperty(DevicePixelRatioBinding.prototype, "canvasSize", {
            get: function () {
                return {
                    width: this._canvasSize.width,
                    height: this._canvasSize.height,
                };
            },
            enumerable: true,
            configurable: true
        });
        DevicePixelRatioBinding.prototype.resizeCanvas = function (size) {
            this._canvasSize = {
                width: size.width,
                height: size.height,
            };
            this._configureCanvas();
        };
        Object.defineProperty(DevicePixelRatioBinding.prototype, "pixelRatio", {
            get: function () {
                // According to DOM Level 2 Core specification, ownerDocument should never be null for HTMLCanvasElement
                // see https://www.w3.org/TR/2000/REC-DOM-Level-2-Core-20001113/core.html#node-ownerDoc
                var win = this.canvas.ownerDocument.defaultView;
                if (win == null) {
                    throw new Error('No window is associated with the canvas');
                }
                return win.devicePixelRatio > 1 || this._options.allowDownsampling ? win.devicePixelRatio : 1;
            },
            enumerable: true,
            configurable: true
        });
        DevicePixelRatioBinding.prototype.subscribeCanvasConfigured = function (listener) {
            this._canvasConfiguredListeners.push(listener);
        };
        DevicePixelRatioBinding.prototype.unsubscribeCanvasConfigured = function (listener) {
            this._canvasConfiguredListeners = this._canvasConfiguredListeners.filter(function (l) { return l != listener; });
        };
        DevicePixelRatioBinding.prototype._configureCanvas = function () {
            var ratio = this.pixelRatio;
            this.canvas.style.width = this._canvasSize.width + "px";
            this.canvas.style.height = this._canvasSize.height + "px";
            this.canvas.width = this._canvasSize.width * ratio;
            this.canvas.height = this._canvasSize.height * ratio;
            this._emitCanvasConfigured();
        };
        DevicePixelRatioBinding.prototype._emitCanvasConfigured = function () {
            var _this = this;
            this._canvasConfiguredListeners.forEach(function (listener) { return listener.call(_this); });
        };
        DevicePixelRatioBinding.prototype._installResolutionListener = function () {
            if (this._resolutionMediaQueryList !== null) {
                throw new Error('Resolution listener is already installed');
            }
            // According to DOM Level 2 Core specification, ownerDocument should never be null for HTMLCanvasElement
            // see https://www.w3.org/TR/2000/REC-DOM-Level-2-Core-20001113/core.html#node-ownerDoc
            var win = this.canvas.ownerDocument.defaultView;
            if (win == null) {
                throw new Error('No window is associated with the canvas');
            }
            var dppx = win.devicePixelRatio;
            this._resolutionMediaQueryList = win.matchMedia("all and (resolution: " + dppx + "dppx)");
            // IE and some versions of Edge do not support addEventListener/removeEventListener, and we are going to use the deprecated addListener/removeListener
            this._resolutionMediaQueryList.addListener(this._resolutionListener);
        };
        DevicePixelRatioBinding.prototype._uninstallResolutionListener = function () {
            if (this._resolutionMediaQueryList !== null) {
                // IE and some versions of Edge do not support addEventListener/removeEventListener, and we are going to use the deprecated addListener/removeListener
                this._resolutionMediaQueryList.removeListener(this._resolutionListener);
                this._resolutionMediaQueryList = null;
            }
        };
        DevicePixelRatioBinding.prototype._reinstallResolutionListener = function () {
            this._uninstallResolutionListener();
            this._installResolutionListener();
        };
        DevicePixelRatioBinding.prototype._onResolutionChanged = function () {
            this._configureCanvas();
            this._reinstallResolutionListener();
        };
        return DevicePixelRatioBinding;
    }());

    var Size = /** @class */ (function () {
        function Size(w, h) {
            this.w = w;
            this.h = h;
        }
        Size.prototype.equals = function (size) {
            return (this.w === size.w) && (this.h === size.h);
        };
        return Size;
    }());
    function getCanvasDevicePixelRatio(canvas) {
        return canvas.ownerDocument &&
            canvas.ownerDocument.defaultView &&
            canvas.ownerDocument.defaultView.devicePixelRatio
            || 1;
    }
    function getContext2D(canvas) {
        var ctx = ensureNotNull(canvas.getContext('2d'));
        // sometimes (very often) ctx getContext returns the same context every time
        // and there might be previous transformation
        // so let's reset it to be sure that everything is ok
        // do no use resetTransform to respect Edge
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        return ctx;
    }
    function createPreconfiguredCanvas(doc, size) {
        var canvas = doc.createElement('canvas');
        var pixelRatio = getCanvasDevicePixelRatio(canvas);
        // we should keep the layout size...
        canvas.style.width = "".concat(size.w, "px");
        canvas.style.height = "".concat(size.h, "px");
        // ...but multiply coordinate space dimensions to device pixel ratio
        canvas.width = size.w * pixelRatio;
        canvas.height = size.h * pixelRatio;
        return canvas;
    }
    function createBoundCanvas(parentElement, size) {
        var doc = ensureNotNull(parentElement.ownerDocument);
        var canvas = doc.createElement('canvas');
        parentElement.appendChild(canvas);
        var binding = bindToDevicePixelRatio(canvas, { allowDownsampling: false });
        binding.resizeCanvas({
            width: size.w,
            height: size.h,
        });
        return binding;
    }

    /**
     * When you're trying to use the library in server-side context (for instance in SSR)
     * you don't have some browser-specific variables like navigator or window
     * and if the library will use them on the top level of the library
     * the import will fail due ReferenceError
     * thus, this allows use the navigator on the top level and being imported in server-side context as well
     * See issue #446
     */
    // eslint-disable-next-line @typescript-eslint/tslint/config
    var isRunningOnClientSide = typeof window !== 'undefined';

    function isFF() {
        if (!isRunningOnClientSide) {
            return false;
        }
        return window.navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
    }
    function isIOS() {
        if (!isRunningOnClientSide) {
            return false;
        }
        // eslint-disable-next-line deprecation/deprecation
        return /iPhone|iPad|iPod/.test(window.navigator.platform);
    }
    function isChrome() {
        if (!isRunningOnClientSide) {
            return false;
        }
        return window.chrome !== undefined;
    }

    function preventScrollByWheelClick(el) {
        if (!isChrome()) {
            return;
        }
        el.addEventListener('mousedown', function (e) {
            if (e.button === 1 /* Middle */) {
                // prevent incorrect scrolling event
                e.preventDefault();
                return false;
            }
            return undefined;
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function isInputEventListener(object) {
        // eslint-disable-next-line @typescript-eslint/tslint/config
        return object.onInputEvent !== undefined;
    }
    // TODO: get rid of a lot of boolean flags, probably we should replace it with some enum
    var MouseEventHandler = /** @class */ (function () {
        function MouseEventHandler(target, handler, options) {
            var _this = this;
            this._private__clickCount = 0;
            this._private__clickTimeoutId = null;
            this._private__clickPosition = { x: Number.NEGATIVE_INFINITY, y: Number.POSITIVE_INFINITY };
            this._private__tapCount = 0;
            this._private__tapTimeoutId = null;
            this._private__tapPosition = { x: Number.NEGATIVE_INFINITY, y: Number.POSITIVE_INFINITY };
            this._private__longTapTimeoutId = null;
            this._private__longTapActive = false;
            this._private__mouseMoveStartPosition = null;
            this._private__touchMoveStartPosition = null;
            this._private__touchMoveExceededManhattanDistance = false;
            this._private__cancelClick = false;
            this._private__cancelTap = false;
            this._private__unsubscribeOutsideMouseEvents = null;
            this._private__unsubscribeOutsideTouchEvents = null;
            this._private__unsubscribeMobileSafariEvents = null;
            this._private__unsubscribeMousemove = null;
            this._private__unsubscribeRootMouseEvents = null;
            this._private__unsubscribeRootTouchEvents = null;
            this._private__startPinchMiddlePoint = null;
            this._private__startPinchDistance = 0;
            this._private__pinchPrevented = false;
            this._private__preventTouchDragProcess = false;
            this._private__mousePressed = false;
            this._private__lastTouchEventTimeStamp = 0;
            // for touchstart/touchmove/touchend events we handle only first touch
            // i.e. we don't support several active touches at the same time (except pinch event)
            this._private__activeTouchId = null;
            // accept all mouse leave events if it's not an iOS device
            // see _mouseEnterHandler, _mouseMoveHandler, _mouseLeaveHandler
            this._private__acceptMouseLeave = !isIOS();
            /**
             * In Firefox mouse events dont't fire if the mouse position is outside of the browser's border.
             * To prevent the mouse from hanging while pressed we're subscribing on the mouseleave event of the document element.
             * We're subscribing on mouseleave, but this event is actually fired on mouseup outside of the browser's border.
             */
            this._private__onFirefoxOutsideMouseUp = function (mouseUpEvent) {
                _this._private__mouseUpHandler(mouseUpEvent);
            };
            /**
             * Safari doesn't fire touchstart/mousedown events on double tap since iOS 13.
             * There are two possible solutions:
             * 1) Call preventDefault in touchEnd handler. But it also prevents click event from firing.
             * 2) Add listener on dblclick event that fires with the preceding mousedown/mouseup.
             * https://developer.apple.com/forums/thread/125073
             */
            this._private__onMobileSafariDoubleClick = function (dblClickEvent) {
                if (_this._private__firesTouchEvents(dblClickEvent)) {
                    var compatEvent = _this._private__makeCompatEvent(dblClickEvent);
                    ++_this._private__tapCount;
                    if (_this._private__tapTimeoutId && _this._private__tapCount > 1) {
                        var manhattanDistance = _this._private__touchMouseMoveWithDownInfo(getPosition(dblClickEvent), _this._private__tapPosition)._internal_manhattanDistance;
                        if (manhattanDistance < 30 /* DoubleTapManhattanDistance */ && !_this._private__cancelTap) {
                            _this._private__processTouchEvent(compatEvent, _this._private__handler.doubleTapEvent);
                        }
                        _this._private__resetTapTimeout();
                    }
                }
                else {
                    var compatEvent = _this._private__makeCompatEvent(dblClickEvent);
                    ++_this._private__clickCount;
                    if (_this._private__clickTimeoutId && _this._private__clickCount > 1) {
                        var manhattanDistance = _this._private__touchMouseMoveWithDownInfo(getPosition(dblClickEvent), _this._private__clickPosition)._internal_manhattanDistance;
                        if (manhattanDistance < 5 /* DoubleClickManhattanDistance */ && !_this._private__cancelClick) {
                            _this._private__processMouseEvent(compatEvent, _this._private__handler.mouseDoubleClickEvent);
                        }
                        _this._private__resetClickTimeout();
                    }
                }
            };
            this._private__target = target;
            this._private__handler = handler;
            this._private__options = options;
            this._private__init();
        }
        MouseEventHandler.prototype.destroy = function () {
            if (this._private__unsubscribeOutsideMouseEvents !== null) {
                this._private__unsubscribeOutsideMouseEvents();
                this._private__unsubscribeOutsideMouseEvents = null;
            }
            if (this._private__unsubscribeOutsideTouchEvents !== null) {
                this._private__unsubscribeOutsideTouchEvents();
                this._private__unsubscribeOutsideTouchEvents = null;
            }
            if (this._private__unsubscribeMousemove !== null) {
                this._private__unsubscribeMousemove();
                this._private__unsubscribeMousemove = null;
            }
            if (this._private__unsubscribeRootMouseEvents !== null) {
                this._private__unsubscribeRootMouseEvents();
                this._private__unsubscribeRootMouseEvents = null;
            }
            if (this._private__unsubscribeRootTouchEvents !== null) {
                this._private__unsubscribeRootTouchEvents();
                this._private__unsubscribeRootTouchEvents = null;
            }
            if (this._private__unsubscribeMobileSafariEvents !== null) {
                this._private__unsubscribeMobileSafariEvents();
                this._private__unsubscribeMobileSafariEvents = null;
            }
            this._private__clearLongTapTimeout();
            this._private__resetClickTimeout();
        };
        MouseEventHandler.prototype._private__mouseEnterHandler = function (enterEvent) {
            var _this = this;
            if (this._private__unsubscribeMousemove) {
                this._private__unsubscribeMousemove();
            }
            var boundMouseMoveHandler = this._private__mouseMoveHandler.bind(this);
            this._private__unsubscribeMousemove = function () {
                _this._private__target.removeEventListener('mousemove', boundMouseMoveHandler);
            };
            this._private__target.addEventListener('mousemove', boundMouseMoveHandler);
            if (this._private__firesTouchEvents(enterEvent)) {
                return;
            }
            var compatEvent = this._private__makeCompatEvent(enterEvent);
            this._private__processMouseEvent(compatEvent, this._private__handler.mouseEnterEvent);
            this._private__acceptMouseLeave = true;
        };
        MouseEventHandler.prototype._private__resetClickTimeout = function () {
            if (this._private__clickTimeoutId !== null) {
                clearTimeout(this._private__clickTimeoutId);
            }
            this._private__clickCount = 0;
            this._private__clickTimeoutId = null;
            this._private__clickPosition = { x: Number.NEGATIVE_INFINITY, y: Number.POSITIVE_INFINITY };
        };
        MouseEventHandler.prototype._private__resetTapTimeout = function () {
            if (this._private__tapTimeoutId !== null) {
                clearTimeout(this._private__tapTimeoutId);
            }
            this._private__tapCount = 0;
            this._private__tapTimeoutId = null;
            this._private__tapPosition = { x: Number.NEGATIVE_INFINITY, y: Number.POSITIVE_INFINITY };
        };
        MouseEventHandler.prototype._private__mouseMoveHandler = function (moveEvent) {
            if (this._private__mousePressed || this._private__touchMoveStartPosition !== null) {
                return;
            }
            if (this._private__firesTouchEvents(moveEvent)) {
                return;
            }
            var compatEvent = this._private__makeCompatEvent(moveEvent);
            this._private__processMouseEvent(compatEvent, this._private__handler.mouseMoveEvent);
            this._private__acceptMouseLeave = true;
        };
        MouseEventHandler.prototype._private__touchMoveHandler = function (moveEvent) {
            var touch = touchWithId(moveEvent.changedTouches, ensureNotNull(this._private__activeTouchId));
            if (touch === null) {
                return;
            }
            this._private__lastTouchEventTimeStamp = eventTimeStamp(moveEvent);
            if (this._private__startPinchMiddlePoint !== null) {
                return;
            }
            if (this._private__preventTouchDragProcess) {
                return;
            }
            // prevent pinch if move event comes faster than the second touch
            this._private__pinchPrevented = true;
            var moveInfo = this._private__touchMouseMoveWithDownInfo(getPosition(touch), ensureNotNull(this._private__touchMoveStartPosition));
            var xOffset = moveInfo._internal_xOffset, yOffset = moveInfo._internal_yOffset, manhattanDistance = moveInfo._internal_manhattanDistance;
            if (!this._private__touchMoveExceededManhattanDistance && manhattanDistance < 5 /* CancelTapManhattanDistance */) {
                return;
            }
            if (!this._private__touchMoveExceededManhattanDistance) {
                // first time when current position exceeded manhattan distance
                // vertical drag is more important than horizontal drag
                // because we scroll the page vertically often than horizontally
                var correctedXOffset = xOffset * 0.5;
                // a drag can be only if touch page scroll isn't allowed
                var isVertDrag = yOffset >= correctedXOffset && !this._private__options._internal_treatVertTouchDragAsPageScroll();
                var isHorzDrag = correctedXOffset > yOffset && !this._private__options._internal_treatHorzTouchDragAsPageScroll();
                // if drag event happened then we should revert preventDefault state to original one
                // and try to process the drag event
                // else we shouldn't prevent default of the event and ignore processing the drag event
                if (!isVertDrag && !isHorzDrag) {
                    this._private__preventTouchDragProcess = true;
                }
                this._private__touchMoveExceededManhattanDistance = true;
                // if manhattan distance is more that 5 - we should cancel tap event
                this._private__cancelTap = true;
                this._private__clearLongTapTimeout();
                this._private__resetTapTimeout();
            }
            if (!this._private__preventTouchDragProcess) {
                var compatEvent = this._private__makeCompatEvent(moveEvent, touch);
                this._private__processTouchEvent(compatEvent, this._private__handler.touchMoveEvent);
                // we should prevent default in case of touch only
                // to prevent scroll of the page
                preventDefault(moveEvent);
            }
        };
        MouseEventHandler.prototype._private__mouseMoveWithDownHandler = function (moveEvent) {
            if (moveEvent.button !== 0 /* Left */) {
                return;
            }
            var moveInfo = this._private__touchMouseMoveWithDownInfo(getPosition(moveEvent), ensureNotNull(this._private__mouseMoveStartPosition));
            var manhattanDistance = moveInfo._internal_manhattanDistance;
            if (manhattanDistance >= 5 /* CancelClickManhattanDistance */) {
                // if manhattan distance is more that 5 - we should cancel click event
                this._private__cancelClick = true;
                this._private__resetClickTimeout();
            }
            if (this._private__cancelClick) {
                // if this._cancelClick is true, that means that minimum manhattan distance is already exceeded
                var compatEvent = this._private__makeCompatEvent(moveEvent);
                this._private__processMouseEvent(compatEvent, this._private__handler.pressedMouseMoveEvent);
            }
        };
        MouseEventHandler.prototype._private__touchMouseMoveWithDownInfo = function (currentPosition, startPosition) {
            var xOffset = Math.abs(startPosition.x - currentPosition.x);
            var yOffset = Math.abs(startPosition.y - currentPosition.y);
            var manhattanDistance = xOffset + yOffset;
            return {
                _internal_xOffset: xOffset,
                _internal_yOffset: yOffset,
                _internal_manhattanDistance: manhattanDistance,
            };
        };
        // eslint-disable-next-line complexity
        MouseEventHandler.prototype._private__touchEndHandler = function (touchEndEvent) {
            var touch = touchWithId(touchEndEvent.changedTouches, ensureNotNull(this._private__activeTouchId));
            if (touch === null && touchEndEvent.touches.length === 0) {
                // something went wrong, somehow we missed the required touchend event
                // probably the browser has not sent this event
                touch = touchEndEvent.changedTouches[0];
            }
            if (touch === null) {
                return;
            }
            this._private__activeTouchId = null;
            this._private__lastTouchEventTimeStamp = eventTimeStamp(touchEndEvent);
            this._private__clearLongTapTimeout();
            this._private__touchMoveStartPosition = null;
            if (this._private__unsubscribeRootTouchEvents) {
                this._private__unsubscribeRootTouchEvents();
                this._private__unsubscribeRootTouchEvents = null;
            }
            var compatEvent = this._private__makeCompatEvent(touchEndEvent, touch);
            this._private__processTouchEvent(compatEvent, this._private__handler.touchEndEvent);
            ++this._private__tapCount;
            if (this._private__tapTimeoutId && this._private__tapCount > 1) {
                // check that both clicks are near enough
                var manhattanDistance = this._private__touchMouseMoveWithDownInfo(getPosition(touch), this._private__tapPosition)._internal_manhattanDistance;
                if (manhattanDistance < 30 /* DoubleTapManhattanDistance */ && !this._private__cancelTap) {
                    this._private__processTouchEvent(compatEvent, this._private__handler.doubleTapEvent);
                }
                this._private__resetTapTimeout();
            }
            else {
                if (!this._private__cancelTap) {
                    this._private__processTouchEvent(compatEvent, this._private__handler.tapEvent);
                    // do not fire mouse events if tap handler was executed
                    // prevent click event on new dom element (who appeared after tap)
                    if (this._private__handler.tapEvent) {
                        preventDefault(touchEndEvent);
                    }
                }
            }
            // prevent, for example, safari's dblclick-to-zoom or fast-click after long-tap
            // we handle mouseDoubleClickEvent here ourselves
            if (this._private__tapCount === 0) {
                preventDefault(touchEndEvent);
            }
            if (touchEndEvent.touches.length === 0) {
                if (this._private__longTapActive) {
                    this._private__longTapActive = false;
                    // prevent native click event
                    preventDefault(touchEndEvent);
                }
            }
        };
        MouseEventHandler.prototype._private__mouseUpHandler = function (mouseUpEvent) {
            if (mouseUpEvent.button !== 0 /* Left */) {
                return;
            }
            var compatEvent = this._private__makeCompatEvent(mouseUpEvent);
            this._private__mouseMoveStartPosition = null;
            this._private__mousePressed = false;
            if (this._private__unsubscribeRootMouseEvents) {
                this._private__unsubscribeRootMouseEvents();
                this._private__unsubscribeRootMouseEvents = null;
            }
            if (isFF()) {
                var rootElement = this._private__target.ownerDocument.documentElement;
                rootElement.removeEventListener('mouseleave', this._private__onFirefoxOutsideMouseUp);
            }
            if (this._private__firesTouchEvents(mouseUpEvent)) {
                return;
            }
            this._private__processMouseEvent(compatEvent, this._private__handler.mouseUpEvent);
            ++this._private__clickCount;
            if (this._private__clickTimeoutId && this._private__clickCount > 1) {
                // check that both clicks are near enough
                var manhattanDistance = this._private__touchMouseMoveWithDownInfo(getPosition(mouseUpEvent), this._private__clickPosition)._internal_manhattanDistance;
                if (manhattanDistance < 5 /* DoubleClickManhattanDistance */ && !this._private__cancelClick) {
                    this._private__processMouseEvent(compatEvent, this._private__handler.mouseDoubleClickEvent);
                }
                this._private__resetClickTimeout();
            }
            else {
                if (!this._private__cancelClick) {
                    this._private__processMouseEvent(compatEvent, this._private__handler.mouseClickEvent);
                }
            }
        };
        MouseEventHandler.prototype._private__clearLongTapTimeout = function () {
            if (this._private__longTapTimeoutId === null) {
                return;
            }
            clearTimeout(this._private__longTapTimeoutId);
            this._private__longTapTimeoutId = null;
        };
        MouseEventHandler.prototype._private__touchStartHandler = function (downEvent) {
            if (this._private__activeTouchId !== null) {
                return;
            }
            var touch = downEvent.changedTouches[0];
            this._private__activeTouchId = touch.identifier;
            this._private__lastTouchEventTimeStamp = eventTimeStamp(downEvent);
            var rootElement = this._private__target.ownerDocument.documentElement;
            this._private__cancelTap = false;
            this._private__touchMoveExceededManhattanDistance = false;
            this._private__preventTouchDragProcess = false;
            this._private__touchMoveStartPosition = getPosition(touch);
            if (this._private__unsubscribeRootTouchEvents) {
                this._private__unsubscribeRootTouchEvents();
                this._private__unsubscribeRootTouchEvents = null;
            }
            {
                var boundTouchMoveWithDownHandler_1 = this._private__touchMoveHandler.bind(this);
                var boundTouchEndHandler_1 = this._private__touchEndHandler.bind(this);
                this._private__unsubscribeRootTouchEvents = function () {
                    rootElement.removeEventListener('touchmove', boundTouchMoveWithDownHandler_1);
                    rootElement.removeEventListener('touchend', boundTouchEndHandler_1);
                };
                rootElement.addEventListener('touchmove', boundTouchMoveWithDownHandler_1, { passive: false });
                rootElement.addEventListener('touchend', boundTouchEndHandler_1, { passive: false });
                this._private__clearLongTapTimeout();
                this._private__longTapTimeoutId = setTimeout(this._private__longTapHandler.bind(this, downEvent), 240 /* LongTap */);
            }
            var compatEvent = this._private__makeCompatEvent(downEvent, touch);
            this._private__processTouchEvent(compatEvent, this._private__handler.touchStartEvent);
            if (!this._private__tapTimeoutId) {
                this._private__tapCount = 0;
                this._private__tapTimeoutId = setTimeout(this._private__resetTapTimeout.bind(this), 500 /* ResetClick */);
                this._private__tapPosition = getPosition(touch);
            }
        };
        MouseEventHandler.prototype._private__mouseDownHandler = function (downEvent) {
            if (downEvent.button !== 0 /* Left */) {
                return;
            }
            var rootElement = this._private__target.ownerDocument.documentElement;
            if (isFF()) {
                rootElement.addEventListener('mouseleave', this._private__onFirefoxOutsideMouseUp);
            }
            this._private__cancelClick = false;
            this._private__mouseMoveStartPosition = getPosition(downEvent);
            if (this._private__unsubscribeRootMouseEvents) {
                this._private__unsubscribeRootMouseEvents();
                this._private__unsubscribeRootMouseEvents = null;
            }
            {
                var boundMouseMoveWithDownHandler_1 = this._private__mouseMoveWithDownHandler.bind(this);
                var boundMouseUpHandler_1 = this._private__mouseUpHandler.bind(this);
                this._private__unsubscribeRootMouseEvents = function () {
                    rootElement.removeEventListener('mousemove', boundMouseMoveWithDownHandler_1);
                    rootElement.removeEventListener('mouseup', boundMouseUpHandler_1);
                };
                rootElement.addEventListener('mousemove', boundMouseMoveWithDownHandler_1);
                rootElement.addEventListener('mouseup', boundMouseUpHandler_1);
            }
            this._private__mousePressed = true;
            if (this._private__firesTouchEvents(downEvent)) {
                return;
            }
            var compatEvent = this._private__makeCompatEvent(downEvent);
            this._private__processMouseEvent(compatEvent, this._private__handler.mouseDownEvent);
            if (!this._private__clickTimeoutId) {
                this._private__clickCount = 0;
                this._private__clickTimeoutId = setTimeout(this._private__resetClickTimeout.bind(this), 500 /* ResetClick */);
                this._private__clickPosition = getPosition(downEvent);
            }
        };
        MouseEventHandler.prototype._private__init = function () {
            var _this = this;
            this._private__target.addEventListener('mouseenter', this._private__mouseEnterHandler.bind(this));
            // Do not show context menu when something went wrong
            this._private__target.addEventListener('touchcancel', this._private__clearLongTapTimeout.bind(this));
            {
                var doc_1 = this._private__target.ownerDocument;
                var outsideHandler_1 = function (event) {
                    if (!_this._private__handler.mouseDownOutsideEvent) {
                        return;
                    }
                    if (event.target && _this._private__target.contains(event.target)) {
                        return;
                    }
                    _this._private__handler.mouseDownOutsideEvent();
                };
                this._private__unsubscribeOutsideTouchEvents = function () {
                    doc_1.removeEventListener('touchstart', outsideHandler_1);
                };
                this._private__unsubscribeOutsideMouseEvents = function () {
                    doc_1.removeEventListener('mousedown', outsideHandler_1);
                };
                doc_1.addEventListener('mousedown', outsideHandler_1);
                doc_1.addEventListener('touchstart', outsideHandler_1, { passive: true });
            }
            if (isIOS()) {
                this._private__unsubscribeMobileSafariEvents = function () {
                    _this._private__target.removeEventListener('dblclick', _this._private__onMobileSafariDoubleClick);
                };
                this._private__target.addEventListener('dblclick', this._private__onMobileSafariDoubleClick);
            }
            this._private__target.addEventListener('mouseleave', this._private__mouseLeaveHandler.bind(this));
            this._private__target.addEventListener('touchstart', this._private__touchStartHandler.bind(this), { passive: true });
            preventScrollByWheelClick(this._private__target);
            this._private__target.addEventListener('mousedown', this._private__mouseDownHandler.bind(this));
            this._private__initPinch();
            // Hey mobile Safari, what's up?
            // If mobile Safari doesn't have any touchmove handler with passive=false
            // it treats a touchstart and the following touchmove events as cancelable=false,
            // so we can't prevent them (as soon we subscribe on touchmove inside touchstart's handler).
            // And we'll get scroll of the page along with chart's one instead of only chart's scroll.
            this._private__target.addEventListener('touchmove', function () { }, { passive: false });
        };
        MouseEventHandler.prototype._private__initPinch = function () {
            var _this = this;
            if (this._private__handler.pinchStartEvent === undefined &&
                this._private__handler.pinchEvent === undefined &&
                this._private__handler.pinchEndEvent === undefined) {
                return;
            }
            this._private__target.addEventListener('touchstart', function (event) { return _this._private__checkPinchState(event.touches); }, { passive: true });
            this._private__target.addEventListener('touchmove', function (event) {
                if (event.touches.length !== 2 || _this._private__startPinchMiddlePoint === null) {
                    return;
                }
                if (_this._private__handler.pinchEvent !== undefined) {
                    var currentDistance = getDistance(event.touches[0], event.touches[1]);
                    var scale = currentDistance / _this._private__startPinchDistance;
                    _this._private__handler.pinchEvent(_this._private__startPinchMiddlePoint, scale);
                    preventDefault(event);
                }
            }, { passive: false });
            this._private__target.addEventListener('touchend', function (event) {
                _this._private__checkPinchState(event.touches);
            });
        };
        MouseEventHandler.prototype._private__checkPinchState = function (touches) {
            if (touches.length === 1) {
                this._private__pinchPrevented = false;
            }
            if (touches.length !== 2 || this._private__pinchPrevented || this._private__longTapActive) {
                this._private__stopPinch();
            }
            else {
                this._private__startPinch(touches);
            }
        };
        MouseEventHandler.prototype._private__startPinch = function (touches) {
            var box = getBoundingClientRect(this._private__target);
            this._private__startPinchMiddlePoint = {
                x: ((touches[0].clientX - box.left) + (touches[1].clientX - box.left)) / 2,
                y: ((touches[0].clientY - box.top) + (touches[1].clientY - box.top)) / 2,
            };
            this._private__startPinchDistance = getDistance(touches[0], touches[1]);
            if (this._private__handler.pinchStartEvent !== undefined) {
                this._private__handler.pinchStartEvent();
            }
            this._private__clearLongTapTimeout();
        };
        MouseEventHandler.prototype._private__stopPinch = function () {
            if (this._private__startPinchMiddlePoint === null) {
                return;
            }
            this._private__startPinchMiddlePoint = null;
            if (this._private__handler.pinchEndEvent !== undefined) {
                this._private__handler.pinchEndEvent();
            }
        };
        MouseEventHandler.prototype._private__mouseLeaveHandler = function (event) {
            if (this._private__unsubscribeMousemove) {
                this._private__unsubscribeMousemove();
            }
            if (this._private__firesTouchEvents(event)) {
                return;
            }
            if (!this._private__acceptMouseLeave) {
                // mobile Safari sometimes emits mouse leave event for no reason, there is no way to handle it in other way
                // just ignore this event if there was no mouse move or mouse enter events
                return;
            }
            var compatEvent = this._private__makeCompatEvent(event);
            this._private__processMouseEvent(compatEvent, this._private__handler.mouseLeaveEvent);
            // accept all mouse leave events if it's not an iOS device
            this._private__acceptMouseLeave = !isIOS();
        };
        MouseEventHandler.prototype._private__longTapHandler = function (event) {
            var touch = touchWithId(event.touches, ensureNotNull(this._private__activeTouchId));
            if (touch === null) {
                return;
            }
            var compatEvent = this._private__makeCompatEvent(event, touch);
            this._private__processTouchEvent(compatEvent, this._private__handler.longTapEvent);
            this._private__cancelTap = true;
            // long tap is active until touchend event with 0 touches occurred
            this._private__longTapActive = true;
        };
        MouseEventHandler.prototype._private__firesTouchEvents = function (e) {
            if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents !== undefined) {
                return e.sourceCapabilities.firesTouchEvents;
            }
            return eventTimeStamp(e) < this._private__lastTouchEventTimeStamp + 500 /* PreventFiresTouchEvents */;
        };
        MouseEventHandler.prototype._private__processTouchEvent = function (event, callback) {
            if (callback) {
                callback.call(this._private__handler, event);
            }
        };
        MouseEventHandler.prototype._private__processMouseEvent = function (event, callback) {
            if (!callback) {
                return;
            }
            callback.call(this._private__handler, event);
        };
        MouseEventHandler.prototype._private__makeCompatEvent = function (event, touch) {
            // TouchEvent has no clientX/Y coordinates:
            // We have to use the last Touch instead
            var eventLike = touch || event;
            var box = this._private__target.getBoundingClientRect() || { left: 0, top: 0 };
            return {
                clientX: eventLike.clientX,
                clientY: eventLike.clientY,
                pageX: eventLike.pageX,
                pageY: eventLike.pageY,
                screenX: eventLike.screenX,
                screenY: eventLike.screenY,
                localX: (eventLike.clientX - box.left),
                localY: (eventLike.clientY - box.top),
                ctrlKey: event.ctrlKey,
                altKey: event.altKey,
                shiftKey: event.shiftKey,
                metaKey: event.metaKey,
                isTouch: !event.type.startsWith('mouse') && event.type !== 'contextmenu' && event.type !== 'click',
                srcType: event.type,
                target: eventLike.target,
                view: event.view,
                preventDefault: function () {
                    if (event.type !== 'touchstart') {
                        // touchstart is passive and cannot be prevented
                        preventDefault(event);
                    }
                },
            };
        };
        return MouseEventHandler;
    }());
    function getBoundingClientRect(element) {
        return element.getBoundingClientRect() || { left: 0, top: 0 };
    }
    function getDistance(p1, p2) {
        var xDiff = p1.clientX - p2.clientX;
        var yDiff = p1.clientY - p2.clientY;
        return Math.sqrt(xDiff * xDiff + yDiff * yDiff);
    }
    function preventDefault(event) {
        if (event.cancelable) {
            event.preventDefault();
        }
    }
    function getPosition(eventLike) {
        return {
            x: eventLike.pageX,
            y: eventLike.pageY,
        };
    }
    function eventTimeStamp(e) {
        // for some reason e.timestamp is always 0 on iPad with magic mouse, so we use performance.now() as a fallback
        return e.timeStamp || performance.now();
    }
    function touchWithId(touches, id) {
        for (var i = 0; i < touches.length; ++i) {
            if (touches[i].identifier === id) {
                return touches[i];
            }
        }
        return null;
    }

    var SEPARATOR_HEIGHT = 1;
    var PaneSeparator = /** @class */ (function () {
        function PaneSeparator(chartWidget, topPaneIndex, bottomPaneIndex, disableResize) {
            this._private__startY = 0;
            this._private__deltaY = 0;
            this._private__totalHeight = 0;
            this._private__totalStretch = 0;
            this._private__minPaneHeight = 0;
            this._private__maxPaneHeight = 0;
            this._private__pixelStretchFactor = 0;
            this._private__mouseActive = false;
            this._private__chartWidget = chartWidget;
            this._private__paneA = chartWidget.paneWidgets()[topPaneIndex];
            this._private__paneB = chartWidget.paneWidgets()[bottomPaneIndex];
            this._private__rowElement = document.createElement('tr');
            this._private__rowElement.style.height = SEPARATOR_HEIGHT + 'px';
            this._private__cell = document.createElement('td');
            this._private__cell.style.position = 'relative';
            this._private__cell.style.padding = '0';
            this._private__cell.style.margin = '0';
            this._private__cell.style.height = '1.5px';
            this._private__cell.setAttribute('colspan', '3');
            this._private__updateBorderColor();
            this._private__rowElement.appendChild(this._private__cell);
            if (disableResize) {
                this._private__handle = null;
                this._private__mouseEventHandler = null;
            }
            else {
                this._private__handle = document.createElement('div');
                this._private__handle.style.position = 'absolute';
                this._private__handle.style.zIndex = '50';
                this._private__handle.style.top = '-3.75px';
                this._private__handle.style.height = '9px';
                this._private__handle.style.width = '100%';
                this._private__handle.style.cursor = 'row-resize';
                this._private__handle.style.backgroundColor = '#0092ea';
                this._private__handle.style.opacity = '0';
                this._private__cell.appendChild(this._private__handle);
                var handlers = {
                    mouseEnterEvent: this._private__mouseOverEvent.bind(this),
                    mouseLeaveEvent: this._private__mouseLeaveEvent.bind(this),
                    mouseDownEvent: this._private__mouseDownEvent.bind(this),
                    touchStartEvent: this._private__mouseDownEvent.bind(this),
                    pressedMouseMoveEvent: this._private__pressedMouseMoveEvent.bind(this),
                    touchMoveEvent: this._private__pressedMouseMoveEvent.bind(this),
                    mouseUpEvent: this._private__mouseUpEvent.bind(this),
                    touchEndEvent: this._private__mouseUpEvent.bind(this),
                };
                this._private__mouseEventHandler = new MouseEventHandler(this._private__handle, handlers, {
                    _internal_treatVertTouchDragAsPageScroll: function () { return false; },
                    _internal_treatHorzTouchDragAsPageScroll: function () { return true; },
                });
            }
        }
        PaneSeparator.prototype.destroy = function () {
            if (this._private__mouseEventHandler !== null) {
                this._private__mouseEventHandler.destroy();
            }
        };
        PaneSeparator.prototype._internal_getElement = function () {
            return this._private__rowElement;
        };
        PaneSeparator.prototype._internal_getSize = function () {
            return new Size(this._private__paneA.getSize().w, SEPARATOR_HEIGHT);
        };
        PaneSeparator.prototype._internal_getImage = function () {
            var size = this._internal_getSize();
            var res = createPreconfiguredCanvas(document, size);
            var ctx = getContext2D(res);
            ctx.fillStyle = this._private__chartWidget.options().timeScale.borderColor;
            ctx.fillRect(0, 0, size.w, size.h);
            return res;
        };
        PaneSeparator.prototype._internal_update = function () {
            this._private__updateBorderColor();
        };
        PaneSeparator.prototype._private__updateBorderColor = function () {
            this._private__cell.style.background =
                this._private__chartWidget.options().timeScale.borderColor;
        };
        PaneSeparator.prototype._private__mouseOverEvent = function (event) {
            if (this._private__handle !== null) {
                this._private__handle.style.opacity = '0.15';
                this._private__cell.style.background = '#0092ea';
            }
        };
        PaneSeparator.prototype._private__mouseLeaveEvent = function (event) {
            if (this._private__handle !== null && !this._private__mouseActive) {
                this._private__handle.style.opacity = '0';
                this._private__updateBorderColor();
            }
        };
        PaneSeparator.prototype._private__mouseDownEvent = function (event) {
            this._private__startY = event.pageY;
            this._private__deltaY = 0;
            this._private__totalHeight = this._private__paneA.getSize().h + this._private__paneB.getSize().h;
            this._private__totalStretch =
                this._private__paneA.stretchFactor() + this._private__paneB.stretchFactor();
            this._private__minPaneHeight = 30;
            this._private__maxPaneHeight = this._private__totalHeight - this._private__minPaneHeight;
            this._private__pixelStretchFactor = this._private__totalStretch / this._private__totalHeight;
            this._private__mouseActive = true;
        };
        PaneSeparator.prototype._private__pressedMouseMoveEvent = function (event) {
            this._private__deltaY = event.pageY - this._private__startY;
            var upperHeight = this._private__paneA.getSize().h;
            var newUpperPaneHeight = clamp(upperHeight + this._private__deltaY, this._private__minPaneHeight, this._private__maxPaneHeight);
            var newUpperPaneStretch = newUpperPaneHeight * this._private__pixelStretchFactor;
            var newLowerPaneStretch = this._private__totalStretch - newUpperPaneStretch;
            this._private__paneA.setStretchFactor(newUpperPaneStretch);
            this._private__paneB.setStretchFactor(newLowerPaneStretch);
            this._private__chartWidget.adjustSize();
            if (this._private__paneA.getSize().h !== upperHeight) {
                this._private__startY = event.pageY;
            }
            this._private__chartWidget.model().fullUpdate();
        };
        PaneSeparator.prototype._private__mouseUpEvent = function (event) {
            this._private__startY = 0;
            this._private__deltaY = 0;
            this._private__totalHeight = 0;
            this._private__totalStretch = 0;
            this._private__minPaneHeight = 0;
            this._private__maxPaneHeight = 0;
            this._private__pixelStretchFactor = 0;
            this._private__mouseActive = false;
            this._private__mouseLeaveEvent(event);
        };
        return PaneSeparator;
    }());

    function distanceBetweenPoints(pos1, pos2) {
        return pos1._internal_position - pos2._internal_position;
    }
    function speedPxPerMSec(pos1, pos2, maxSpeed) {
        var speed = (pos1._internal_position - pos2._internal_position) / (pos1._internal_time - pos2._internal_time);
        return Math.sign(speed) * Math.min(Math.abs(speed), maxSpeed);
    }
    function durationMSec(speed, dumpingCoeff) {
        var lnDumpingCoeff = Math.log(dumpingCoeff);
        return Math.log((1 /* EpsilonDistance */ * lnDumpingCoeff) / -speed) / (lnDumpingCoeff);
    }
    var KineticAnimation = /** @class */ (function () {
        function KineticAnimation(minSpeed, maxSpeed, dumpingCoeff, minMove) {
            this._private__position1 = null;
            this._private__position2 = null;
            this._private__position3 = null;
            this._private__position4 = null;
            this._private__animationStartPosition = null;
            this._private__durationMsecs = 0;
            this._private__speedPxPerMsec = 0;
            this._private__terminated = false;
            this._private__minSpeed = minSpeed;
            this._private__maxSpeed = maxSpeed;
            this._private__dumpingCoeff = dumpingCoeff;
            this._private__minMove = minMove;
        }
        KineticAnimation.prototype._internal_addPosition = function (position, time) {
            if (this._private__position1 !== null) {
                if (this._private__position1._internal_time === time) {
                    this._private__position1._internal_position = position;
                    return;
                }
                if (Math.abs(this._private__position1._internal_position - position) < this._private__minMove) {
                    return;
                }
            }
            this._private__position4 = this._private__position3;
            this._private__position3 = this._private__position2;
            this._private__position2 = this._private__position1;
            this._private__position1 = { _internal_time: time, _internal_position: position };
        };
        KineticAnimation.prototype._internal_start = function (position, time) {
            if (this._private__position1 === null || this._private__position2 === null) {
                return;
            }
            if (time - this._private__position1._internal_time > 50 /* MaxStartDelay */) {
                return;
            }
            // To calculate all the rest parameters we should calculate the speed af first
            var totalDistance = 0;
            var speed1 = speedPxPerMSec(this._private__position1, this._private__position2, this._private__maxSpeed);
            var distance1 = distanceBetweenPoints(this._private__position1, this._private__position2);
            // We're calculating weighted average speed
            // Than more distance for a segment, than more its weight
            var speedItems = [speed1];
            var distanceItems = [distance1];
            totalDistance += distance1;
            if (this._private__position3 !== null) {
                var speed2 = speedPxPerMSec(this._private__position2, this._private__position3, this._private__maxSpeed);
                // stop at this moment if direction of the segment is opposite
                if (Math.sign(speed2) === Math.sign(speed1)) {
                    var distance2 = distanceBetweenPoints(this._private__position2, this._private__position3);
                    speedItems.push(speed2);
                    distanceItems.push(distance2);
                    totalDistance += distance2;
                    if (this._private__position4 !== null) {
                        var speed3 = speedPxPerMSec(this._private__position3, this._private__position4, this._private__maxSpeed);
                        if (Math.sign(speed3) === Math.sign(speed1)) {
                            var distance3 = distanceBetweenPoints(this._private__position3, this._private__position4);
                            speedItems.push(speed3);
                            distanceItems.push(distance3);
                            totalDistance += distance3;
                        }
                    }
                }
            }
            var resultSpeed = 0;
            for (var i = 0; i < speedItems.length; ++i) {
                resultSpeed += distanceItems[i] / totalDistance * speedItems[i];
            }
            if (Math.abs(resultSpeed) < this._private__minSpeed) {
                return;
            }
            this._private__animationStartPosition = { _internal_position: position, _internal_time: time };
            this._private__speedPxPerMsec = resultSpeed;
            this._private__durationMsecs = durationMSec(Math.abs(resultSpeed), this._private__dumpingCoeff);
        };
        KineticAnimation.prototype._internal_getPosition = function (time) {
            var startPosition = ensureNotNull(this._private__animationStartPosition);
            var durationMsecs = time - startPosition._internal_time;
            return startPosition._internal_position + this._private__speedPxPerMsec * (Math.pow(this._private__dumpingCoeff, durationMsecs) - 1) / (Math.log(this._private__dumpingCoeff));
        };
        KineticAnimation.prototype._internal_finished = function (time) {
            return this._private__animationStartPosition === null || this._private__progressDuration(time) === this._private__durationMsecs;
        };
        KineticAnimation.prototype._internal_terminated = function () {
            return this._private__terminated;
        };
        KineticAnimation.prototype._internal_terminate = function () {
            this._private__terminated = true;
        };
        KineticAnimation.prototype._private__progressDuration = function (time) {
            var startPosition = ensureNotNull(this._private__animationStartPosition);
            var progress = time - startPosition._internal_time;
            return Math.min(progress, this._private__durationMsecs);
        };
        return KineticAnimation;
    }());

    var MAX_COUNT = 200;
    var LabelsImageCache = /** @class */ (function () {
        function LabelsImageCache(fontSize, color, fontFamily, fontStyle) {
            this._private__textWidthCache = new TextWidthCache(MAX_COUNT);
            this._private__fontSize = 0;
            this._private__color = '';
            this._private__font = '';
            this._private__keys = [];
            this._private__hash = new Map();
            this._private__fontSize = fontSize;
            this._private__color = color;
            this._private__font = makeFont(fontSize, fontFamily, fontStyle);
        }
        LabelsImageCache.prototype.destroy = function () {
            this._private__textWidthCache.reset();
            this._private__keys = [];
            this._private__hash.clear();
        };
        LabelsImageCache.prototype._internal_paintTo = function (ctx, text, x, y, align) {
            var label = this._private__getLabelImage(ctx, text);
            if (align !== 'left') {
                var pixelRatio = getCanvasDevicePixelRatio(ctx.canvas);
                x -= Math.floor(label._internal_textWidth * pixelRatio);
            }
            y -= Math.floor(label._internal_height / 2);
            ctx.drawImage(label._internal_canvas, x, y, label._internal_width, label._internal_height);
        };
        LabelsImageCache.prototype._private__getLabelImage = function (ctx, text) {
            var _this = this;
            var item;
            if (this._private__hash.has(text)) {
                // Cache hit!
                item = ensureDefined(this._private__hash.get(text));
            }
            else {
                if (this._private__keys.length >= MAX_COUNT) {
                    var key = ensureDefined(this._private__keys.shift());
                    this._private__hash.delete(key);
                }
                var pixelRatio = getCanvasDevicePixelRatio(ctx.canvas);
                var margin_1 = Math.ceil(this._private__fontSize / 4.5);
                var baselineOffset_1 = Math.round(this._private__fontSize / 10);
                var textWidth = Math.ceil(this._private__textWidthCache.measureText(ctx, text));
                var width = ceiledEven(Math.round(textWidth + margin_1 * 2));
                var height_1 = ceiledEven(this._private__fontSize + margin_1 * 2);
                var canvas = createPreconfiguredCanvas(document, new Size(width, height_1));
                // Allocate new
                item = {
                    _internal_text: text,
                    _internal_textWidth: Math.round(Math.max(1, textWidth)),
                    _internal_width: Math.ceil(width * pixelRatio),
                    _internal_height: Math.ceil(height_1 * pixelRatio),
                    _internal_canvas: canvas,
                };
                if (textWidth !== 0) {
                    this._private__keys.push(item._internal_text);
                    this._private__hash.set(item._internal_text, item);
                }
                ctx = getContext2D(item._internal_canvas);
                drawScaled(ctx, pixelRatio, function () {
                    ctx.font = _this._private__font;
                    ctx.fillStyle = _this._private__color;
                    ctx.fillText(text, 0, height_1 - margin_1 - baselineOffset_1);
                });
            }
            return item;
        };
        return LabelsImageCache;
    }());

    var PriceAxisWidget = /** @class */ (function () {
        function PriceAxisWidget(pane, options, rendererOptionsProvider, side) {
            var _this = this;
            this._private__priceScale = null;
            this._private__size = null;
            this._private__mousedown = false;
            this._private__widthCache = new TextWidthCache(50);
            this._private__tickMarksCache = new LabelsImageCache(11, '#000');
            this._private__color = null;
            this._private__font = null;
            this._private__prevOptimalWidth = 0;
            this._private__isSettingSize = false;
            this._private__canvasConfiguredHandler = function () {
                _this._private__recreateTickMarksCache(_this._private__rendererOptionsProvider.options());
                if (!_this._private__isSettingSize) {
                    _this._private__pane.chart().model().lightUpdate();
                }
            };
            this._private__topCanvasConfiguredHandler = function () {
                if (_this._private__isSettingSize) {
                    return;
                }
                _this._private__pane.chart().model().lightUpdate();
            };
            this._private__pane = pane;
            this._private__options = options;
            this._private__rendererOptionsProvider = rendererOptionsProvider;
            this._private__isLeft = side === 'left';
            this._private__cell = document.createElement('div');
            this._private__cell.style.height = '100%';
            this._private__cell.style.overflow = 'hidden';
            this._private__cell.style.width = '25px';
            this._private__cell.style.left = '0';
            this._private__cell.style.position = 'relative';
            this._private__canvasBinding = createBoundCanvas(this._private__cell, new Size(16, 16));
            this._private__canvasBinding.subscribeCanvasConfigured(this._private__canvasConfiguredHandler);
            var canvas = this._private__canvasBinding.canvas;
            canvas.style.position = 'absolute';
            canvas.style.zIndex = '1';
            canvas.style.left = '0';
            canvas.style.top = '0';
            this._private__topCanvasBinding = createBoundCanvas(this._private__cell, new Size(16, 16));
            this._private__topCanvasBinding.subscribeCanvasConfigured(this._private__topCanvasConfiguredHandler);
            var topCanvas = this._private__topCanvasBinding.canvas;
            topCanvas.style.position = 'absolute';
            topCanvas.style.zIndex = '2';
            topCanvas.style.left = '0';
            topCanvas.style.top = '0';
            var handler = {
                mouseDownEvent: this._private__mouseDownEvent.bind(this),
                touchStartEvent: this._private__mouseDownEvent.bind(this),
                pressedMouseMoveEvent: this._private__pressedMouseMoveEvent.bind(this),
                touchMoveEvent: this._private__pressedMouseMoveEvent.bind(this),
                mouseDownOutsideEvent: this._private__mouseDownOutsideEvent.bind(this),
                mouseUpEvent: this._private__mouseUpEvent.bind(this),
                touchEndEvent: this._private__mouseUpEvent.bind(this),
                mouseDoubleClickEvent: this._private__mouseDoubleClickEvent.bind(this),
                doubleTapEvent: this._private__mouseDoubleClickEvent.bind(this),
                mouseEnterEvent: this._private__mouseEnterEvent.bind(this),
                mouseLeaveEvent: this._private__mouseLeaveEvent.bind(this),
            };
            this._private__mouseEventHandler = new MouseEventHandler(this._private__topCanvasBinding.canvas, handler, {
                _internal_treatVertTouchDragAsPageScroll: function () { return false; },
                _internal_treatHorzTouchDragAsPageScroll: function () { return true; },
            });
        }
        PriceAxisWidget.prototype.destroy = function () {
            this._private__mouseEventHandler.destroy();
            this._private__topCanvasBinding.unsubscribeCanvasConfigured(this._private__topCanvasConfiguredHandler);
            this._private__topCanvasBinding.destroy();
            this._private__canvasBinding.unsubscribeCanvasConfigured(this._private__canvasConfiguredHandler);
            this._private__canvasBinding.destroy();
            if (this._private__priceScale !== null) {
                this._private__priceScale.onMarksChanged().unsubscribeAll(this);
            }
            this._private__priceScale = null;
            this._private__tickMarksCache.destroy();
        };
        PriceAxisWidget.prototype.getElement = function () {
            return this._private__cell;
        };
        PriceAxisWidget.prototype.floating = function () {
            var _a;
            return !!((_a = this._private__priceScale) === null || _a === void 0 ? void 0 : _a.options().floating);
        };
        PriceAxisWidget.prototype.lineColor = function () {
            return ensureNotNull(this._private__priceScale).options().borderColor;
        };
        PriceAxisWidget.prototype.textColor = function () {
            return this._private__options.textColor;
        };
        PriceAxisWidget.prototype.fontSize = function () {
            return this._private__options.fontSize;
        };
        PriceAxisWidget.prototype.baseFont = function () {
            return makeFont(this.fontSize(), this._private__options.fontFamily);
        };
        PriceAxisWidget.prototype.rendererOptions = function () {
            var _a;
            var options = this._private__rendererOptionsProvider.options();
            options.align = this._private__isLeft ? 'right' : 'left';
            var isColorChanged = this._private__color !== options.color;
            var isFontChanged = this._private__font !== options.font;
            if (isColorChanged || isFontChanged) {
                this._private__recreateTickMarksCache(options);
                this._private__color = options.color;
            }
            if (isFontChanged) {
                this._private__widthCache.reset();
                this._private__font = options.font;
            }
            if ((_a = this._private__priceScale) === null || _a === void 0 ? void 0 : _a.options().floating) {
                if (this._private__isLeft) {
                    this._private__cell.style.bottom = '0';
                    this._private__cell.style.zIndex = '2';
                    this._private__cell.style.position = 'absolute';
                }
                else {
                    this._private__cell.style.left = '-100%';
                }
                this._private__cell.style.pointerEvents = 'none';
            }
            else {
                this._private__cell.style.left = 'initial';
                this._private__cell.style.bottom = 'initial';
                this._private__cell.style.zIndex = 'initial';
                this._private__cell.style.position = 'relative';
                this._private__cell.style.pointerEvents = 'initial';
            }
            return options;
        };
        PriceAxisWidget.prototype.optimalWidth = function () {
            if (this._private__priceScale === null) {
                return 0;
            }
            // need some reasonable value for scale while initialization
            var tickMarkMaxWidth = 34;
            var rendererOptions = this.rendererOptions();
            var ctx = getContext2D(this._private__canvasBinding.canvas);
            var tickMarks = this._private__priceScale.marks();
            ctx.font = this.baseFont();
            if (tickMarks.length > 0) {
                tickMarkMaxWidth = Math.max(this._private__widthCache.measureText(ctx, tickMarks[0].label), this._private__widthCache.measureText(ctx, tickMarks[tickMarks.length - 1].label));
            }
            var views = this._private__dataSources().filter(function (view) { return view instanceof PriceAxisLabelView; });
            for (var j = views.length; j--;) {
                var width = this._private__widthCache.measureText(ctx, views[j]._internal_text());
                if (width > tickMarkMaxWidth) {
                    tickMarkMaxWidth = width;
                }
            }
            var firstValue = this._private__priceScale.firstValue();
            if (firstValue !== null && this._private__size !== null) {
                var topValue = this._private__priceScale.coordinateToPrice(1, firstValue);
                var bottomValue = this._private__priceScale.coordinateToPrice(this._private__size.h - 2, firstValue);
                tickMarkMaxWidth = Math.max(tickMarkMaxWidth, this._private__widthCache.measureText(ctx, this._private__priceScale.formatPrice(Math.floor(Math.min(topValue, bottomValue)) + 0.11111111111111, firstValue)), this._private__widthCache.measureText(ctx, this._private__priceScale.formatPrice(Math.ceil(Math.max(topValue, bottomValue)) - 0.11111111111111, firstValue)));
            }
            var resultTickMarksMaxWidth = tickMarkMaxWidth || 34 /* DefaultOptimalWidth */;
            var res = Math.ceil(rendererOptions.borderSize +
                rendererOptions.tickLength +
                rendererOptions.paddingInner +
                rendererOptions.paddingOuter +
                resultTickMarksMaxWidth);
            // make it even
            res += res % 2;
            return res;
        };
        PriceAxisWidget.prototype.setSize = function (size) {
            if (size.w < 0 || size.h < 0) {
                throw new Error('Try to set invalid size to PriceAxisWidget ' + JSON.stringify(size));
            }
            if (this._private__size === null || !this._private__size.equals(size)) {
                this._private__size = size;
                this._private__isSettingSize = true;
                this._private__canvasBinding.resizeCanvas({ width: size.w, height: size.h });
                this._private__topCanvasBinding.resizeCanvas({ width: size.w, height: size.h });
                this._private__isSettingSize = false;
                this._private__cell.style.width = size.w + 'px';
                // need this for IE11
                this._private__cell.style.height = size.h + 'px';
                this._private__cell.style.minWidth = size.w + 'px'; // for right calculate position of .pane-legend
            }
        };
        PriceAxisWidget.prototype.getWidth = function () {
            return ensureNotNull(this._private__size).w;
        };
        PriceAxisWidget.prototype.setPriceScale = function (priceScale) {
            if (this._private__priceScale === priceScale) {
                return;
            }
            if (this._private__priceScale !== null) {
                this._private__priceScale.onMarksChanged().unsubscribeAll(this);
            }
            this._private__priceScale = priceScale;
            priceScale.onMarksChanged().subscribe(this._private__onMarksChanged.bind(this), this);
        };
        PriceAxisWidget.prototype.priceScale = function () {
            return this._private__priceScale;
        };
        PriceAxisWidget.prototype.reset = function () {
            var pane = this._private__pane.state();
            var model = this._private__pane.chart().model();
            model.resetPriceScale(pane, ensureNotNull(this.priceScale()));
        };
        PriceAxisWidget.prototype.paint = function (type) {
            if (this._private__size === null) {
                return;
            }
            if (type !== 1 /* Cursor */) {
                var ctx = getContext2D(this._private__canvasBinding.canvas);
                var renderParams_1 = this._private__pane.canvasRenderParams(this._private__canvasBinding);
                this._private__alignLabels();
                this._private__drawBackground(ctx, renderParams_1);
                this._private__drawBorder(ctx, renderParams_1);
                this._private__drawSources(ctx, renderParams_1, true);
                this._private__drawTickMarks(ctx, renderParams_1);
                this._private__drawSources(ctx, renderParams_1);
            }
            var topCtx = getContext2D(this._private__topCanvasBinding.canvas);
            var renderParams = this._private__pane.canvasRenderParams(this._private__topCanvasBinding);
            var width = this._private__size.w;
            var height = this._private__size.h;
            drawScaled(topCtx, renderParams.pixelRatio, function () {
                topCtx.clearRect(0, 0, width, height);
            });
            this._private__drawCrosshairLabel(topCtx, renderParams);
        };
        PriceAxisWidget.prototype.getImage = function () {
            return this._private__canvasBinding.canvas;
        };
        PriceAxisWidget.prototype.update = function () {
            var _a;
            // this call has side-effect - it regenerates marks on the price scale
            (_a = this._private__priceScale) === null || _a === void 0 ? void 0 : _a.marks();
        };
        PriceAxisWidget.prototype._private__mouseDownEvent = function (e) {
            if (this._private__priceScale === null || this._private__priceScale.isEmpty() || !this._private__pane.chart().options().handleScale.axisPressedMouseMove.price) {
                return;
            }
            var model = this._private__pane.chart().model();
            var pane = this._private__pane.state();
            this._private__mousedown = true;
            model.startScalePrice(pane, this._private__priceScale, e.localY);
        };
        PriceAxisWidget.prototype._private__pressedMouseMoveEvent = function (e) {
            if (this._private__priceScale === null || !this._private__pane.chart().options().handleScale.axisPressedMouseMove.price) {
                return;
            }
            var model = this._private__pane.chart().model();
            var pane = this._private__pane.state();
            var priceScale = this._private__priceScale;
            model.scalePriceTo(pane, priceScale, e.localY);
        };
        PriceAxisWidget.prototype._private__mouseDownOutsideEvent = function () {
            if (this._private__priceScale === null || !this._private__pane.chart().options().handleScale.axisPressedMouseMove.price) {
                return;
            }
            var model = this._private__pane.chart().model();
            var pane = this._private__pane.state();
            var priceScale = this._private__priceScale;
            if (this._private__mousedown) {
                this._private__mousedown = false;
                model.endScalePrice(pane, priceScale);
            }
        };
        PriceAxisWidget.prototype._private__mouseUpEvent = function (e) {
            if (this._private__priceScale === null || !this._private__pane.chart().options().handleScale.axisPressedMouseMove.price) {
                return;
            }
            var model = this._private__pane.chart().model();
            var pane = this._private__pane.state();
            this._private__mousedown = false;
            model.endScalePrice(pane, this._private__priceScale);
        };
        PriceAxisWidget.prototype._private__mouseDoubleClickEvent = function (e) {
            if (this._private__pane.chart().options().handleScale.axisDoubleClickReset) {
                this.reset();
            }
        };
        PriceAxisWidget.prototype._private__mouseEnterEvent = function (e) {
            if (this._private__priceScale === null) {
                return;
            }
            var model = this._private__pane.chart().model();
            if (model.options().handleScale.axisPressedMouseMove.price && !this._private__priceScale.isPercentage() && !this._private__priceScale.isIndexedTo100()) {
                this._private__setCursor(1 /* NsResize */);
            }
        };
        PriceAxisWidget.prototype._private__mouseLeaveEvent = function (e) {
            this._private__setCursor(0 /* Default */);
        };
        PriceAxisWidget.prototype._private__dataSources = function () {
            var _this = this;
            var res = [];
            var priceScale = (this._private__priceScale === null) ? undefined : this._private__priceScale;
            var addViewsForSources = function (sources) {
                for (var i = 0; i < sources.length; ++i) {
                    var source = sources[i];
                    var views = source.priceAxisViews(_this._private__pane.state(), priceScale);
                    for (var j = 0; j < views.length; j++) {
                        res.push(views[j]);
                    }
                }
            };
            // calculate max and min coordinates for views on selection
            // crosshair individually
            addViewsForSources(this._private__pane.state().orderedSources());
            return res;
        };
        PriceAxisWidget.prototype._private__drawBackground = function (ctx, renderParams) {
            var _this = this;
            if (this._private__size === null) {
                return;
            }
            var width = this._private__size.w;
            var height = this._private__size.h;
            drawScaled(ctx, renderParams.pixelRatio, function () {
                var model = _this._private__pane.state().model();
                var topColor = model.backgroundTopColor();
                var bottomColor = model.backgroundBottomColor();
                if (topColor === bottomColor) {
                    clearRect(ctx, 0, 0, width, height, topColor);
                }
                else {
                    clearRectWithGradient(ctx, 0, 0, width, height, topColor, bottomColor);
                }
            });
        };
        PriceAxisWidget.prototype._private__drawBorder = function (ctx, renderParams) {
            if (this._private__size === null || this._private__priceScale === null || !this._private__priceScale.options().borderVisible) {
                return;
            }
            ctx.save();
            ctx.fillStyle = this.lineColor();
            var pixelRatio = renderParams.pixelRatio;
            var borderSize = Math.max(1, Math.floor(this.rendererOptions().borderSize * pixelRatio));
            var left;
            if (this._private__isLeft) {
                left = Math.floor(this._private__size.w * pixelRatio) - borderSize;
            }
            else {
                left = 0;
            }
            ctx.fillRect(left, 0, borderSize, Math.ceil(this._private__size.h * pixelRatio));
            ctx.restore();
        };
        PriceAxisWidget.prototype._private__drawTickMarks = function (ctx, renderParams) {
            if (this._private__size === null || this._private__priceScale === null) {
                return;
            }
            var pixelRatio = renderParams.pixelRatio;
            var tickMarks = this._private__priceScale.marks();
            ctx.save();
            ctx.strokeStyle = this.lineColor();
            ctx.font = this.baseFont();
            ctx.fillStyle = this.lineColor();
            var rendererOptions = this.rendererOptions();
            var drawTicks = this._private__priceScale.options().borderVisible && this._private__priceScale.options().drawTicks;
            var tickMarkLeftX = this._private__isLeft ?
                Math.floor((this._private__size.w - rendererOptions.tickLength) * pixelRatio - rendererOptions.borderSize * pixelRatio) :
                Math.floor(rendererOptions.borderSize * pixelRatio);
            var textLeftX = this._private__isLeft ?
                Math.round(tickMarkLeftX - rendererOptions.paddingInner * pixelRatio) :
                Math.round(tickMarkLeftX + rendererOptions.tickLength * pixelRatio + rendererOptions.paddingInner * pixelRatio);
            var textAlign = this._private__isLeft ? 'right' : 'left';
            var tickHeight = Math.max(1, Math.floor(pixelRatio));
            var tickOffset = Math.floor(pixelRatio * 0.5);
            if (drawTicks) {
                var tickLength = Math.round(rendererOptions.tickLength * pixelRatio);
                ctx.beginPath();
                for (var _i = 0, tickMarks_1 = tickMarks; _i < tickMarks_1.length; _i++) {
                    var tickMark = tickMarks_1[_i];
                    ctx.rect(tickMarkLeftX, Math.round(tickMark.coord * pixelRatio) - tickOffset, tickLength, tickHeight);
                }
                ctx.fill();
            }
            ctx.fillStyle = this.textColor();
            for (var _a = 0, tickMarks_2 = tickMarks; _a < tickMarks_2.length; _a++) {
                var tickMark = tickMarks_2[_a];
                this._private__tickMarksCache._internal_paintTo(ctx, tickMark.label, textLeftX, Math.round(tickMark.coord * pixelRatio), textAlign);
            }
            ctx.restore();
        };
        PriceAxisWidget.prototype._private__alignLabels = function () {
            if (this._private__size === null || this._private__priceScale === null) {
                return;
            }
            var center = this._private__size.h / 2;
            var views = [];
            var orderedSources = this._private__priceScale.orderedSources().slice(); // Copy of array
            var pane = this._private__pane;
            var paneState = pane.state();
            var rendererOptions = this.rendererOptions();
            // if we are default price scale, append labels from no-scale
            var isDefault = this._private__priceScale === paneState.defaultVisiblePriceScale();
            if (isDefault) {
                this._private__pane.state().orderedSources().forEach(function (source) {
                    if (paneState.isOverlay(source)) {
                        orderedSources.push(source);
                    }
                });
            }
            // we can use any, but let's use the first source as "center" one
            var centerSource = this._private__priceScale.dataSources()[0];
            var priceScale = this._private__priceScale;
            var updateForSources = function (sources) {
                sources.forEach(function (source) {
                    var sourceViews = source.priceAxisViews(paneState, priceScale)
                        .filter(function (view) { return view instanceof PriceAxisLabelView; });
                    // never align selected sources
                    sourceViews.forEach(function (view) {
                        view._internal_setFixedCoordinate(undefined);
                        if (view._internal_isVisible()) {
                            views.push(view);
                        }
                    });
                    if (centerSource === source && sourceViews.length > 0) {
                        center = sourceViews[0]._internal_coordinate();
                    }
                });
            };
            // crosshair individually
            updateForSources(orderedSources);
            // split into two parts
            var top = views.filter(function (view) { return view._internal_coordinate() <= center; });
            var bottom = views.filter(function (view) { return view._internal_coordinate() > center; });
            // sort top from center to top
            top.sort(function (l, r) { return r._internal_coordinate() - l._internal_coordinate(); });
            // share center label
            if (top.length && bottom.length) {
                bottom.push(top[0]);
            }
            bottom.sort(function (l, r) { return l._internal_coordinate() - r._internal_coordinate(); });
            views.forEach(function (view) { return view._internal_setFixedCoordinate(view._internal_coordinate()); });
            var options = this._private__priceScale.options();
            if (!options.alignLabels) {
                return;
            }
            for (var i = 1; i < top.length; i++) {
                var view = top[i];
                var prev = top[i - 1];
                var height = prev._internal_height(rendererOptions, false);
                var coordinate = view._internal_coordinate();
                var prevFixedCoordinate = prev._internal_getFixedCoordinate();
                if (coordinate > prevFixedCoordinate - height) {
                    view._internal_setFixedCoordinate(prevFixedCoordinate - height);
                }
            }
            for (var j = 1; j < bottom.length; j++) {
                var view = bottom[j];
                var prev = bottom[j - 1];
                var height = prev._internal_height(rendererOptions, true);
                var coordinate = view._internal_coordinate();
                var prevFixedCoordinate = prev._internal_getFixedCoordinate();
                if (coordinate < prevFixedCoordinate + height) {
                    view._internal_setFixedCoordinate(prevFixedCoordinate + height);
                }
            }
        };
        PriceAxisWidget.prototype._private__drawSources = function (ctx, renderParams, background) {
            if (this._private__size === null) {
                return;
            }
            ctx.save();
            var views = this._private__dataSources();
            var rendererOptions = this.rendererOptions();
            views.forEach(function (view) {
                var renderer = view.renderer();
                ctx.save();
                if (background && renderer.drawBackground) {
                    renderer.drawBackground(ctx, rendererOptions, renderParams);
                }
                else if (renderer.draw) {
                    renderer.draw(ctx, rendererOptions, renderParams);
                }
                ctx.restore();
            });
            ctx.restore();
        };
        PriceAxisWidget.prototype._private__drawCrosshairLabel = function (ctx, renderParams) {
            if (this._private__size === null || this._private__priceScale === null) {
                return;
            }
            ctx.save();
            var model = this._private__pane.chart().model();
            var views = []; // array of arrays
            var pane = this._private__pane.state();
            var v = model.crosshairSource().priceAxisViews(pane, this._private__priceScale);
            if (v.length) {
                views.push(v);
            }
            var ro = this.rendererOptions();
            views.forEach(function (arr) {
                arr.forEach(function (view) {
                    var renderer = view.renderer();
                    ctx.save();
                    if (!renderer.draw) {
                        return;
                    }
                    renderer.draw(ctx, ro, renderParams);
                    ctx.restore();
                });
            });
            ctx.restore();
        };
        PriceAxisWidget.prototype._private__setCursor = function (type) {
            this._private__cell.style.cursor = type === 1 /* NsResize */ ? 'ns-resize' : 'default';
        };
        PriceAxisWidget.prototype._private__onMarksChanged = function () {
            var width = this.optimalWidth();
            // avoid price scale is shrunk
            // using < instead !== to avoid infinite changes
            if (this._private__prevOptimalWidth < width) {
                this._private__pane.chart().model().fullUpdate();
            }
            this._private__prevOptimalWidth = width;
        };
        PriceAxisWidget.prototype._private__recreateTickMarksCache = function (options) {
            this._private__tickMarksCache.destroy();
            this._private__tickMarksCache = new LabelsImageCache(options.fontSize, options.color, options.fontFamily);
        };
        return PriceAxisWidget;
    }());

    function checkTouchEvents() {
        if (!isRunningOnClientSide) {
            return false;
        }
        // eslint-disable-next-line no-restricted-syntax
        if ('ontouchstart' in window) {
            return true;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-member-access
        return Boolean(window.DocumentTouch && document instanceof window.DocumentTouch);
    }
    function getMobileTouch() {
        if (!isRunningOnClientSide) {
            return false;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-member-access
        var touch = !!navigator.maxTouchPoints || !!navigator.msMaxTouchPoints || checkTouchEvents();
        // eslint-disable-next-line no-restricted-syntax
        return 'onorientationchange' in window && touch;
    }
    var mobileTouch = getMobileTouch();
    function getIsMobile() {
        if (!isRunningOnClientSide) {
            return false;
        }
        // actually we shouldn't check that values
        // we even don't need to know what browser/UA/etc is (in almost all cases, except special ones)
        // so, in MouseEventHandler/PaneWidget we should check what event happened (touch or mouse)
        // not check current UA to detect "mobile" device
        var android = /Android/i.test(navigator.userAgent);
        var iOS = /iPhone|iPad|iPod|AppleWebKit.+Mobile/i.test(navigator.userAgent);
        return android || iOS;
    }
    var isMobile = getIsMobile();

    // actually we should check what event happened (touch or mouse)
    // not check current UA to detect "mobile" device
    var trackCrosshairOnlyAfterLongTap = isMobile;
    function drawBackground(renderer, ctx, renderParams) {
        if (renderer.drawBackground) {
            renderer.drawBackground(ctx, renderParams);
        }
    }
    function drawForeground(renderer, ctx, renderParams) {
        renderer.draw(ctx, renderParams);
    }
    function sourcePaneViews(source, pane) {
        return source.paneViews();
    }
    function sourceTopPaneViews(source, pane) {
        return source.topPaneViews !== undefined ? source.topPaneViews(pane) : [];
    }
    var PaneWidget = /** @class */ (function () {
        function PaneWidget(chart, state) {
            var _this = this;
            this._private__size = new Size(0, 0);
            this._private__leftPriceAxisWidget = null;
            this._private__rightPriceAxisWidget = null;
            this._private__startScrollingPos = null;
            this._private__isScrolling = false;
            this._private__clicked = new Delegate();
            this._private__prevPinchScale = 0;
            this._private__longTap = false;
            this._private__startTrackPoint = null;
            this._private__exitTrackingModeOnNextTry = false;
            this._private__initCrosshairPosition = null;
            this._private__scrollXAnimation = null;
            this._private__canvasConfiguredHandler = function () {
                return _this._private__state && _this._private__model().lightUpdate();
            };
            this._private__topCanvasConfiguredHandler = function () {
                return _this._private__state && _this._private__model().lightUpdate();
            };
            this._private__chart = chart;
            this._private__state = state;
            this._private__state
                .onDestroyed()
                .subscribe(this._private__onStateDestroyed.bind(this), this, true);
            var paneIndex = this._private__model().getPaneIndex(ensureNotNull(this._private__state));
            this._private__paneCell = document.createElement('td');
            this._private__paneCell.style.padding = '0';
            this._private__paneCell.style.position = 'relative';
            this._private__paneCell.className += "pane-".concat(paneIndex);
            var paneWrapper = document.createElement('div');
            paneWrapper.style.width = '100%';
            paneWrapper.style.height = '100%';
            paneWrapper.style.position = 'relative';
            paneWrapper.style.overflow = 'hidden';
            paneWrapper.style.transform = 'translateZ(0px)';
            this._private__leftAxisCell = document.createElement('td');
            this._private__leftAxisCell.style.position = 'relative';
            this._private__leftAxisCell.style.padding = '0';
            this._private__rightAxisCell = document.createElement('td');
            this._private__rightAxisCell.style.padding = '0';
            this._private__paneCell.appendChild(paneWrapper);
            this._private__canvasBinding = createBoundCanvas(paneWrapper, new Size(16, 16));
            this._private__canvasBinding.subscribeCanvasConfigured(this._private__canvasConfiguredHandler);
            var canvas = this._private__canvasBinding.canvas;
            canvas.style.position = 'absolute';
            canvas.style.zIndex = '1';
            canvas.style.left = '0';
            canvas.style.top = '0';
            this._private__topCanvasBinding = createBoundCanvas(paneWrapper, new Size(16, 16));
            this._private__topCanvasBinding.subscribeCanvasConfigured(this._private__topCanvasConfiguredHandler);
            var topCanvas = this._private__topCanvasBinding.canvas;
            topCanvas.style.position = 'absolute';
            topCanvas.style.zIndex = '2';
            topCanvas.style.left = '0';
            topCanvas.style.top = '0';
            this._private__rowElement = document.createElement('tr');
            this._private__rowElement.appendChild(this._private__leftAxisCell);
            this._private__rowElement.appendChild(this._private__paneCell);
            this._private__rowElement.appendChild(this._private__rightAxisCell);
            this.updatePriceAxisWidgetsStates();
            this._private__mouseEventHandler = new MouseEventHandler(this._private__topCanvasBinding.canvas, this, {
                _internal_treatVertTouchDragAsPageScroll: function () { return _this._private__startTrackPoint === null && !_this._private__chart.options().handleScroll.vertTouchDrag; },
                _internal_treatHorzTouchDragAsPageScroll: function () { return _this._private__startTrackPoint === null && !_this._private__chart.options().handleScroll.horzTouchDrag; },
            });
        }
        PaneWidget.prototype.destroy = function () {
            if (this._private__leftPriceAxisWidget !== null) {
                this._private__leftPriceAxisWidget.destroy();
            }
            if (this._private__rightPriceAxisWidget !== null) {
                this._private__rightPriceAxisWidget.destroy();
            }
            this._private__topCanvasBinding.unsubscribeCanvasConfigured(this._private__topCanvasConfiguredHandler);
            this._private__topCanvasBinding.destroy();
            this._private__canvasBinding.unsubscribeCanvasConfigured(this._private__canvasConfiguredHandler);
            this._private__canvasBinding.destroy();
            if (this._private__state !== null) {
                this._private__state.onDestroyed().unsubscribeAll(this);
            }
            this._private__mouseEventHandler.destroy();
        };
        PaneWidget.prototype.state = function () {
            return ensureNotNull(this._private__state);
        };
        PaneWidget.prototype.setState = function (pane) {
            if (this._private__state !== null) {
                this._private__state.onDestroyed().unsubscribeAll(this);
            }
            this._private__state = pane;
            if (this._private__state !== null) {
                this._private__state
                    .onDestroyed()
                    .subscribe(PaneWidget.prototype._private__onStateDestroyed.bind(this), this, true);
            }
            this.updatePriceAxisWidgetsStates();
        };
        PaneWidget.prototype.setCursor = function (type) {
            var cursor = type.toString();
            if (this._private__paneCell.style.cursor !== cursor) {
                this._private__paneCell.style.cursor = cursor;
            }
        };
        PaneWidget.prototype.chart = function () {
            return this._private__chart;
        };
        PaneWidget.prototype.getElement = function () {
            return this._private__rowElement;
        };
        PaneWidget.prototype.updatePriceAxisWidgetsStates = function () {
            if (this._private__state === null) {
                return;
            }
            this._private__recreatePriceAxisWidgets();
            if (this._private__model().serieses().length === 0) {
                return;
            }
            if (this._private__leftPriceAxisWidget !== null) {
                var leftPriceScale = this._private__state.leftPriceScale();
                this._private__leftPriceAxisWidget.setPriceScale(ensureNotNull(leftPriceScale));
            }
            if (this._private__rightPriceAxisWidget !== null) {
                var rightPriceScale = this._private__state.rightPriceScale();
                this._private__rightPriceAxisWidget.setPriceScale(ensureNotNull(rightPriceScale));
            }
        };
        PaneWidget.prototype.updatePriceAxisWidgets = function () {
            if (this._private__leftPriceAxisWidget !== null) {
                this._private__leftPriceAxisWidget.update();
            }
            if (this._private__rightPriceAxisWidget !== null) {
                this._private__rightPriceAxisWidget.update();
            }
        };
        PaneWidget.prototype.stretchFactor = function () {
            return this._private__state !== null ? this._private__state.stretchFactor() : 0;
        };
        PaneWidget.prototype.setStretchFactor = function (stretchFactor) {
            if (this._private__state) {
                this._private__state.setStretchFactor(stretchFactor);
            }
        };
        PaneWidget.prototype.mouseEnterEvent = function (event) {
            if (!this._private__state) {
                return;
            }
            this._private__onMouseEvent();
            var x = event.localX;
            var y = event.localY;
            this._private__setCrosshairPosition(x, y);
        };
        PaneWidget.prototype.mouseDownEvent = function (event) {
            this._private__onMouseEvent();
            this._private__mouseTouchDownEvent();
            this._private__setCrosshairPosition(event.localX, event.localY);
        };
        PaneWidget.prototype.mouseMoveEvent = function (event) {
            if (!this._private__state) {
                return;
            }
            var x = event.localX;
            var y = event.localY;
            if (event) {
                this._private__terminateKineticAnimation();
                if (document.activeElement !== document.body &&
                    document.activeElement !== document.documentElement) {
                    // If any focusable element except the page itself is focused, remove the focus
                    ensureNotNull(document.activeElement).blur();
                }
                else {
                    // Clear selection
                    var selection = document.getSelection();
                    if (selection !== null) {
                        selection.removeAllRanges();
                    }
                }
                var model = this._private__model();
                var priceScale = this._private__state.defaultPriceScale();
                if (priceScale.isEmpty() || model.timeScale().isEmpty()) {
                    return;
                }
                if (this._private__startTrackPoint !== null) {
                    var crosshair = model.crosshairSource();
                    this._private__initCrosshairPosition = new Point(crosshair.appliedX(), crosshair.appliedY());
                    this._private__startTrackPoint = new Point(event.localX, event.localY);
                }
            }
            else {
                if (this._private__preventCrosshairMove()) {
                    this._private__clearCrosshairPosition();
                }
            }
            if (!mobileTouch) {
                this._private__setCrosshairPosition(x, y);
                this._private__propagateEvent(9 /* MouseMove */, event);
            }
        };
        PaneWidget.prototype.mouseClickEvent = function (event) {
            if (this._private__state === null) {
                return;
            }
            this._private__onMouseEvent();
            this._private__propagateEvent(3 /* MouseClick */, event);
            var x = event.localX;
            var y = event.localY;
            if (this._private__clicked.hasListeners()) {
                var currentTime = this._private__model().crosshairSource().appliedIndex();
                var paneIndex = this._private__model().getPaneIndex(ensureNotNull(this._private__state));
                var point = new Point(x, y);
                point.paneIndex = paneIndex;
                this._private__clicked.fire(currentTime, point);
            }
            this._private__tryExitTrackingMode();
        };
        // eslint-disable-next-line complexity
        PaneWidget.prototype.pressedMouseMoveEvent = function (event) {
            if (this._private__state === null) {
                return;
            }
            var model = this._private__model();
            var x = event.localX;
            var y = event.localY;
            if (this._private__startTrackPoint !== null) {
                // tracking mode: move crosshair
                this._private__exitTrackingModeOnNextTry = false;
                var origPoint = ensureNotNull(this._private__initCrosshairPosition);
                var newX = (origPoint.x + (x - this._private__startTrackPoint.x));
                var newY = (origPoint.y + (y - this._private__startTrackPoint.y));
                this._private__setCrosshairPosition(newX, newY);
            }
            else if (!this._private__preventCrosshairMove()) {
                this._private__setCrosshairPosition(x, y);
            }
            if (this._private__startScrollingPos === null) {
                this._private__propagateEvent(11 /* PressedMouseMove */, event);
            }
            if (model.timeScale().isEmpty() || event.consumed) {
                return;
            }
            var chartOptions = this._private__chart.options();
            var scrollOptions = chartOptions.handleScroll;
            var kineticScrollOptions = chartOptions.kineticScroll;
            if ((!scrollOptions.pressedMouseMove || event.type === 'touch') &&
                ((!scrollOptions.horzTouchDrag && !scrollOptions.vertTouchDrag) ||
                    event.type === 'mouse')) {
                return;
            }
            var priceScale = this._private__state.defaultPriceScale();
            var now = performance.now();
            if (this._private__startScrollingPos === null && !this._private__preventScroll()) {
                this._private__startScrollingPos = new Point(event.clientX, event.clientY);
                this._private__startScrollingPos._internal_timestamp = now;
                this._private__startScrollingPos._internal_localX = event.localX;
                this._private__startScrollingPos._internal_localY = event.localY;
            }
            if (this._private__scrollXAnimation !== null) {
                this._private__scrollXAnimation._internal_addPosition(event.localX, now);
            }
            if (this._private__startScrollingPos !== null &&
                !this._private__isScrolling &&
                (this._private__startScrollingPos.x !== event.clientX ||
                    this._private__startScrollingPos.y !== event.clientY)) {
                if (this._private__scrollXAnimation === null &&
                    ((event.type === 'touch' && kineticScrollOptions.touch) ||
                        (event.type === 'mouse' && kineticScrollOptions.mouse))) {
                    this._private__scrollXAnimation = new KineticAnimation(0.2 /* MinScrollSpeed */, 7 /* MaxScrollSpeed */, 0.997 /* DumpingCoeff */, 15 /* ScrollMinMove */);
                    this._private__scrollXAnimation._internal_addPosition(this._private__startScrollingPos._internal_localX, this._private__startScrollingPos._internal_timestamp);
                    this._private__scrollXAnimation._internal_addPosition(event.localX, now);
                }
                if (!priceScale.isEmpty()) {
                    model.startScrollPrice(this._private__state, priceScale, event.localY);
                }
                model.startScrollTime(event.localX);
                this._private__isScrolling = true;
            }
            if (this._private__isScrolling) {
                // this allows scrolling not default price scales
                if (!priceScale.isEmpty()) {
                    model.scrollPriceTo(this._private__state, priceScale, event.localY);
                }
                model.scrollTimeTo(event.localX);
            }
        };
        PaneWidget.prototype.mouseUpEvent = function (event) {
            if (this._private__state === null) {
                return;
            }
            this._private__onMouseEvent();
            this._private__propagateEvent(10 /* MouseUp */, event);
            this._private__longTap = false;
            this._private__endScroll(event);
        };
        PaneWidget.prototype.longTapEvent = function (event) {
            this._private__longTap = true;
            if (this._private__startTrackPoint === null && trackCrosshairOnlyAfterLongTap) {
                var point = new Point(event.localX, event.localY);
                this._private__startTrackingMode(point, point);
            }
        };
        PaneWidget.prototype.mouseLeaveEvent = function (event) {
            if (this._private__state === null) {
                return;
            }
            this._private__onMouseEvent();
            this._private__state.model().setHoveredSource(null);
            this._private__clearCrosshairPosition();
        };
        PaneWidget.prototype.clicked = function () {
            return this._private__clicked;
        };
        PaneWidget.prototype.pinchStartEvent = function () {
            this._private__prevPinchScale = 1;
            this._private__terminateKineticAnimation();
        };
        PaneWidget.prototype.pinchEvent = function (middlePoint, scale) {
            if (!this._private__chart.options().handleScale.pinch) {
                return;
            }
            var zoomScale = (scale - this._private__prevPinchScale) * 5;
            this._private__prevPinchScale = scale;
            this._private__model().zoomTime(middlePoint.x, zoomScale);
        };
        PaneWidget.prototype.touchStartEvent = function (event) {
            this._private__longTap = false;
            this._private__exitTrackingModeOnNextTry = this._private__startTrackPoint !== null;
            this._private__mouseTouchDownEvent();
            if (this._private__startTrackPoint !== null) {
                var crosshair = this._private__model().crosshairSource();
                this._private__initCrosshairPosition = new Point(crosshair.appliedX(), crosshair.appliedY());
                this._private__startTrackPoint = new Point(event.localX, event.localY);
            }
        };
        PaneWidget.prototype.touchMoveEvent = function (event) {
            if (this._private__state === null) {
                return;
            }
            var x = event.localX;
            var y = event.localY;
            if (this._private__startTrackPoint !== null) {
                // tracking mode: move crosshair
                this._private__exitTrackingModeOnNextTry = false;
                var origPoint = ensureNotNull(this._private__initCrosshairPosition);
                var newX = origPoint.x + (x - this._private__startTrackPoint.x);
                var newY = origPoint.y + (y - this._private__startTrackPoint.y);
                this._private__setCrosshairPosition(newX, newY);
                return;
            }
            this._private__pressedMouseTouchMoveEvent(event);
        };
        PaneWidget.prototype.touchEndEvent = function (event) {
            if (this.chart().options().trackingMode.exitMode === 0 /* OnTouchEnd */) {
                this._private__exitTrackingModeOnNextTry = true;
            }
            this._private__tryExitTrackingMode();
            this._private__endScroll(event);
        };
        // public hitTest(x: Coordinate, y: Coordinate): HitTestResult | null {
        // 	// const state = this._state;
        // 	// if (state === null) {
        // 	// 	return null;
        // 	// }
        // 	// const sources = state.orderedSources();
        // 	// for (const source of sources) {
        // 	// 	const sourceResult = this._hitTestPaneView(source.paneViews(state), x, y);
        // 	// 	if (sourceResult !== null) {
        // 	// 		return {
        // 	// 			source: source,
        // 	// 			view: sourceResult.view,
        // 	// 			object: sourceResult.object,
        // 	// 		};
        // 	// 	}
        // 	// }
        // 	return null;
        // }
        PaneWidget.prototype.setPriceAxisSize = function (width, position) {
            var priceAxisWidget = position === 'left'
                ? this._private__leftPriceAxisWidget
                : this._private__rightPriceAxisWidget;
            ensureNotNull(priceAxisWidget).setSize(new Size(width, this._private__size.h));
        };
        PaneWidget.prototype.getSize = function () {
            return this._private__size;
        };
        PaneWidget.prototype.setSize = function (size) {
            if (size.w < 0 || size.h < 0) {
                throw new Error('Try to set invalid size to PaneWidget ' + JSON.stringify(size));
            }
            if (this._private__size.equals(size)) {
                return;
            }
            this._private__size = size;
            this._private__canvasBinding.resizeCanvas({ width: size.w, height: size.h });
            this._private__topCanvasBinding.resizeCanvas({ width: size.w, height: size.h });
            this._private__paneCell.style.width = size.w + 'px';
            this._private__paneCell.style.height = size.h + 'px';
        };
        PaneWidget.prototype.recalculatePriceScales = function () {
            var pane = ensureNotNull(this._private__state);
            pane.recalculatePriceScale(pane.leftPriceScale());
            pane.recalculatePriceScale(pane.rightPriceScale());
            for (var _i = 0, _a = pane.dataSources(); _i < _a.length; _i++) {
                var source = _a[_i];
                if (pane.isOverlay(source)) {
                    var priceScale = source.priceScale();
                    if (priceScale !== null) {
                        pane.recalculatePriceScale(priceScale);
                    }
                    // for overlay drawings price scale is owner's price scale
                    // however owner's price scale could not contain ds
                    source.updateAllViews();
                }
            }
        };
        PaneWidget.prototype.getImage = function () {
            return this._private__canvasBinding.canvas;
        };
        PaneWidget.prototype.paint = function (type) {
            if (type === 0 /* None */) {
                return;
            }
            if (this._private__state === null) {
                return;
            }
            if (type > 1 /* Cursor */) {
                this.recalculatePriceScales();
            }
            if (this._private__leftPriceAxisWidget !== null) {
                this._private__leftPriceAxisWidget.paint(type);
            }
            if (this._private__rightPriceAxisWidget !== null) {
                this._private__rightPriceAxisWidget.paint(type);
            }
            if (type !== 1 /* Cursor */) {
                var ctx = getContext2D(this._private__canvasBinding.canvas);
                var renderParams_1 = this.canvasRenderParams(this._private__canvasBinding);
                ctx.save();
                this._private__drawBackground(ctx, renderParams_1);
                if (this._private__state) {
                    this._private__drawGrid(ctx, renderParams_1);
                    this._private__drawWatermark(ctx, renderParams_1);
                    this._private__drawSources(ctx, renderParams_1, sourcePaneViews);
                }
                ctx.restore();
            }
            var topCtx = getContext2D(this._private__topCanvasBinding.canvas);
            var renderParams = this.canvasRenderParams(this._private__topCanvasBinding);
            topCtx.clearRect(0, 0, Math.ceil(this._private__size.w * this._private__topCanvasBinding.pixelRatio), Math.ceil(this._private__size.h * this._private__topCanvasBinding.pixelRatio));
            this._private__drawSources(topCtx, renderParams, sourceTopPaneViews);
            this._private__drawCrosshair(topCtx, renderParams);
        };
        PaneWidget.prototype.leftPriceAxisWidget = function () {
            return this._private__leftPriceAxisWidget;
        };
        PaneWidget.prototype.getPaneCell = function () {
            return this._private__paneCell;
        };
        PaneWidget.prototype.rightPriceAxisWidget = function () {
            return this._private__rightPriceAxisWidget;
        };
        PaneWidget.prototype.canvasRenderParams = function (canvasBindings) {
            canvasBindings || (canvasBindings = this._private__canvasBinding);
            return {
                pixelRatio: canvasBindings.pixelRatio,
                physicalWidth: canvasBindings.canvas.width,
                physicalHeight: canvasBindings.canvas.height,
                cssWidth: this.chart().model().timeScale().width(),
                cssHeight: this.state().height(),
            };
        };
        PaneWidget.prototype._private__propagateEvent = function (type, event) {
            var _this = this;
            if (this._private__state === null) {
                return;
            }
            this.setCursor(PaneCursorType.Crosshair);
            // if (this._model().lineToolCreator().hasActiveToolLine()) {
            this._private__model().lineToolCreator().onInputEvent(this, type, event);
            // }
            var sources = this._private__state.orderedSources();
            for (var index = sources.length - 1; index >= 0; index--) {
                var paneViews = sources[index].paneViews();
                paneViews.forEach(function (pane) {
                    if (isInputEventListener(pane)) {
                        pane.onInputEvent(_this, type, event);
                    }
                });
            }
        };
        PaneWidget.prototype._private__onStateDestroyed = function () {
            if (this._private__state !== null) {
                this._private__state.onDestroyed().unsubscribeAll(this);
            }
            this._private__state = null;
        };
        PaneWidget.prototype._private__drawBackground = function (ctx, renderParams) {
            var _this = this;
            drawScaled(ctx, renderParams.pixelRatio, function () {
                var model = _this._private__model();
                var topColor = model.backgroundTopColor();
                var bottomColor = model.backgroundBottomColor();
                if (topColor === bottomColor) {
                    clearRect(ctx, 0, 0, _this._private__size.w, _this._private__size.h, bottomColor);
                }
                else {
                    clearRectWithGradient(ctx, 0, 0, _this._private__size.w, _this._private__size.h, topColor, bottomColor);
                }
            });
        };
        PaneWidget.prototype._private__drawGrid = function (ctx, renderParams) {
            var state = ensureNotNull(this._private__state);
            var paneView = state.grid().paneView();
            var renderer = paneView.renderer(state.height(), state.width(), state);
            if (renderer !== null) {
                ctx.save();
                renderer.draw(ctx, renderParams);
                ctx.restore();
            }
        };
        PaneWidget.prototype._private__drawWatermark = function (ctx, renderParams) {
            var source = this._private__model().watermarkSource();
            this._private__drawSourceImpl(ctx, renderParams, sourcePaneViews, drawBackground, source);
            this._private__drawSourceImpl(ctx, renderParams, sourcePaneViews, drawForeground, source);
        };
        PaneWidget.prototype._private__drawCrosshair = function (ctx, renderParams) {
            this._private__drawSourceImpl(ctx, renderParams, sourcePaneViews, drawForeground, this._private__model().crosshairSource());
        };
        PaneWidget.prototype._private__drawSources = function (ctx, renderParams, paneViewsGetter) {
            var state = ensureNotNull(this._private__state);
            var sources = state.orderedSources();
            for (var _i = 0, sources_1 = sources; _i < sources_1.length; _i++) {
                var source = sources_1[_i];
                this._private__drawSourceImpl(ctx, renderParams, paneViewsGetter, drawBackground, source);
            }
            for (var _a = 0, sources_2 = sources; _a < sources_2.length; _a++) {
                var source = sources_2[_a];
                this._private__drawSourceImpl(ctx, renderParams, paneViewsGetter, drawForeground, source);
            }
        };
        PaneWidget.prototype._private__drawSourceImpl = function (ctx, renderParams, paneViewsGetter, drawFn, source) {
            var state = ensureNotNull(this._private__state);
            var paneViews = paneViewsGetter(source, state);
            var height = state.height();
            var width = state.width();
            for (var _i = 0, paneViews_1 = paneViews; _i < paneViews_1.length; _i++) {
                var paneView = paneViews_1[_i];
                var renderer = paneView.renderer(height, width, state);
                if (renderer !== null) {
                    ctx.save();
                    drawFn(renderer, ctx, renderParams);
                    ctx.restore();
                }
            }
        };
        // private _hitTestPaneView(
        // 	paneViews: readonly IPaneView[],
        // 	x: Coordinate,
        // 	y: Coordinate
        // ): HitTestPaneViewResult | null {
        // 	// const state = ensureNotNull(this._state);
        // 	// for (const paneView of paneViews) {
        // 	// 	const renderer = paneView.renderer(this._size.h, this._size.w, state);
        // 	// 	if (renderer !== null && renderer.hitTest) {
        // 	// 		const result = renderer.hitTest(x, y);
        // 	// 		if (result !== null) {
        // 	// 			return {
        // 	// 				view: paneView,
        // 	// 				object: result,
        // 	// 			};
        // 	// 		}
        // 	// 	}
        // 	// }
        // 	return null;
        // }
        PaneWidget.prototype._private__recreatePriceAxisWidgets = function () {
            if (this._private__state === null) {
                return;
            }
            var chart = this._private__chart;
            var leftAxisVisible = this._private__state.leftPriceScale().options().visible;
            var rightAxisVisible = this._private__state.rightPriceScale().options().visible;
            if (!leftAxisVisible && this._private__leftPriceAxisWidget !== null) {
                this._private__leftAxisCell.removeChild(this._private__leftPriceAxisWidget.getElement());
                this._private__leftPriceAxisWidget.destroy();
                this._private__leftPriceAxisWidget = null;
            }
            if (!rightAxisVisible && this._private__rightPriceAxisWidget !== null) {
                this._private__rightAxisCell.removeChild(this._private__rightPriceAxisWidget.getElement());
                this._private__rightPriceAxisWidget.destroy();
                this._private__rightPriceAxisWidget = null;
            }
            var rendererOptionsProvider = chart.model().rendererOptionsProvider();
            if (leftAxisVisible && this._private__leftPriceAxisWidget === null) {
                this._private__leftPriceAxisWidget = new PriceAxisWidget(this, chart.options().layout, rendererOptionsProvider, 'left');
                this._private__leftAxisCell.appendChild(this._private__leftPriceAxisWidget.getElement());
            }
            if (rightAxisVisible && this._private__rightPriceAxisWidget === null) {
                this._private__rightPriceAxisWidget = new PriceAxisWidget(this, chart.options().layout, rendererOptionsProvider, 'right');
                this._private__rightAxisCell.appendChild(this._private__rightPriceAxisWidget.getElement());
            }
        };
        PaneWidget.prototype._private__preventCrosshairMove = function () {
            return trackCrosshairOnlyAfterLongTap && this._private__startTrackPoint === null;
        };
        PaneWidget.prototype._private__preventScroll = function () {
            return ((trackCrosshairOnlyAfterLongTap && this._private__longTap) ||
                this._private__startTrackPoint !== null);
        };
        PaneWidget.prototype._private__correctXCoord = function (x) {
            return Math.max(0, Math.min(x, this._private__size.w - 1));
        };
        PaneWidget.prototype._private__correctYCoord = function (y) {
            return Math.max(0, Math.min(y, this._private__size.h - 1));
        };
        PaneWidget.prototype._private__setCrosshairPosition = function (x, y) {
            this._private__model().setAndSaveCurrentPosition(this._private__correctXCoord(x), this._private__correctYCoord(y), ensureNotNull(this._private__state));
        };
        PaneWidget.prototype._private__clearCrosshairPosition = function () {
            this._private__model().clearCurrentPosition();
        };
        PaneWidget.prototype._private__tryExitTrackingMode = function () {
            if (this._private__exitTrackingModeOnNextTry) {
                this._private__startTrackPoint = null;
                this._private__clearCrosshairPosition();
            }
        };
        PaneWidget.prototype._private__startTrackingMode = function (startTrackPoint, crossHairPosition) {
            this._private__startTrackPoint = startTrackPoint;
            this._private__exitTrackingModeOnNextTry = false;
            this._private__setCrosshairPosition(crossHairPosition.x, crossHairPosition.y);
            var crosshair = this._private__model().crosshairSource();
            this._private__initCrosshairPosition = new Point(crosshair.appliedX(), crosshair.appliedY());
        };
        PaneWidget.prototype._private__model = function () {
            return this._private__chart.model();
        };
        PaneWidget.prototype._private__finishScroll = function () {
            var model = this._private__model();
            var state = this.state();
            var priceScale = state.defaultPriceScale();
            model.endScrollPrice(state, priceScale);
            model.endScrollTime();
            this._private__startScrollingPos = null;
            this._private__isScrolling = false;
        };
        PaneWidget.prototype._private__endScroll = function (event) {
            var _this = this;
            if (!this._private__isScrolling) {
                return;
            }
            var startAnimationTime = performance.now();
            if (this._private__scrollXAnimation !== null) {
                this._private__scrollXAnimation._internal_start(event.localX, startAnimationTime);
            }
            if (this._private__scrollXAnimation === null ||
                this._private__scrollXAnimation._internal_finished(startAnimationTime)) {
                // animation is not needed
                this._private__finishScroll();
                return;
            }
            var model = this._private__model();
            var timeScale = model.timeScale();
            var scrollXAnimation = this._private__scrollXAnimation;
            var animationFn = function () {
                if (scrollXAnimation._internal_terminated()) {
                    // animation terminated, see _terminateKineticAnimation
                    return;
                }
                var now = performance.now();
                var xAnimationFinished = scrollXAnimation._internal_finished(now);
                if (!scrollXAnimation._internal_terminated()) {
                    var prevRightOffset = timeScale.rightOffset();
                    model.scrollTimeTo(scrollXAnimation._internal_getPosition(now));
                    if (prevRightOffset === timeScale.rightOffset()) {
                        xAnimationFinished = true;
                        _this._private__scrollXAnimation = null;
                    }
                }
                if (xAnimationFinished) {
                    _this._private__finishScroll();
                    return;
                }
                requestAnimationFrame(animationFn);
            };
            requestAnimationFrame(animationFn);
        };
        PaneWidget.prototype._private__onMouseEvent = function () {
            this._private__startTrackPoint = null;
        };
        PaneWidget.prototype._private__mouseTouchDownEvent = function () {
            if (!this._private__state) {
                return;
            }
            this._private__terminateKineticAnimation();
            if (document.activeElement !== document.body && document.activeElement !== document.documentElement) {
                // If any focusable element except the page itself is focused, remove the focus
                ensureNotNull(document.activeElement).blur();
            }
            else {
                // Clear selection
                var selection = document.getSelection();
                if (selection !== null) {
                    selection.removeAllRanges();
                }
            }
            var priceScale = this._private__state.defaultPriceScale();
            if (priceScale.isEmpty() || this._private__model().timeScale().isEmpty()) {
                return;
            }
        };
        // eslint-disable-next-line complexity
        PaneWidget.prototype._private__pressedMouseTouchMoveEvent = function (event) {
            if (this._private__state === null) {
                return;
            }
            var model = this._private__model();
            if (model.timeScale().isEmpty()) {
                return;
            }
            var chartOptions = this._private__chart.options();
            var scrollOptions = chartOptions.handleScroll;
            var kineticScrollOptions = chartOptions.kineticScroll;
            if ((!scrollOptions.pressedMouseMove || event.isTouch) &&
                (!scrollOptions.horzTouchDrag && !scrollOptions.vertTouchDrag || !event.isTouch)) {
                return;
            }
            var priceScale = this._private__state.defaultPriceScale();
            var now = performance.now();
            if (this._private__startScrollingPos === null && !this._private__preventScroll()) {
                this._private__startScrollingPos = new Point(event.clientX, event.clientY);
                this._private__startScrollingPos._internal_timestamp = now;
                this._private__startScrollingPos._internal_localX = event.localX;
                this._private__startScrollingPos._internal_localY = event.localY;
            }
            if (this._private__scrollXAnimation !== null) {
                this._private__scrollXAnimation._internal_addPosition(event.localX, now);
            }
            if (this._private__startScrollingPos !== null &&
                !this._private__isScrolling &&
                (this._private__startScrollingPos.x !== event.clientX || this._private__startScrollingPos.y !== event.clientY)) {
                if (this._private__scrollXAnimation === null && (event.isTouch && kineticScrollOptions.touch ||
                    !event.isTouch && kineticScrollOptions.mouse)) {
                    this._private__scrollXAnimation = new KineticAnimation(0.2 /* MinScrollSpeed */, 7 /* MaxScrollSpeed */, 0.997 /* DumpingCoeff */, 15 /* ScrollMinMove */);
                    this._private__scrollXAnimation._internal_addPosition(this._private__startScrollingPos._internal_localX, this._private__startScrollingPos._internal_timestamp);
                    this._private__scrollXAnimation._internal_addPosition(event.localX, now);
                }
                if (!priceScale.isEmpty()) {
                    model.startScrollPrice(this._private__state, priceScale, event.localY);
                }
                model.startScrollTime(event.localX);
                this._private__isScrolling = true;
            }
            if (this._private__isScrolling) {
                // this allows scrolling not default price scales
                if (!priceScale.isEmpty()) {
                    model.scrollPriceTo(this._private__state, priceScale, event.localY);
                }
                model.scrollTimeTo(event.localX);
            }
        };
        PaneWidget.prototype._private__terminateKineticAnimation = function () {
            var now = performance.now();
            var xAnimationFinished = this._private__scrollXAnimation === null || this._private__scrollXAnimation._internal_finished(now);
            if (this._private__scrollXAnimation !== null) {
                if (!xAnimationFinished) {
                    this._private__finishScroll();
                }
            }
            if (this._private__scrollXAnimation !== null) {
                this._private__scrollXAnimation._internal_terminate();
                this._private__scrollXAnimation = null;
            }
        };
        return PaneWidget;
    }());

    var PriceAxisStub = /** @class */ (function () {
        function PriceAxisStub(side, options, params, borderVisible, bottomColor) {
            var _this = this;
            this._private__invalidated = true;
            this._private__size = new Size(0, 0);
            this._private__canvasConfiguredHandler = function () { return _this.paint(3 /* Full */); };
            this._private__isLeft = side === 'left';
            this._private__rendererOptionsProvider = params.rendererOptionsProvider;
            this._private__options = options;
            this._private__borderVisible = borderVisible;
            this._private__bottomColor = bottomColor;
            this._private__cell = document.createElement('div');
            this._private__cell.style.width = '25px';
            this._private__cell.style.height = '100%';
            this._private__cell.style.overflow = 'hidden';
            this._private__canvasBinding = createBoundCanvas(this._private__cell, new Size(16, 16));
            this._private__canvasBinding.subscribeCanvasConfigured(this._private__canvasConfiguredHandler);
        }
        PriceAxisStub.prototype.destroy = function () {
            this._private__canvasBinding.unsubscribeCanvasConfigured(this._private__canvasConfiguredHandler);
            this._private__canvasBinding.destroy();
        };
        PriceAxisStub.prototype.getElement = function () {
            return this._private__cell;
        };
        PriceAxisStub.prototype.getSize = function () {
            return this._private__size;
        };
        PriceAxisStub.prototype.setSize = function (size) {
            if (size.w < 0 || size.h < 0) {
                throw new Error('Try to set invalid size to PriceAxisStub ' + JSON.stringify(size));
            }
            if (!this._private__size.equals(size)) {
                this._private__size = size;
                this._private__canvasBinding.resizeCanvas({ width: size.w, height: size.h });
                this._private__cell.style.width = "".concat(size.w, "px");
                this._private__cell.style.minWidth = "".concat(size.w, "px"); // for right calculate position of .pane-legend
                this._private__cell.style.height = "".concat(size.h, "px");
                this._private__invalidated = true;
            }
        };
        PriceAxisStub.prototype.paint = function (type) {
            if (type < 3 /* Full */ && !this._private__invalidated) {
                return;
            }
            if (this._private__size.w === 0 || this._private__size.h === 0) {
                return;
            }
            this._private__invalidated = false;
            var ctx = getContext2D(this._private__canvasBinding.canvas);
            var renderParams = { pixelRatio: this._private__canvasBinding.pixelRatio };
            this._private__drawBackground(ctx, renderParams);
            this._private__drawBorder(ctx, renderParams);
        };
        PriceAxisStub.prototype.getImage = function () {
            return this._private__canvasBinding.canvas;
        };
        PriceAxisStub.prototype._private__drawBorder = function (ctx, renderParams) {
            if (!this._private__borderVisible()) {
                return;
            }
            var width = this._private__size.w;
            var pixelRatio = renderParams.pixelRatio;
            ctx.save();
            ctx.fillStyle = this._private__options.timeScale.borderColor;
            var borderSize = Math.floor(this._private__rendererOptionsProvider.options().borderSize * pixelRatio);
            var left = (this._private__isLeft) ? Math.round(width * pixelRatio) - borderSize : 0;
            ctx.fillRect(left, 0, borderSize, borderSize);
            ctx.restore();
        };
        PriceAxisStub.prototype._private__drawBackground = function (ctx, renderParams) {
            var _this = this;
            drawScaled(ctx, renderParams.pixelRatio, function () {
                clearRect(ctx, 0, 0, _this._private__size.w, _this._private__size.h, _this._private__bottomColor());
            });
        };
        return PriceAxisStub;
    }());

    function markWithGreaterWeight(a, b) {
        return a.weight > b.weight ? a : b;
    }
    var TimeAxisWidget = /** @class */ (function () {
        function TimeAxisWidget(chartWidget) {
            var _this = this;
            this._private__leftStub = null;
            this._private__rightStub = null;
            this._private__rendererOptions = null;
            this._private__mouseDown = false;
            this._private__size = new Size(0, 0);
            this._private__sizeChanged = new Delegate();
            this._private__widthCache = new TextWidthCache(5);
            this._private__isSettingSize = false;
            this._private__canvasConfiguredHandler = function () {
                if (!_this._private__isSettingSize) {
                    _this._private__chart.model().lightUpdate();
                }
            };
            this._private__topCanvasConfiguredHandler = function () {
                if (!_this._private__isSettingSize) {
                    _this._private__chart.model().lightUpdate();
                }
            };
            this._private__chart = chartWidget;
            this._private__options = chartWidget.options().layout;
            this._private__element = document.createElement('tr');
            this._private__leftStubCell = document.createElement('td');
            this._private__leftStubCell.style.padding = '0';
            this._private__rightStubCell = document.createElement('td');
            this._private__rightStubCell.style.padding = '0';
            this._private__cell = document.createElement('td');
            this._private__cell.style.height = '25px';
            this._private__cell.style.padding = '0';
            this._private__dv = document.createElement('div');
            this._private__dv.style.width = '100%';
            this._private__dv.style.height = '100%';
            this._private__dv.style.position = 'relative';
            this._private__dv.style.overflow = 'hidden';
            this._private__cell.appendChild(this._private__dv);
            this._private__canvasBinding = createBoundCanvas(this._private__dv, new Size(16, 16));
            this._private__canvasBinding.subscribeCanvasConfigured(this._private__canvasConfiguredHandler);
            var canvas = this._private__canvasBinding.canvas;
            canvas.style.position = 'absolute';
            canvas.style.zIndex = '1';
            canvas.style.left = '0';
            canvas.style.top = '0';
            this._private__topCanvasBinding = createBoundCanvas(this._private__dv, new Size(16, 16));
            this._private__topCanvasBinding.subscribeCanvasConfigured(this._private__topCanvasConfiguredHandler);
            var topCanvas = this._private__topCanvasBinding.canvas;
            topCanvas.style.position = 'absolute';
            topCanvas.style.zIndex = '2';
            topCanvas.style.left = '0';
            topCanvas.style.top = '0';
            this._private__element.appendChild(this._private__leftStubCell);
            this._private__element.appendChild(this._private__cell);
            this._private__element.appendChild(this._private__rightStubCell);
            this._private__recreateStubs();
            this._private__chart.model().priceScalesOptionsChanged().subscribe(this._private__recreateStubs.bind(this), this);
            this._private__mouseEventHandler = new MouseEventHandler(this._private__topCanvasBinding.canvas, this, {
                _internal_treatVertTouchDragAsPageScroll: function () { return true; },
                _internal_treatHorzTouchDragAsPageScroll: function () { return false; },
            });
        }
        TimeAxisWidget.prototype.destroy = function () {
            this._private__mouseEventHandler.destroy();
            if (this._private__leftStub !== null) {
                this._private__leftStub.destroy();
            }
            if (this._private__rightStub !== null) {
                this._private__rightStub.destroy();
            }
            this._private__topCanvasBinding.unsubscribeCanvasConfigured(this._private__topCanvasConfiguredHandler);
            this._private__topCanvasBinding.destroy();
            this._private__canvasBinding.unsubscribeCanvasConfigured(this._private__canvasConfiguredHandler);
            this._private__canvasBinding.destroy();
        };
        TimeAxisWidget.prototype.getElement = function () {
            return this._private__element;
        };
        TimeAxisWidget.prototype.leftStub = function () {
            return this._private__leftStub;
        };
        TimeAxisWidget.prototype.rightStub = function () {
            return this._private__rightStub;
        };
        TimeAxisWidget.prototype.mouseDownEvent = function (event) {
            if (this._private__mouseDown) {
                return;
            }
            this._private__mouseDown = true;
            var model = this._private__chart.model();
            if (model.timeScale().isEmpty() || !this._private__chart.options().handleScale.axisPressedMouseMove.time) {
                return;
            }
            model.startScaleTime(event.localX);
        };
        TimeAxisWidget.prototype.touchStartEvent = function (event) {
            this.mouseDownEvent(event);
        };
        TimeAxisWidget.prototype.mouseDownOutsideEvent = function () {
            var model = this._private__chart.model();
            if (!model.timeScale().isEmpty() && this._private__mouseDown) {
                this._private__mouseDown = false;
                if (this._private__chart.options().handleScale.axisPressedMouseMove.time) {
                    model.endScaleTime();
                }
            }
        };
        TimeAxisWidget.prototype.pressedMouseMoveEvent = function (event) {
            var model = this._private__chart.model();
            if (model.timeScale().isEmpty() || !this._private__chart.options().handleScale.axisPressedMouseMove.time) {
                return;
            }
            model.scaleTimeTo(event.localX);
        };
        TimeAxisWidget.prototype.touchMoveEvent = function (event) {
            this.pressedMouseMoveEvent(event);
        };
        TimeAxisWidget.prototype.mouseUpEvent = function () {
            this._private__mouseDown = false;
            var model = this._private__chart.model();
            if (model.timeScale().isEmpty() && !this._private__chart.options().handleScale.axisPressedMouseMove.time) {
                return;
            }
            model.endScaleTime();
        };
        TimeAxisWidget.prototype.touchEndEvent = function () {
            this.mouseUpEvent();
        };
        TimeAxisWidget.prototype.mouseDoubleClickEvent = function () {
            if (this._private__chart.options().handleScale.axisDoubleClickReset) {
                this._private__chart.model().resetTimeScale();
            }
        };
        TimeAxisWidget.prototype.doubleTapEvent = function () {
            this.mouseDoubleClickEvent();
        };
        TimeAxisWidget.prototype.mouseEnterEvent = function () {
            if (this._private__chart.model().options().handleScale.axisPressedMouseMove.time) {
                this._private__setCursor(1 /* EwResize */);
            }
        };
        TimeAxisWidget.prototype.mouseLeaveEvent = function () {
            this._private__setCursor(0 /* Default */);
        };
        TimeAxisWidget.prototype.getSize = function () {
            return this._private__size;
        };
        TimeAxisWidget.prototype.sizeChanged = function () {
            return this._private__sizeChanged;
        };
        TimeAxisWidget.prototype.setSizes = function (timeAxisSize, leftStubWidth, rightStubWidth) {
            if (!this._private__size || !this._private__size.equals(timeAxisSize)) {
                this._private__size = timeAxisSize;
                this._private__isSettingSize = true;
                this._private__canvasBinding.resizeCanvas({ width: timeAxisSize.w, height: timeAxisSize.h });
                this._private__topCanvasBinding.resizeCanvas({ width: timeAxisSize.w, height: timeAxisSize.h });
                this._private__isSettingSize = false;
                this._private__cell.style.minWidth = timeAxisSize.w + 'px';
                this._private__cell.style.width = timeAxisSize.w + 'px';
                this._private__cell.style.height = timeAxisSize.h + 'px';
                this._private__sizeChanged.fire(timeAxisSize);
            }
            if (this._private__leftStub !== null) {
                this._private__leftStub.setSize(new Size(leftStubWidth, timeAxisSize.h));
            }
            if (this._private__rightStub !== null) {
                this._private__rightStub.setSize(new Size(rightStubWidth, timeAxisSize.h));
            }
        };
        TimeAxisWidget.prototype.optimalHeight = function () {
            var rendererOptions = this._private__getRendererOptions();
            return Math.ceil(
            // rendererOptions.offsetSize +
            rendererOptions.borderSize +
                rendererOptions.tickLength +
                rendererOptions.fontSize +
                rendererOptions.paddingTop +
                rendererOptions.paddingBottom);
        };
        TimeAxisWidget.prototype.update = function () {
            // this call has side-effect - it regenerates marks on the time scale
            this._private__chart.model().timeScale().marks();
        };
        TimeAxisWidget.prototype.getImage = function () {
            return this._private__canvasBinding.canvas;
        };
        TimeAxisWidget.prototype.paint = function (type) {
            if (type === 0 /* None */) {
                return;
            }
            if (type !== 1 /* Cursor */) {
                var ctx = getContext2D(this._private__canvasBinding.canvas);
                var renderParams_1 = this._private__chart.paneWidgets()[0].canvasRenderParams(this._private__canvasBinding);
                this._private__drawBackground(ctx, renderParams_1);
                this._private__drawBorder(ctx, renderParams_1);
                this._private__drawSources(this._private__chart.model().dataSources(), ctx, renderParams_1, true);
                this._private__drawTickMarks(ctx, renderParams_1);
                this._private__drawSources(this._private__chart.model().dataSources(), ctx, renderParams_1);
                if (this._private__leftStub !== null) {
                    this._private__leftStub.paint(type);
                }
                if (this._private__rightStub !== null) {
                    this._private__rightStub.paint(type);
                }
            }
            var topCtx = getContext2D(this._private__topCanvasBinding.canvas);
            var renderParams = this._private__chart.paneWidgets()[0].canvasRenderParams(this._private__topCanvasBinding);
            var pixelRatio = this._private__topCanvasBinding.pixelRatio;
            topCtx.clearRect(0, 0, Math.ceil(this._private__size.w * pixelRatio), Math.ceil(this._private__size.h * pixelRatio));
            this._private__drawSources([this._private__chart.model().crosshairSource()], topCtx, renderParams);
        };
        TimeAxisWidget.prototype._private__drawBackground = function (ctx, renderParams) {
            var _this = this;
            drawScaled(ctx, renderParams.pixelRatio, function () {
                clearRect(ctx, 0, 0, _this._private__size.w, _this._private__size.h, _this._private__chart.model().backgroundBottomColor());
            });
        };
        TimeAxisWidget.prototype._private__drawBorder = function (ctx, renderParams) {
            if (this._private__chart.options().timeScale.borderVisible) {
                ctx.save();
                ctx.fillStyle = this._private__lineColor();
                var pixelRatio = renderParams.pixelRatio;
                var borderSize = Math.max(1, Math.floor(this._private__getRendererOptions().borderSize * pixelRatio));
                ctx.fillRect(0, 0, Math.ceil(this._private__size.w * pixelRatio), borderSize);
                ctx.restore();
            }
        };
        TimeAxisWidget.prototype._private__drawTickMarks = function (ctx, renderParams) {
            var _this = this;
            var tickMarks = this._private__chart.model().timeScale().marks();
            if (!tickMarks || tickMarks.length === 0) {
                return;
            }
            var pixelRatio = renderParams.pixelRatio;
            var maxWeight = tickMarks.reduce(markWithGreaterWeight, tickMarks[0]).weight;
            // special case: it looks strange if 15:00 is bold but 14:00 is not
            // so if maxWeight > TickMarkWeight.Hour1 and < TickMarkWeight.Day reduce it to TickMarkWeight.Hour1
            if (maxWeight > 30 /* Hour1 */ && maxWeight < 50 /* Day */) {
                maxWeight = 30 /* Hour1 */;
            }
            ctx.save();
            ctx.strokeStyle = this._private__lineColor();
            var rendererOptions = this._private__getRendererOptions();
            var yText = (rendererOptions.borderSize +
                rendererOptions.tickLength +
                rendererOptions.paddingTop +
                rendererOptions.fontSize -
                rendererOptions.baselineOffset);
            ctx.textAlign = 'center';
            ctx.fillStyle = this._private__lineColor();
            var borderSize = Math.floor(this._private__getRendererOptions().borderSize * pixelRatio);
            var tickWidth = Math.max(1, Math.floor(pixelRatio));
            var tickOffset = Math.floor(pixelRatio * 0.5);
            if (this._private__chart.model().timeScale().options().borderVisible) {
                ctx.beginPath();
                var tickLen = Math.round(rendererOptions.tickLength * pixelRatio);
                for (var index = tickMarks.length; index--;) {
                    var x = Math.round(tickMarks[index].coord * pixelRatio);
                    ctx.rect(x - tickOffset, borderSize, tickWidth, tickLen);
                }
                ctx.fill();
            }
            ctx.fillStyle = this._private__textColor();
            drawScaled(ctx, renderParams.pixelRatio, function () {
                // draw base marks
                ctx.font = _this._private__baseFont();
                for (var _i = 0, tickMarks_1 = tickMarks; _i < tickMarks_1.length; _i++) {
                    var tickMark = tickMarks_1[_i];
                    if (tickMark.weight < maxWeight) {
                        var coordinate = tickMark.needAlignCoordinate ? _this._private__alignTickMarkLabelCoordinate(ctx, tickMark.coord, tickMark.label) : tickMark.coord;
                        ctx.fillText(tickMark.label, coordinate, yText);
                    }
                }
                ctx.font = _this._private__baseBoldFont();
                for (var _a = 0, tickMarks_2 = tickMarks; _a < tickMarks_2.length; _a++) {
                    var tickMark = tickMarks_2[_a];
                    if (tickMark.weight >= maxWeight) {
                        var coordinate = tickMark.needAlignCoordinate ? _this._private__alignTickMarkLabelCoordinate(ctx, tickMark.coord, tickMark.label) : tickMark.coord;
                        ctx.fillText(tickMark.label, coordinate, yText);
                    }
                }
            });
            ctx.restore();
        };
        TimeAxisWidget.prototype._private__alignTickMarkLabelCoordinate = function (ctx, coordinate, labelText) {
            var labelWidth = this._private__widthCache.measureText(ctx, labelText);
            var labelWidthHalf = labelWidth / 2;
            var leftTextCoordinate = Math.floor(coordinate - labelWidthHalf) + 0.5;
            if (leftTextCoordinate < 0) {
                coordinate = coordinate + Math.abs(0 - leftTextCoordinate);
            }
            else if (leftTextCoordinate + labelWidth > this._private__size.w) {
                coordinate = coordinate - Math.abs(this._private__size.w - (leftTextCoordinate + labelWidth));
            }
            return coordinate;
        };
        TimeAxisWidget.prototype._private__drawSources = function (sources, ctx, renderParams, background) {
            var rendererOptions = this._private__getRendererOptions();
            for (var _i = 0, sources_1 = sources; _i < sources_1.length; _i++) {
                var source = sources_1[_i];
                for (var _a = 0, _b = source.timeAxisViews(); _a < _b.length; _a++) {
                    var view = _b[_a];
                    var renderer = view.renderer();
                    ctx.save();
                    if (background && renderer.drawBackground) {
                        renderer.drawBackground(ctx, rendererOptions, renderParams);
                    }
                    else if (renderer.draw) {
                        renderer.draw(ctx, rendererOptions, renderParams);
                    }
                    ctx.restore();
                }
            }
        };
        TimeAxisWidget.prototype._private__lineColor = function () {
            return this._private__chart.options().timeScale.borderColor;
        };
        TimeAxisWidget.prototype._private__textColor = function () {
            return this._private__options.textColor;
        };
        TimeAxisWidget.prototype._private__fontSize = function () {
            return this._private__options.fontSize;
        };
        TimeAxisWidget.prototype._private__baseFont = function () {
            return makeFont(this._private__fontSize(), this._private__options.fontFamily);
        };
        TimeAxisWidget.prototype._private__baseBoldFont = function () {
            return makeFont(this._private__fontSize(), this._private__options.fontFamily, 'bold');
        };
        TimeAxisWidget.prototype._private__getRendererOptions = function () {
            if (this._private__rendererOptions === null) {
                this._private__rendererOptions = {
                    borderSize: 1 /* BorderSize */,
                    baselineOffset: NaN,
                    paddingTop: NaN,
                    paddingBottom: NaN,
                    paddingHorizontal: NaN,
                    tickLength: 3 /* TickLength */,
                    fontSize: NaN,
                    font: '',
                    widthCache: new TextWidthCache(),
                };
            }
            var rendererOptions = this._private__rendererOptions;
            var newFont = this._private__baseFont();
            if (rendererOptions.font !== newFont) {
                var fontSize = this._private__fontSize();
                rendererOptions.fontSize = fontSize;
                rendererOptions.font = newFont;
                rendererOptions.paddingTop = Math.ceil(fontSize / 2.5);
                rendererOptions.paddingBottom = rendererOptions.paddingTop;
                rendererOptions.paddingHorizontal = Math.ceil(fontSize / 2);
                rendererOptions.baselineOffset = Math.round(this._private__fontSize() / 5);
                rendererOptions.widthCache.reset();
            }
            return this._private__rendererOptions;
        };
        TimeAxisWidget.prototype._private__setCursor = function (type) {
            this._private__cell.style.cursor = type === 1 /* EwResize */ ? 'ew-resize' : 'default';
        };
        TimeAxisWidget.prototype._private__recreateStubs = function () {
            var model = this._private__chart.model();
            var options = model.options();
            if (!options.leftPriceScale.visible && this._private__leftStub !== null) {
                this._private__leftStubCell.removeChild(this._private__leftStub.getElement());
                this._private__leftStub.destroy();
                this._private__leftStub = null;
            }
            if (!options.rightPriceScale.visible && this._private__rightStub !== null) {
                this._private__rightStubCell.removeChild(this._private__rightStub.getElement());
                this._private__rightStub.destroy();
                this._private__rightStub = null;
            }
            var rendererOptionsProvider = this._private__chart.model().rendererOptionsProvider();
            var params = {
                rendererOptionsProvider: rendererOptionsProvider,
            };
            var borderVisibleGetter = function () {
                return options.leftPriceScale.borderVisible && model.timeScale().options().borderVisible;
            };
            var bottomColorGetter = function () { return model.backgroundBottomColor(); };
            if (options.leftPriceScale.visible && this._private__leftStub === null) {
                this._private__leftStub = new PriceAxisStub('left', options, params, borderVisibleGetter, bottomColorGetter);
                this._private__leftStubCell.appendChild(this._private__leftStub.getElement());
            }
            if (options.rightPriceScale.visible && this._private__rightStub === null) {
                this._private__rightStub = new PriceAxisStub('right', options, params, borderVisibleGetter, bottomColorGetter);
                this._private__rightStubCell.appendChild(this._private__rightStub.getElement());
            }
        };
        return TimeAxisWidget;
    }());

    var ChartWidget = /** @class */ (function () {
        function ChartWidget(container, options) {
            this._private__paneWidgets = [];
            this._private__paneSeparators = [];
            this._private__drawRafId = 0;
            this._private__height = 0;
            this._private__width = 0;
            this._private__leftPriceAxisWidth = 0;
            this._private__rightPriceAxisWidth = 0;
            this._private__invalidateMask = null;
            this._private__drawPlanned = false;
            this._private__clicked = new Delegate();
            this._private__crosshairMoved = new Delegate();
            this._private__options = options;
            this._private__element = document.createElement('div');
            this._private__element.classList.add('tv-lightweight-charts');
            this._private__element.style.overflow = 'hidden';
            this._private__element.style.width = '100%';
            this._private__element.style.height = '100%';
            disableSelection(this._private__element);
            this._private__tableElement = document.createElement('table');
            this._private__tableElement.setAttribute('cellspacing', '0');
            this._private__element.appendChild(this._private__tableElement);
            this._private__onWheelBound = this._private__onMousewheel.bind(this);
            this._private__element.addEventListener('wheel', this._private__onWheelBound, {
                passive: false,
            });
            this._private__model = new ChartModel(this._private__invalidateHandler.bind(this), this._private__options);
            this.model()
                .crosshairMoved()
                .subscribe(this._private__onPaneWidgetCrosshairMoved.bind(this), this);
            this._private__timeAxisWidget = new TimeAxisWidget(this);
            this._private__tableElement.appendChild(this._private__timeAxisWidget.getElement());
            var width = this._private__options.width;
            var height = this._private__options.height;
            if (width === 0 || height === 0) {
                var containerRect = container.getBoundingClientRect();
                // TODO: Fix it better
                // on Hi-DPI CSS size * Device Pixel Ratio should be integer to avoid smoothing
                // For chart widget we decreases because we must be inside container.
                // For time axis this is not important, since it just affects space for pane widgets
                if (width === 0) {
                    width = Math.floor(containerRect.width);
                    width -= width % 2;
                }
                if (height === 0) {
                    height = Math.floor(containerRect.height);
                    height -= height % 2;
                }
            }
            // BEWARE: resize must be called BEFORE _syncGuiWithModel (in constructor only)
            // or after but with adjustSize to properly update time scale
            this.resize(width, height);
            this._private__syncGuiWithModel();
            container.appendChild(this._private__element);
            this._private__updateTimeAxisVisibility();
            this._private__model
                .timeScale()
                .optionsApplied()
                .subscribe(this._private__model.fullUpdate.bind(this._private__model), this);
            this._private__model
                .priceScalesOptionsChanged()
                .subscribe(this._private__model.fullUpdate.bind(this._private__model), this);
        }
        ChartWidget.prototype.model = function () {
            return this._private__model;
        };
        ChartWidget.prototype.options = function () {
            return this._private__options;
        };
        ChartWidget.prototype.paneWidgets = function () {
            return this._private__paneWidgets;
        };
        ChartWidget.prototype.timeAxisWidget = function () {
            return this._private__timeAxisWidget;
        };
        ChartWidget.prototype.destroy = function () {
            this._private__element.removeEventListener('wheel', this._private__onWheelBound);
            if (this._private__drawRafId !== 0) {
                window.cancelAnimationFrame(this._private__drawRafId);
            }
            this._private__model.crosshairMoved().unsubscribeAll(this);
            this._private__model.timeScale().optionsApplied().unsubscribeAll(this);
            this._private__model.priceScalesOptionsChanged().unsubscribeAll(this);
            this._private__model.destroy();
            for (var _i = 0, _a = this._private__paneWidgets; _i < _a.length; _i++) {
                var paneWidget = _a[_i];
                this._private__tableElement.removeChild(paneWidget.getElement());
                paneWidget.clicked().unsubscribeAll(this);
                paneWidget.destroy();
            }
            this._private__paneWidgets = [];
            for (var _b = 0, _c = this._private__paneSeparators; _b < _c.length; _b++) {
                var paneSeparator = _c[_b];
                this._private__destroySeparator(paneSeparator);
            }
            this._private__paneSeparators = [];
            ensureNotNull(this._private__timeAxisWidget).destroy();
            if (this._private__element.parentElement !== null) {
                this._private__element.parentElement.removeChild(this._private__element);
            }
            this._private__crosshairMoved.destroy();
            this._private__clicked.destroy();
        };
        ChartWidget.prototype.resize = function (width, height, forceRepaint) {
            if (forceRepaint === void 0) { forceRepaint = false; }
            if (this._private__height === height && this._private__width === width) {
                return;
            }
            this._private__height = height;
            this._private__width = width;
            var heightStr = height + 'px';
            var widthStr = width + 'px';
            ensureNotNull(this._private__element).style.height = heightStr;
            ensureNotNull(this._private__element).style.width = widthStr;
            this._private__tableElement.style.height = heightStr;
            this._private__tableElement.style.width = widthStr;
            if (forceRepaint) {
                this._private__drawImpl(new InvalidateMask(3 /* Full */));
            }
            else {
                this._private__model.fullUpdate();
            }
        };
        ChartWidget.prototype.paint = function (invalidateMask) {
            if (invalidateMask === undefined) {
                invalidateMask = new InvalidateMask(3 /* Full */);
            }
            for (var i = 0; i < this._private__paneWidgets.length; i++) {
                this._private__paneWidgets[i].paint(invalidateMask.invalidateForPane(i).level);
            }
            if (this._private__options.timeScale.visible) {
                this._private__timeAxisWidget.paint(invalidateMask.fullInvalidation());
            }
        };
        ChartWidget.prototype.applyOptions = function (options) {
            // we don't need to merge options here because it's done in chart model
            // and since both model and widget share the same object it will be done automatically for widget as well
            // not ideal solution for sure, but it work's for now ¯\_(ツ)_/¯
            this._private__model.applyOptions(options);
            this._private__updateTimeAxisVisibility();
            var width = options.width || this._private__width;
            var height = options.height || this._private__height;
            this.resize(width, height);
        };
        ChartWidget.prototype.clicked = function () {
            return this._private__clicked;
        };
        ChartWidget.prototype.crosshairMoved = function () {
            return this._private__crosshairMoved;
        };
        ChartWidget.prototype.takeScreenshot = function () {
            var _this = this;
            if (this._private__invalidateMask !== null) {
                this._private__drawImpl(this._private__invalidateMask);
                this._private__invalidateMask = null;
            }
            // calculate target size
            var firstPane = this._private__paneWidgets[0];
            var targetCanvas = createPreconfiguredCanvas(document, new Size(this._private__width, this._private__height));
            var ctx = getContext2D(targetCanvas);
            var pixelRatio = getCanvasDevicePixelRatio(targetCanvas);
            drawScaled(ctx, pixelRatio, function () {
                var targetX = 0;
                var targetY = 0;
                var drawPriceAxises = function (position) {
                    for (var paneIndex = 0; paneIndex < _this._private__paneWidgets.length; paneIndex++) {
                        var paneWidget = _this._private__paneWidgets[paneIndex];
                        var paneWidgetHeight = paneWidget.getSize().h;
                        var priceAxisWidget = ensureNotNull(position === 'left'
                            ? paneWidget.leftPriceAxisWidget()
                            : paneWidget.rightPriceAxisWidget());
                        var image = priceAxisWidget.getImage();
                        ctx.drawImage(image, targetX, targetY, priceAxisWidget.getWidth(), paneWidgetHeight);
                        targetY += paneWidgetHeight;
                        if (paneIndex < _this._private__paneWidgets.length - 1) {
                            var separator = _this._private__paneSeparators[paneIndex];
                            var separatorSize = separator._internal_getSize();
                            var separatorImage = separator._internal_getImage();
                            ctx.drawImage(separatorImage, targetX, targetY, separatorSize.w, separatorSize.h);
                            targetY += separatorSize.h;
                        }
                    }
                };
                // draw left price scale if exists
                if (_this._private__isLeftAxisVisible()) {
                    drawPriceAxises('left');
                    targetX = ensureNotNull(firstPane.leftPriceAxisWidget()).getWidth();
                }
                targetY = 0;
                for (var paneIndex = 0; paneIndex < _this._private__paneWidgets.length; paneIndex++) {
                    var paneWidget = _this._private__paneWidgets[paneIndex];
                    var paneWidgetSize = paneWidget.getSize();
                    var image = paneWidget.getImage();
                    ctx.drawImage(image, targetX, targetY, paneWidgetSize.w, paneWidgetSize.h);
                    targetY += paneWidgetSize.h;
                    if (paneIndex < _this._private__paneWidgets.length - 1) {
                        var separator = _this._private__paneSeparators[paneIndex];
                        var separatorSize = separator._internal_getSize();
                        var separatorImage = separator._internal_getImage();
                        ctx.drawImage(separatorImage, targetX, targetY, separatorSize.w, separatorSize.h);
                        targetY += separatorSize.h;
                    }
                }
                targetX += firstPane.getSize().w;
                if (_this._private__isRightAxisVisible()) {
                    targetY = 0;
                    drawPriceAxises('right');
                }
                var drawStub = function (position) {
                    var stub = ensureNotNull(position === 'left'
                        ? _this._private__timeAxisWidget.leftStub()
                        : _this._private__timeAxisWidget.rightStub());
                    var size = stub.getSize();
                    var image = stub.getImage();
                    ctx.drawImage(image, targetX, targetY, size.w, size.h);
                };
                // draw time scale
                if (_this._private__options.timeScale.visible) {
                    targetX = 0;
                    if (_this._private__isLeftAxisVisible()) {
                        drawStub('left');
                        targetX = ensureNotNull(firstPane.leftPriceAxisWidget()).getWidth();
                    }
                    var size = _this._private__timeAxisWidget.getSize();
                    var image = _this._private__timeAxisWidget.getImage();
                    ctx.drawImage(image, targetX, targetY, size.w, size.h);
                    if (_this._private__isRightAxisVisible()) {
                        targetX += firstPane.getSize().w;
                        drawStub('right');
                        ctx.restore();
                    }
                }
            });
            return targetCanvas;
        };
        ChartWidget.prototype.getPriceAxisWidth = function (position) {
            if (position === 'none') {
                return 0;
            }
            if (position === 'left' && !this._private__isLeftAxisVisible()) {
                return 0;
            }
            if (position === 'right' && !this._private__isRightAxisVisible()) {
                return 0;
            }
            if (this._private__paneWidgets.length === 0) {
                return 0;
            }
            // we don't need to worry about exactly pane widget here
            // because all pane widgets have the same width of price axis widget
            // see _adjustSizeImpl
            var priceAxisWidget = position === 'left'
                ? this._private__paneWidgets[0].leftPriceAxisWidget()
                : this._private__paneWidgets[0].rightPriceAxisWidget();
            return ensureNotNull(priceAxisWidget).getWidth();
        };
        ChartWidget.prototype.adjustSize = function () {
            this._private__adjustSizeImpl();
        };
        // eslint-disable-next-line complexity
        ChartWidget.prototype._private__adjustSizeImpl = function () {
            var _a;
            var totalStretch = 0;
            var leftPriceAxisWidth = 0;
            var rightPriceAxisWidth = 0;
            var leftPriceAxisFloating = false;
            var rightPriceAxisFloating = false;
            for (var _i = 0, _b = this._private__paneWidgets; _i < _b.length; _i++) {
                var paneWidget = _b[_i];
                if (this._private__isLeftAxisVisible()) {
                    leftPriceAxisWidth = Math.max(leftPriceAxisWidth, ensureNotNull(paneWidget.leftPriceAxisWidget()).optimalWidth());
                    leftPriceAxisFloating = ensureNotNull(paneWidget.leftPriceAxisWidget()).floating();
                }
                if (this._private__isRightAxisVisible()) {
                    rightPriceAxisWidth = Math.max(rightPriceAxisWidth, ensureNotNull(paneWidget.rightPriceAxisWidget()).optimalWidth());
                    rightPriceAxisFloating = ensureNotNull(paneWidget.rightPriceAxisWidget()).floating();
                }
                totalStretch += paneWidget.stretchFactor();
            }
            var width = this._private__width;
            var height = this._private__height;
            var paneWidth = Math.max(width - (leftPriceAxisFloating ? 0 : leftPriceAxisWidth) - (rightPriceAxisFloating ? 0 : rightPriceAxisWidth), 0);
            var separatorCount = this._private__paneSeparators.length;
            var separatorHeight = SEPARATOR_HEIGHT;
            var separatorsHeight = separatorHeight * separatorCount;
            var timeAxisVisible = this._private__options.timeScale.visible;
            var timeAxisHeight = this._private__options.timeScale.visible
                ? this._private__timeAxisWidget.optimalHeight()
                : 0;
            // TODO: Fix it better
            // on Hi-DPI CSS size * Device Pixel Ratio should be integer to avoid smoothing
            if (timeAxisHeight % 2) {
                timeAxisHeight += 1;
            }
            var otherWidgetHeight = separatorsHeight + timeAxisHeight;
            var totalPaneHeight = height < otherWidgetHeight ? 0 : height - otherWidgetHeight;
            var stretchPixels = totalPaneHeight / totalStretch;
            var accumulatedHeight = 0;
            var pixelRatio = ((_a = document.body.ownerDocument.defaultView) === null || _a === void 0 ? void 0 : _a.devicePixelRatio) || 1;
            for (var paneIndex = 0; paneIndex < this._private__paneWidgets.length; ++paneIndex) {
                var paneWidget = this._private__paneWidgets[paneIndex];
                paneWidget.setState(this._private__model.panes()[paneIndex]);
                var paneHeight = 0;
                var calculatePaneHeight = 0;
                if (paneIndex === this._private__paneWidgets.length - 1) {
                    calculatePaneHeight =
                        Math.ceil((totalPaneHeight - accumulatedHeight) * pixelRatio) /
                            pixelRatio;
                }
                else {
                    calculatePaneHeight =
                        Math.round(paneWidget.stretchFactor() * stretchPixels * pixelRatio) /
                            pixelRatio;
                }
                paneHeight = Math.max(calculatePaneHeight, 2);
                accumulatedHeight += paneHeight;
                paneWidget.setSize(new Size(paneWidth, paneHeight));
                if (this._private__isLeftAxisVisible()) {
                    paneWidget.setPriceAxisSize(leftPriceAxisWidth, 'left');
                }
                if (this._private__isRightAxisVisible()) {
                    paneWidget.setPriceAxisSize(rightPriceAxisWidth, 'right');
                }
                if (paneWidget.state()) {
                    this._private__model.setPaneHeight(paneWidget.state(), paneHeight);
                }
            }
            this._private__timeAxisWidget.setSizes(new Size(timeAxisVisible ? paneWidth : 0, timeAxisHeight), timeAxisVisible && !leftPriceAxisFloating ? leftPriceAxisWidth : 0, timeAxisVisible && !rightPriceAxisFloating ? rightPriceAxisWidth : 0);
            this._private__model.setWidth(paneWidth);
            if (this._private__leftPriceAxisWidth !== leftPriceAxisWidth) {
                this._private__leftPriceAxisWidth = leftPriceAxisWidth;
            }
            if (this._private__rightPriceAxisWidth !== rightPriceAxisWidth) {
                this._private__rightPriceAxisWidth = rightPriceAxisWidth;
            }
        };
        ChartWidget.prototype._private__onMousewheel = function (event) {
            var deltaX = event.deltaX / 100;
            var deltaY = -(event.deltaY / 100);
            if ((deltaX === 0 || !this._private__options.handleScroll.mouseWheel) &&
                (deltaY === 0 || !this._private__options.handleScale.mouseWheel)) {
                return;
            }
            if (event.cancelable) {
                event.preventDefault();
            }
            switch (event.deltaMode) {
                case event.DOM_DELTA_PAGE:
                    // one screen at time scroll mode
                    deltaX *= 120;
                    deltaY *= 120;
                    break;
                case event.DOM_DELTA_LINE:
                    // one line at time scroll mode
                    deltaX *= 32;
                    deltaY *= 32;
                    break;
            }
            if (deltaY !== 0 && this._private__options.handleScale.mouseWheel) {
                var zoomScale = Math.sign(deltaY) * Math.min(1, Math.abs(deltaY));
                var scrollPosition = event.clientX - this._private__element.getBoundingClientRect().left;
                this.model().zoomTime(scrollPosition, zoomScale);
            }
            if (deltaX !== 0 && this._private__options.handleScroll.mouseWheel) {
                this.model().scrollChart((deltaX * -80)); // 80 is a made up coefficient, and minus is for the "natural" scroll
            }
        };
        ChartWidget.prototype._private__drawImpl = function (invalidateMask) {
            var _a;
            var invalidationType = invalidateMask.fullInvalidation();
            // actions for full invalidation ONLY (not shared with light)
            if (invalidationType === 3 /* Full */) {
                this._private__updateGui();
            }
            // light or full invalidate actions
            if (invalidationType === 3 /* Full */ ||
                invalidationType === 2 /* Light */) {
                this._private__applyMomentaryAutoScale(invalidateMask);
                this._private__applyTimeScaleInvalidations(invalidateMask);
                this._private__timeAxisWidget.update();
                this._private__paneWidgets.forEach(function (pane) {
                    pane.updatePriceAxisWidgets();
                });
                // In the case a full invalidation has been postponed during the draw, reapply
                // the timescale invalidations. A full invalidation would mean there is a change
                // in the timescale width (caused by price scale changes) that needs to be drawn
                // right away to avoid flickering.
                if (((_a = this._private__invalidateMask) === null || _a === void 0 ? void 0 : _a.fullInvalidation()) === 3 /* Full */) {
                    this._private__invalidateMask.merge(invalidateMask);
                    this._private__updateGui();
                    this._private__applyMomentaryAutoScale(this._private__invalidateMask);
                    this._private__applyTimeScaleInvalidations(this._private__invalidateMask);
                    invalidateMask = this._private__invalidateMask;
                    this._private__invalidateMask = null;
                }
            }
            this.paint(invalidateMask);
        };
        ChartWidget.prototype._private__applyTimeScaleInvalidations = function (invalidateMask) {
            var timeScaleInvalidations = invalidateMask.timeScaleInvalidations();
            for (var _i = 0, timeScaleInvalidations_1 = timeScaleInvalidations; _i < timeScaleInvalidations_1.length; _i++) {
                var tsInvalidation = timeScaleInvalidations_1[_i];
                this._private__applyTimeScaleInvalidation(tsInvalidation);
            }
        };
        ChartWidget.prototype._private__applyMomentaryAutoScale = function (invalidateMask) {
            var panes = this._private__model.panes();
            for (var i = 0; i < panes.length; i++) {
                if (invalidateMask.invalidateForPane(i).autoScale) {
                    panes[i].momentaryAutoScale();
                }
            }
        };
        ChartWidget.prototype._private__applyTimeScaleInvalidation = function (invalidation) {
            var timeScale = this._private__model.timeScale();
            switch (invalidation.type) {
                case 0 /* FitContent */:
                    timeScale.fitContent();
                    break;
                case 1 /* ApplyRange */:
                    timeScale.setLogicalRange(invalidation.value);
                    break;
                case 2 /* ApplyBarSpacing */:
                    timeScale.setBarSpacing(invalidation.value);
                    break;
                case 3 /* ApplyRightOffset */:
                    timeScale.setRightOffset(invalidation.value);
                    break;
                case 4 /* Reset */:
                    timeScale.restoreDefault();
                    break;
            }
        };
        ChartWidget.prototype._private__invalidateHandler = function (invalidateMask) {
            var _this = this;
            if (this._private__invalidateMask !== null) {
                this._private__invalidateMask.merge(invalidateMask);
            }
            else {
                this._private__invalidateMask = invalidateMask;
            }
            if (!this._private__drawPlanned) {
                this._private__drawPlanned = true;
                this._private__drawRafId = window.requestAnimationFrame(function () {
                    _this._private__drawPlanned = false;
                    _this._private__drawRafId = 0;
                    if (_this._private__invalidateMask !== null) {
                        var mask = _this._private__invalidateMask;
                        _this._private__invalidateMask = null;
                        _this._private__drawImpl(mask);
                    }
                });
            }
        };
        ChartWidget.prototype._private__updateGui = function () {
            this._private__syncGuiWithModel();
        };
        ChartWidget.prototype._private__destroySeparator = function (separator) {
            this._private__tableElement.removeChild(separator._internal_getElement());
            separator.destroy();
        };
        ChartWidget.prototype._private__syncGuiWithModel = function () {
            var panes = this._private__model.panes();
            var targetPaneWidgetsCount = panes.length;
            var actualPaneWidgetsCount = this._private__paneWidgets.length;
            // Remove (if needed) pane widgets and separators
            for (var i = targetPaneWidgetsCount; i < actualPaneWidgetsCount; i++) {
                var paneWidget = ensureDefined(this._private__paneWidgets.pop());
                this._private__tableElement.removeChild(paneWidget.getElement());
                paneWidget.clicked().unsubscribeAll(this);
                paneWidget.destroy();
                var paneSeparator = this._private__paneSeparators.pop();
                if (paneSeparator !== undefined) {
                    this._private__destroySeparator(paneSeparator);
                }
            }
            // Create (if needed) new pane widgets and separators
            for (var i = actualPaneWidgetsCount; i < targetPaneWidgetsCount; i++) {
                var paneWidget = new PaneWidget(this, panes[i]);
                paneWidget
                    .clicked()
                    .subscribe(this._private__onPaneWidgetClicked.bind(this), this);
                this._private__paneWidgets.push(paneWidget);
                // create and insert separator
                if (i > 0) {
                    var paneSeparator = new PaneSeparator(this, i - 1, i, false);
                    this._private__paneSeparators.push(paneSeparator);
                    this._private__tableElement.insertBefore(paneSeparator._internal_getElement(), this._private__timeAxisWidget.getElement());
                }
                // insert paneWidget
                this._private__tableElement.insertBefore(paneWidget.getElement(), this._private__timeAxisWidget.getElement());
            }
            for (var i = 0; i < targetPaneWidgetsCount; i++) {
                var state = panes[i];
                var paneWidget = this._private__paneWidgets[i];
                if (paneWidget.state() !== state) {
                    paneWidget.setState(state);
                }
                else {
                    paneWidget.updatePriceAxisWidgetsStates();
                }
            }
            this._private__updateTimeAxisVisibility();
            this._private__adjustSizeImpl();
        };
        ChartWidget.prototype._private__getMouseEventParamsImpl = function (index, details) {
            var seriesPrices = new Map();
            if (index !== null) {
                var serieses = this._private__model.serieses();
                serieses.forEach(function (s) {
                    // TODO: replace with search left
                    var prices = s.dataAt(index);
                    if (prices !== null) {
                        seriesPrices.set(s, prices);
                    }
                });
            }
            var clientTime;
            if (index !== null) {
                var timePoint = this._private__model.timeScale().indexToTime(index);
                if (timePoint !== null) {
                    clientTime = timePoint;
                }
            }
            var hoveredSource = this.model().hoveredSource();
            var hoveredSeries = hoveredSource !== null && hoveredSource.source instanceof Series
                ? hoveredSource.source
                : undefined;
            var hoveredObject = hoveredSource !== null && hoveredSource.object !== undefined
                ? hoveredSource.object.externalId
                : undefined;
            return {
                time: clientTime,
                point: (details && new Point(details.x, details.y)) || undefined,
                paneIndex: details === null || details === void 0 ? void 0 : details.paneIndex,
                hoveredSeries: hoveredSeries,
                seriesPrices: seriesPrices,
                hoveredObject: hoveredObject,
            };
        };
        ChartWidget.prototype._private__onPaneWidgetClicked = function (time, details) {
            var _this = this;
            this._private__clicked.fire(function () { return _this._private__getMouseEventParamsImpl(time, details); });
        };
        ChartWidget.prototype._private__onPaneWidgetCrosshairMoved = function (time, details) {
            var _this = this;
            this._private__crosshairMoved.fire(function () {
                return _this._private__getMouseEventParamsImpl(time, details);
            });
        };
        ChartWidget.prototype._private__updateTimeAxisVisibility = function () {
            var display = this._private__options.timeScale.visible ? '' : 'none';
            this._private__timeAxisWidget.getElement().style.display = display;
        };
        ChartWidget.prototype._private__isLeftAxisVisible = function () {
            return this._private__paneWidgets[0].state().leftPriceScale().options().visible;
        };
        ChartWidget.prototype._private__isRightAxisVisible = function () {
            return this._private__paneWidgets[0].state().rightPriceScale().options().visible;
        };
        return ChartWidget;
    }());
    function disableSelection(element) {
        element.style.userSelect = 'none';
        // eslint-disable-next-line deprecation/deprecation
        element.style.webkitUserSelect = 'none';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-member-access
        element.style.msUserSelect = 'none';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-member-access
        element.style.MozUserSelect = 'none';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-member-access
        element.style.webkitTapHighlightColor = 'transparent';
    }

    /// <reference types="_build-time-constants" />
    function warn(msg) {
        {
            // eslint-disable-next-line no-console
            console.warn(msg);
        }
    }

    function getLineBasedSeriesPlotRow(time, index, item) {
        var val = item.value;
        return { index: index, time: time, value: [val, val, val, val] };
    }
    function getColoredLineBasedSeriesPlotRow(time, index, item) {
        var val = item.value;
        var res = { index: index, time: time, value: [val, val, val, val] };
        // 'color' here is public property (from API) so we can use `in` here safely
        // eslint-disable-next-line no-restricted-syntax
        if ('color' in item && item.color !== undefined) {
            res.color = item.color;
        }
        return res;
    }
    function getBarSeriesPlotRow(time, index, item) {
        var res = { index: index, time: time, value: [item.open, item.high, item.low, item.close] };
        // 'color' here is public property (from API) so we can use `in` here safely
        // eslint-disable-next-line no-restricted-syntax
        if ('color' in item && item.color !== undefined) {
            res.color = item.color;
        }
        return res;
    }
    function getCandlestickSeriesPlotRow(time, index, item) {
        var res = { index: index, time: time, value: [item.open, item.high, item.low, item.close] };
        // 'color' here is public property (from API) so we can use `in` here safely
        // eslint-disable-next-line no-restricted-syntax
        if ('color' in item && item.color !== undefined) {
            res.color = item.color;
        }
        // 'borderColor' here is public property (from API) so we can use `in` here safely
        // eslint-disable-next-line no-restricted-syntax
        if ('borderColor' in item && item.borderColor !== undefined) {
            res.borderColor = item.borderColor;
        }
        // 'wickColor' here is public property (from API) so we can use `in` here safely
        // eslint-disable-next-line no-restricted-syntax
        if ('wickColor' in item && item.wickColor !== undefined) {
            res.wickColor = item.wickColor;
        }
        return res;
    }
    function getCloudAreaBasedSeriesPlotRow(time, index, item) {
        return { index: index, time: time, value: [item.higherValue, item.higherValue, item.lowerValue, item.lowerValue] };
    }
    function getBrokenAreaBasedSeriesPlotRow(time, index, item) {
        var res = { index: index, time: time, value: [item.higherValue, item.higherValue, item.lowerValue, item.lowerValue] };
        if (typeof item.color !== 'undefined') {
            res.color = item.color;
        }
        if (typeof item.label !== 'undefined') {
            res.label = item.label;
        }
        if (typeof item.extendRight !== 'undefined') {
            res.extendRight = item.extendRight;
        }
        if (typeof item.id !== 'undefined') {
            res.id = item.id;
        }
        return res;
    }
    function isSeriesPlotRow(row) {
        return row.value !== undefined;
    }
    function wrapWhitespaceData(createPlotRowFn) {
        return function (time, index, bar) {
            if (isWhitespaceData(bar)) {
                return { time: time, index: index };
            }
            return createPlotRowFn(time, index, bar);
        };
    }
    var seriesPlotRowFnMap = {
        Candlestick: wrapWhitespaceData(getCandlestickSeriesPlotRow),
        Bar: wrapWhitespaceData(getBarSeriesPlotRow),
        Area: wrapWhitespaceData(getLineBasedSeriesPlotRow),
        Baseline: wrapWhitespaceData(getLineBasedSeriesPlotRow),
        CloudArea: wrapWhitespaceData(getCloudAreaBasedSeriesPlotRow),
        BrokenArea: wrapWhitespaceData(getBrokenAreaBasedSeriesPlotRow),
        Histogram: wrapWhitespaceData(getColoredLineBasedSeriesPlotRow),
        Line: wrapWhitespaceData(getColoredLineBasedSeriesPlotRow),
    };
    function getSeriesPlotRowCreator(seriesType) {
        return seriesPlotRowFnMap[seriesType];
    }

    function hours(count) {
        return count * 60 * 60 * 1000;
    }
    function minutes(count) {
        return count * 60 * 1000;
    }
    function seconds(count) {
        return count * 1000;
    }
    var intradayWeightDivisors = [
        { _internal_divisor: seconds(1), _internal_weight: 10 /* Second */ },
        { _internal_divisor: minutes(1), _internal_weight: 20 /* Minute1 */ },
        { _internal_divisor: minutes(5), _internal_weight: 21 /* Minute5 */ },
        { _internal_divisor: minutes(30), _internal_weight: 22 /* Minute30 */ },
        { _internal_divisor: hours(1), _internal_weight: 30 /* Hour1 */ },
        { _internal_divisor: hours(3), _internal_weight: 31 /* Hour3 */ },
        { _internal_divisor: hours(6), _internal_weight: 32 /* Hour6 */ },
        { _internal_divisor: hours(12), _internal_weight: 33 /* Hour12 */ },
    ];
    function weightByTime(currentDate, prevDate) {
        if (currentDate.getUTCFullYear() !== prevDate.getUTCFullYear()) {
            return 70 /* Year */;
        }
        else if (currentDate.getUTCMonth() !== prevDate.getUTCMonth()) {
            return 60 /* Month */;
        }
        else if (currentDate.getUTCDate() !== prevDate.getUTCDate()) {
            return 50 /* Day */;
        }
        for (var i = intradayWeightDivisors.length - 1; i >= 0; --i) {
            if (Math.floor(prevDate.getTime() / intradayWeightDivisors[i]._internal_divisor) !== Math.floor(currentDate.getTime() / intradayWeightDivisors[i]._internal_divisor)) {
                return intradayWeightDivisors[i]._internal_weight;
            }
        }
        return 0 /* LessThanSecond */;
    }
    function fillWeightsForPoints(sortedTimePoints, startIndex) {
        if (startIndex === void 0) { startIndex = 0; }
        if (sortedTimePoints.length === 0) {
            return;
        }
        var prevTime = startIndex === 0 ? null : sortedTimePoints[startIndex - 1].time.timestamp;
        var prevDate = prevTime !== null ? new Date(prevTime * 1000) : null;
        var totalTimeDiff = 0;
        for (var index = startIndex; index < sortedTimePoints.length; ++index) {
            var currentPoint = sortedTimePoints[index];
            var currentDate = new Date(currentPoint.time.timestamp * 1000);
            if (prevDate !== null) {
                currentPoint.timeWeight = weightByTime(currentDate, prevDate);
            }
            totalTimeDiff += currentPoint.time.timestamp - (prevTime || currentPoint.time.timestamp);
            prevTime = currentPoint.time.timestamp;
            prevDate = currentDate;
        }
        if (startIndex === 0 && sortedTimePoints.length > 1) {
            // let's guess a weight for the first point
            // let's say the previous point was average time back in the history
            var averageTimeDiff = Math.ceil(totalTimeDiff / (sortedTimePoints.length - 1));
            var approxPrevDate = new Date((sortedTimePoints[0].time.timestamp - averageTimeDiff) * 1000);
            sortedTimePoints[0].timeWeight = weightByTime(new Date(sortedTimePoints[0].time.timestamp * 1000), approxPrevDate);
        }
    }

    /// <reference types="_build-time-constants" />
    function businessDayConverter(time) {
        if (!isBusinessDay(time)) {
            throw new Error('time must be of type BusinessDay');
        }
        var date = new Date(Date.UTC(time.year, time.month - 1, time.day, 0, 0, 0, 0));
        return {
            timestamp: Math.round(date.getTime() / 1000),
            businessDay: time,
        };
    }
    function timestampConverter(time) {
        if (!isUTCTimestamp(time)) {
            throw new Error('time must be of type isUTCTimestamp');
        }
        return {
            timestamp: time,
        };
    }
    function selectTimeConverter(data) {
        if (data.length === 0) {
            return null;
        }
        if (isBusinessDay(data[0].time)) {
            return businessDayConverter;
        }
        return timestampConverter;
    }
    function convertTime(time) {
        if (isUTCTimestamp(time)) {
            return timestampConverter(time);
        }
        if (!isBusinessDay(time)) {
            return businessDayConverter(stringToBusinessDay(time));
        }
        return businessDayConverter(time);
    }
    var validDateRegex = /^\d\d\d\d-\d\d-\d\d$/;
    function stringToBusinessDay(value) {
        {
            // in some browsers (I look at your Chrome) the Date constructor may accept invalid date string
            // but parses them in "implementation specific" way
            // for example 2019-1-1 isn't the same as 2019-01-01 (for Chrome both are "valid" date strings)
            // see https://bugs.chromium.org/p/chromium/issues/detail?id=968939
            // so, we need to be sure that date has valid format to avoid strange behavior and hours of debugging
            // but let's do this in development build only because of perf
            if (!validDateRegex.test(value)) {
                throw new Error("Invalid date string=".concat(value, ", expected format=yyyy-mm-dd"));
            }
        }
        var d = new Date(value);
        if (isNaN(d.getTime())) {
            throw new Error("Invalid date string=".concat(value, ", expected format=yyyy-mm-dd"));
        }
        return {
            day: d.getUTCDate(),
            month: d.getUTCMonth() + 1,
            year: d.getUTCFullYear(),
        };
    }
    function convertStringToBusinessDay(value) {
        if (isString(value.time)) {
            value.time = stringToBusinessDay(value.time);
        }
    }
    function convertStringsToBusinessDays(data) {
        return data.forEach(convertStringToBusinessDay);
    }
    function createEmptyTimePointData(timePoint) {
        return { _internal_index: 0, _internal_mapping: new Map(), _internal_timePoint: timePoint };
    }
    function seriesRowsFirsAndLastTime(seriesRows) {
        if (seriesRows === undefined || seriesRows.length === 0) {
            return undefined;
        }
        return {
            _internal_firstTime: seriesRows[0].time.timestamp,
            _internal_lastTime: seriesRows[seriesRows.length - 1].time.timestamp,
        };
    }
    function seriesUpdateInfo(seriesRows, prevSeriesRows) {
        var firstAndLastTime = seriesRowsFirsAndLastTime(seriesRows);
        var prevFirstAndLastTime = seriesRowsFirsAndLastTime(prevSeriesRows);
        if (firstAndLastTime !== undefined && prevFirstAndLastTime !== undefined) {
            return {
                lastBarUpdatedOrNewBarsAddedToTheRight: firstAndLastTime._internal_lastTime >= prevFirstAndLastTime._internal_lastTime &&
                    firstAndLastTime._internal_firstTime >= prevFirstAndLastTime._internal_firstTime,
            };
        }
        return undefined;
    }
    var DataLayer = /** @class */ (function () {
        function DataLayer() {
            // note that _pointDataByTimePoint and _seriesRowsBySeries shares THE SAME objects in their values between each other
            // it's just different kind of maps to make usages/perf better
            this._private__pointDataByTimePoint = new Map();
            this._private__seriesRowsBySeries = new Map();
            this._private__seriesLastTimePoint = new Map();
            // this is kind of "dest" values (in opposite to "source" ones) - we don't need to modify it manually, the only by calling _updateTimeScalePoints or updateSeriesData methods
            this._private__sortedTimePoints = [];
        }
        DataLayer.prototype._internal_destroy = function () {
            this._private__pointDataByTimePoint.clear();
            this._private__seriesRowsBySeries.clear();
            this._private__seriesLastTimePoint.clear();
            this._private__sortedTimePoints = [];
        };
        DataLayer.prototype._internal_setSeriesData = function (series, data) {
            var _this = this;
            var needCleanupPoints = this._private__pointDataByTimePoint.size !== 0;
            var isTimeScaleAffected = false;
            // save previous series rows data before it's replaced inside this._setRowsToSeries
            var prevSeriesRows = this._private__seriesRowsBySeries.get(series);
            if (prevSeriesRows !== undefined) {
                if (this._private__seriesRowsBySeries.size === 1) {
                    needCleanupPoints = false;
                    isTimeScaleAffected = true;
                    // perf optimization - if there is only 1 series, then we can just clear and fill everything from scratch
                    this._private__pointDataByTimePoint.clear();
                }
                else {
                    // perf optimization - actually we have to use this._pointDataByTimePoint for going through here
                    // but as soon as this._sortedTimePoints is just a different form of _pointDataByTimePoint we can use it as well
                    for (var _i = 0, _a = this._private__sortedTimePoints; _i < _a.length; _i++) {
                        var point = _a[_i];
                        if (point.pointData._internal_mapping.delete(series)) {
                            isTimeScaleAffected = true;
                        }
                    }
                }
            }
            var seriesRows = [];
            if (data.length !== 0) {
                convertStringsToBusinessDays(data);
                var timeConverter_1 = ensureNotNull(selectTimeConverter(data));
                var createPlotRow_1 = getSeriesPlotRowCreator(series.seriesType());
                seriesRows = data.map(function (item) {
                    var time = timeConverter_1(item.time);
                    var timePointData = _this._private__pointDataByTimePoint.get(time.timestamp);
                    if (timePointData === undefined) {
                        // the indexes will be sync later
                        timePointData = createEmptyTimePointData(time);
                        _this._private__pointDataByTimePoint.set(time.timestamp, timePointData);
                        isTimeScaleAffected = true;
                    }
                    var row = createPlotRow_1(time, timePointData._internal_index, item);
                    timePointData._internal_mapping.set(series, row);
                    return row;
                });
            }
            if (needCleanupPoints) {
                // we deleted the old data from mapping and added the new ones
                // so there might be empty points now, let's remove them first
                this._private__cleanupPointsData();
            }
            this._private__setRowsToSeries(series, seriesRows);
            var firstChangedPointIndex = -1;
            if (isTimeScaleAffected) {
                // then generate the time scale points
                // timeWeight will be updates in _updateTimeScalePoints later
                var newTimeScalePoints_1 = [];
                this._private__pointDataByTimePoint.forEach(function (pointData) {
                    newTimeScalePoints_1.push({ timeWeight: 0, time: pointData._internal_timePoint, pointData: pointData });
                });
                newTimeScalePoints_1.sort(function (t1, t2) { return t1.time.timestamp - t2.time.timestamp; });
                firstChangedPointIndex = this._private__replaceTimeScalePoints(newTimeScalePoints_1);
            }
            return this._private__getUpdateResponse(series, firstChangedPointIndex, seriesUpdateInfo(this._private__seriesRowsBySeries.get(series), prevSeriesRows));
        };
        DataLayer.prototype._internal_removeSeries = function (series) {
            return this._internal_setSeriesData(series, []);
        };
        DataLayer.prototype._internal_updateSeriesData = function (series, data) {
            convertStringToBusinessDay(data);
            var time = ensureNotNull(selectTimeConverter([data]))(data.time);
            var lastSeriesTime = this._private__seriesLastTimePoint.get(series);
            if (lastSeriesTime !== undefined && time.timestamp < lastSeriesTime.timestamp) {
                throw new Error("Cannot update oldest data, last time=".concat(lastSeriesTime.timestamp, ", new time=").concat(time.timestamp));
            }
            var pointDataAtTime = this._private__pointDataByTimePoint.get(time.timestamp);
            // if no point data found for the new data item
            // that means that we need to update scale
            var affectsTimeScale = pointDataAtTime === undefined;
            if (pointDataAtTime === undefined) {
                // the indexes will be sync later
                pointDataAtTime = createEmptyTimePointData(time);
                this._private__pointDataByTimePoint.set(time.timestamp, pointDataAtTime);
            }
            var createPlotRow = getSeriesPlotRowCreator(series.seriesType());
            var plotRow = createPlotRow(time, pointDataAtTime._internal_index, data);
            pointDataAtTime._internal_mapping.set(series, plotRow);
            this._private__updateLastSeriesRow(series, plotRow);
            var info = { lastBarUpdatedOrNewBarsAddedToTheRight: isSeriesPlotRow(plotRow) };
            // if point already exist on the time scale - we don't need to make a full update and just make an incremental one
            if (!affectsTimeScale) {
                return this._private__getUpdateResponse(series, -1, info);
            }
            var newPoint = { timeWeight: 0, time: pointDataAtTime._internal_timePoint, pointData: pointDataAtTime };
            var insertIndex = lowerbound(this._private__sortedTimePoints, newPoint.time.timestamp, function (a, b) { return a.time.timestamp < b; });
            // yes, I know that this array is readonly and this change is intended to make it performative
            // we marked _sortedTimePoints array as readonly to avoid modifying this array anywhere else
            // but this place is exceptional case due performance reasons, sorry
            this._private__sortedTimePoints.splice(insertIndex, 0, newPoint);
            for (var index = insertIndex; index < this._private__sortedTimePoints.length; ++index) {
                assignIndexToPointData(this._private__sortedTimePoints[index].pointData, index);
            }
            fillWeightsForPoints(this._private__sortedTimePoints, insertIndex);
            return this._private__getUpdateResponse(series, insertIndex, info);
        };
        DataLayer.prototype._private__updateLastSeriesRow = function (series, plotRow) {
            var seriesData = this._private__seriesRowsBySeries.get(series);
            if (seriesData === undefined) {
                seriesData = [];
                this._private__seriesRowsBySeries.set(series, seriesData);
            }
            var lastSeriesRow = seriesData.length !== 0 ? seriesData[seriesData.length - 1] : null;
            if (lastSeriesRow === null || plotRow.time.timestamp > lastSeriesRow.time.timestamp) {
                if (isSeriesPlotRow(plotRow)) {
                    seriesData.push(plotRow);
                }
            }
            else {
                if (isSeriesPlotRow(plotRow)) {
                    seriesData[seriesData.length - 1] = plotRow;
                }
                else {
                    seriesData.splice(-1, 1);
                }
            }
            this._private__seriesLastTimePoint.set(series, plotRow.time);
        };
        DataLayer.prototype._private__setRowsToSeries = function (series, seriesRows) {
            if (seriesRows.length !== 0) {
                this._private__seriesRowsBySeries.set(series, seriesRows.filter(isSeriesPlotRow));
                this._private__seriesLastTimePoint.set(series, seriesRows[seriesRows.length - 1].time);
            }
            else {
                this._private__seriesRowsBySeries.delete(series);
                this._private__seriesLastTimePoint.delete(series);
            }
        };
        DataLayer.prototype._private__cleanupPointsData = function () {
            // let's treat all current points as "potentially removed"
            // we could create an array with actually potentially removed points
            // but most likely this array will be similar to _sortedTimePoints so let's avoid using additional memory
            // note that we can use _sortedTimePoints here since a point might be removed only it was here previously
            for (var _i = 0, _a = this._private__sortedTimePoints; _i < _a.length; _i++) {
                var point = _a[_i];
                if (point.pointData._internal_mapping.size === 0) {
                    this._private__pointDataByTimePoint.delete(point.time.timestamp);
                }
            }
        };
        /**
         * Sets new time scale and make indexes valid for all series
         *
         * @returns The index of the first changed point or `-1` if there is no change.
         */
        DataLayer.prototype._private__replaceTimeScalePoints = function (newTimePoints) {
            var firstChangedPointIndex = -1;
            // search the first different point and "syncing" time weight by the way
            for (var index = 0; index < this._private__sortedTimePoints.length && index < newTimePoints.length; ++index) {
                var oldPoint = this._private__sortedTimePoints[index];
                var newPoint = newTimePoints[index];
                if (oldPoint.time.timestamp !== newPoint.time.timestamp) {
                    firstChangedPointIndex = index;
                    break;
                }
                // re-assign point's time weight for points if time is the same (and all prior times was the same)
                newPoint.timeWeight = oldPoint.timeWeight;
                assignIndexToPointData(newPoint.pointData, index);
            }
            if (firstChangedPointIndex === -1 && this._private__sortedTimePoints.length !== newTimePoints.length) {
                // the common part of the prev and the new points are the same
                // so the first changed point is the next after the common part
                firstChangedPointIndex = Math.min(this._private__sortedTimePoints.length, newTimePoints.length);
            }
            if (firstChangedPointIndex === -1) {
                // if no time scale changed, then do nothing
                return -1;
            }
            // if time scale points are changed that means that we need to make full update to all series (with clearing points)
            // but first we need to synchronize indexes and re-fill time weights
            for (var index = firstChangedPointIndex; index < newTimePoints.length; ++index) {
                assignIndexToPointData(newTimePoints[index].pointData, index);
            }
            // re-fill time weights for point after the first changed one
            fillWeightsForPoints(newTimePoints, firstChangedPointIndex);
            this._private__sortedTimePoints = newTimePoints;
            return firstChangedPointIndex;
        };
        DataLayer.prototype._private__getBaseIndex = function () {
            if (this._private__seriesRowsBySeries.size === 0) {
                // if we have no data then 'reset' the base index to null
                return null;
            }
            var baseIndex = 0;
            this._private__seriesRowsBySeries.forEach(function (data) {
                if (data.length !== 0) {
                    baseIndex = Math.max(baseIndex, data[data.length - 1].index);
                }
            });
            return baseIndex;
        };
        DataLayer.prototype._private__getUpdateResponse = function (updatedSeries, firstChangedPointIndex, info) {
            var dataUpdateResponse = {
                _internal_series: new Map(),
                _internal_timeScale: {
                    _internal_baseIndex: this._private__getBaseIndex(),
                },
            };
            if (firstChangedPointIndex !== -1) {
                // TODO: it's possible to make perf improvements by checking what series has data after firstChangedPointIndex
                // but let's skip for now
                this._private__seriesRowsBySeries.forEach(function (data, s) {
                    dataUpdateResponse._internal_series.set(s, {
                        _internal_data: data,
                        _internal_info: s === updatedSeries ? info : undefined,
                    });
                });
                // if the series data was set to [] it will have already been removed from _seriesRowBySeries
                // meaning the forEach above won't add the series to the data update response
                // so we handle that case here
                if (!this._private__seriesRowsBySeries.has(updatedSeries)) {
                    dataUpdateResponse._internal_series.set(updatedSeries, { _internal_data: [], _internal_info: info });
                }
                dataUpdateResponse._internal_timeScale._internal_points = this._private__sortedTimePoints;
                dataUpdateResponse._internal_timeScale._internal_firstChangedPointIndex = firstChangedPointIndex;
            }
            else {
                var seriesData = this._private__seriesRowsBySeries.get(updatedSeries);
                // if no seriesData found that means that we just removed the series
                dataUpdateResponse._internal_series.set(updatedSeries, { _internal_data: seriesData || [], _internal_info: info });
            }
            return dataUpdateResponse;
        };
        return DataLayer;
    }());
    function assignIndexToPointData(pointData, index) {
        // first, nevertheless update index of point data ("make it valid")
        pointData._internal_index = index;
        // and then we need to sync indexes for all series
        pointData._internal_mapping.forEach(function (seriesRow) {
            seriesRow.index = index;
        });
    }

    function checkPriceLineOptions(options) {
        // eslint-disable-next-line @typescript-eslint/tslint/config
        assert(typeof options.price === 'number', "the type of 'price' price line's property must be a number, got '".concat(typeof options.price, "'"));
    }
    function checkItemsAreOrdered(data, allowDuplicates) {
        if (allowDuplicates === void 0) { allowDuplicates = false; }
        if (data.length === 0) {
            return;
        }
        var prevTime = convertTime(data[0].time).timestamp;
        for (var i = 1; i < data.length; ++i) {
            var currentTime = convertTime(data[i].time).timestamp;
            var checkResult = allowDuplicates ? prevTime <= currentTime : prevTime < currentTime;
            assert(checkResult, "data must be asc ordered by time, index=".concat(i, ", time=").concat(currentTime, ", prev time=").concat(prevTime));
            prevTime = currentTime;
        }
    }
    function checkSeriesValuesType(type, data) {
        data.forEach(getChecker(type));
    }
    function getChecker(type) {
        switch (type) {
            case 'Bar':
            case 'Candlestick':
                return checkBarItem.bind(null, type);
            case 'Area':
            case 'Baseline':
            case 'Line':
            case 'Histogram':
                return checkLineItem.bind(null, type);
            case 'CloudArea':
            case 'BrokenArea':
                return checkCloudAreaItem.bind(null, type);
        }
    }
    function checkBarItem(type, barItem) {
        if (!isFulfilledData(barItem)) {
            return;
        }
        // assert(
        // 	/// eslint-disable-next-line @typescript-eslint/tslint/config
        // 	typeof barItem.open === 'number', `${type} series item data value of open must be a number, got=${typeof barItem.open}, value=${barItem.open}`
        // );
        // assert(
        // 	/// eslint-disable-next-line @typescript-eslint/tslint/config
        // 	typeof barItem.high === 'number', `${type} series item data value of high must be a number, got=${typeof barItem.high}, value=${barItem.high}`
        // );
        // assert(
        // 	/// eslint-disable-next-line @typescript-eslint/tslint/config
        // 	typeof barItem.low === 'number', `${type} series item data value of low must be a number, got=${typeof barItem.low}, value=${barItem.low}`
        // );
        // assert(
        // 	/// eslint-disable-next-line @typescript-eslint/tslint/config
        // 	typeof barItem.close === 'number', `${type} series item data value of close must be a number, got=${typeof barItem.close}, value=${barItem.close}`
        // );
    }
    function checkLineItem(type, lineItem) {
        if (!isFulfilledData(lineItem)) {
            return;
        }
        // assert(
        // 	// eslint-disable-next-line @typescript-eslint/tslint/config
        // 	typeof lineItem.value === 'number',
        // 	`${type} series item data value must be a number, got=${typeof lineItem.value}, value=${lineItem.value}`);
    }
    function checkCloudAreaItem(type, lineItem) {
        if (!isFulfilledData(lineItem)) {
            return;
        }
        // assert(
        // 	// eslint-disable-next-line @typescript-eslint/tslint/config
        // 	typeof lineItem.higherValue === 'number',
        // 	`${type} series item data higher value must be a number, got=${typeof lineItem.higherValue}, value=${lineItem.higherValue}`);
        // assert(
        // 	// eslint-disable-next-line @typescript-eslint/tslint/config
        // 	typeof lineItem.lowerValue === 'number',
        // 	`${type} series item data lower value must be a number, got=${typeof lineItem.lowerValue}, value=${lineItem.lowerValue}`);
    }

    var priceLineOptionsDefaults = {
        color: '#FF0000',
        price: 0,
        visible: true,
        lineStyle: 2 /* Dashed */,
        lineWidth: 1,
        lineVisible: true,
        axisLabelVisible: true,
        title: '',
    };

    var PriceLine = /** @class */ (function () {
        function PriceLine(priceLine) {
            this._private__priceLine = priceLine;
        }
        PriceLine.prototype.applyOptions = function (options) {
            this._private__priceLine.applyOptions(options);
        };
        PriceLine.prototype.options = function () {
            return this._private__priceLine.options();
        };
        PriceLine.prototype._internal_priceLine = function () {
            return this._private__priceLine;
        };
        return PriceLine;
    }());

    function migrateOptions(options) {
        // eslint-disable-next-line deprecation/deprecation
        var overlay = options.overlay, res = __rest(options, ["overlay"]);
        if (overlay) {
            res.priceScaleId = '';
        }
        return res;
    }
    var SeriesApi = /** @class */ (function () {
        function SeriesApi(series, dataUpdatesConsumer, priceScaleApiProvider) {
            this._series = series;
            this._dataUpdatesConsumer = dataUpdatesConsumer;
            this._private__priceScaleApiProvider = priceScaleApiProvider;
        }
        SeriesApi.prototype.priceFormatter = function () {
            return this._series.formatter();
        };
        SeriesApi.prototype.priceToCoordinate = function (price) {
            var firstValue = this._series.firstValue();
            if (firstValue === null) {
                return null;
            }
            return this._series.priceScale().priceToCoordinate(price, firstValue.value);
        };
        SeriesApi.prototype.coordinateToPrice = function (coordinate) {
            var firstValue = this._series.firstValue();
            if (firstValue === null) {
                return null;
            }
            return this._series.priceScale().coordinateToPrice(coordinate, firstValue.value);
        };
        // eslint-disable-next-line complexity
        SeriesApi.prototype.barsInLogicalRange = function (range) {
            if (range === null) {
                return null;
            }
            // we use TimeScaleVisibleRange here to convert LogicalRange to strict range properly
            var correctedRange = new TimeScaleVisibleRange(new RangeImpl(range.from, range.to))._internal_strictRange();
            var bars = this._series.bars();
            if (bars.isEmpty()) {
                return null;
            }
            var dataFirstBarInRange = bars.search(correctedRange.left(), 1 /* NearestRight */);
            var dataLastBarInRange = bars.search(correctedRange.right(), -1 /* NearestLeft */);
            var dataFirstIndex = ensureNotNull(bars.firstIndex());
            var dataLastIndex = ensureNotNull(bars.lastIndex());
            // this means that we request data in the data gap
            // e.g. let's say we have series with data [0..10, 30..60]
            // and we request bars info in range [15, 25]
            // thus, dataFirstBarInRange will be with index 30 and dataLastBarInRange with 10
            if (dataFirstBarInRange !== null && dataLastBarInRange !== null && dataFirstBarInRange.index > dataLastBarInRange.index) {
                return {
                    barsBefore: range.from - dataFirstIndex,
                    barsAfter: dataLastIndex - range.to,
                };
            }
            var barsBefore = (dataFirstBarInRange === null || dataFirstBarInRange.index === dataFirstIndex)
                ? range.from - dataFirstIndex
                : dataFirstBarInRange.index - dataFirstIndex;
            var barsAfter = (dataLastBarInRange === null || dataLastBarInRange.index === dataLastIndex)
                ? dataLastIndex - range.to
                : dataLastIndex - dataLastBarInRange.index;
            var result = { barsBefore: barsBefore, barsAfter: barsAfter };
            // actually they can't exist separately
            if (dataFirstBarInRange !== null && dataLastBarInRange !== null) {
                result.from = dataFirstBarInRange.time.businessDay || dataFirstBarInRange.time.timestamp;
                result.to = dataLastBarInRange.time.businessDay || dataLastBarInRange.time.timestamp;
            }
            return result;
        };
        SeriesApi.prototype.setData = function (data) {
            checkItemsAreOrdered(data);
            checkSeriesValuesType(this._series.seriesType(), data);
            this._dataUpdatesConsumer.applyNewData(this._series, data);
        };
        SeriesApi.prototype.update = function (bar) {
            checkSeriesValuesType(this._series.seriesType(), [bar]);
            this._dataUpdatesConsumer.updateData(this._series, bar);
        };
        SeriesApi.prototype.setMarkers = function (data) {
            checkItemsAreOrdered(data, true);
            var convertedMarkers = data.map(function (marker) { return (__assign(__assign({}, marker), { time: convertTime(marker.time) })); });
            this._series.setMarkers(convertedMarkers);
        };
        SeriesApi.prototype.applyOptions = function (options) {
            var migratedOptions = migrateOptions(options);
            this._series.applyOptions(migratedOptions);
        };
        SeriesApi.prototype.options = function () {
            return clone(this._series.options());
        };
        SeriesApi.prototype.priceScale = function () {
            return this._private__priceScaleApiProvider.priceScale(this._series.priceScale().id());
        };
        SeriesApi.prototype.createPriceLine = function (options) {
            checkPriceLineOptions(options);
            var strictOptions = merge(clone(priceLineOptionsDefaults), options);
            var priceLine = this._series.createPriceLine(strictOptions);
            return new PriceLine(priceLine);
        };
        SeriesApi.prototype.removePriceLine = function (line) {
            this._series.removePriceLine(line._internal_priceLine());
        };
        SeriesApi.prototype.removeAllPriceLines = function () {
            this._series.removeAllPriceLines();
        };
        SeriesApi.prototype.getPriceLine = function (price, index) {
            var priceLine = this._series.getPriceLine(price, index);
            if (priceLine) {
                return new PriceLine(priceLine);
            }
        };
        SeriesApi.prototype.seriesType = function () {
            return this._series.seriesType();
        };
        SeriesApi.prototype.setExtensionsBoundaries = function (extensionsBoundaries) {
            return this._series.setExtensionsBoundaries(extensionsBoundaries);
        };
        return SeriesApi;
    }());

    var CandlestickSeriesApi = /** @class */ (function (_super) {
        __extends(CandlestickSeriesApi, _super);
        function CandlestickSeriesApi() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        CandlestickSeriesApi.prototype.applyOptions = function (options) {
            fillUpDownCandlesticksColors(options);
            _super.prototype.applyOptions.call(this, options);
        };
        return CandlestickSeriesApi;
    }(SeriesApi));

    var LineToolApi = /** @class */ (function () {
        function LineToolApi(lineTool) {
            this._internal__lineTool = lineTool;
        }
        LineToolApi.prototype.setPoints = function (points) {
            throw new Error('Method not implemented.');
        };
        LineToolApi.prototype.applyOptions = function (options) {
            this._internal__lineTool.applyOptions(options);
        };
        LineToolApi.prototype.options = function () {
            return clone(this._internal__lineTool.options());
        };
        LineToolApi.prototype.toolType = function () {
            return this._internal__lineTool.toolType();
        };
        return LineToolApi;
    }());

    var crosshairOptionsDefaults = {
        vertLine: {
            color: '#758696',
            width: 1,
            style: 3 /* LargeDashed */,
            visible: true,
            labelVisible: true,
            labelBackgroundColor: '#4c525e',
        },
        horzLine: {
            color: '#758696',
            width: 1,
            style: 3 /* LargeDashed */,
            visible: true,
            labelVisible: true,
            labelBackgroundColor: '#4c525e',
        },
        magnetThreshold: 14,
    };

    var gridOptionsDefaults = {
        vertLines: {
            color: '#D6DCDE',
            style: 0 /* Solid */,
            visible: true,
        },
        horzLines: {
            color: '#D6DCDE',
            style: 0 /* Solid */,
            visible: true,
        },
    };

    var layoutOptionsDefaults = {
        background: {
            type: "solid" /* Solid */,
            color: '#FFFFFF',
        },
        textColor: '#191919',
        fontSize: 11,
        fontFamily: defaultFontFamily,
    };

    var priceScaleOptionsDefaults = {
        autoScale: true,
        mode: 0 /* Normal */,
        invertScale: false,
        alignLabels: true,
        borderVisible: true,
        borderColor: '#2B2B43',
        entireTextOnly: false,
        visible: false,
        floating: false,
        drawTicks: false,
        scaleMargins: {
            bottom: 0.1,
            top: 0.2,
        },
    };

    var timeScaleOptionsDefaults = {
        rightOffset: 0,
        barSpacing: 6,
        minBarSpacing: 0.5,
        fixLeftEdge: false,
        fixRightEdge: false,
        lockVisibleTimeRangeOnResize: false,
        rightBarStaysOnScroll: false,
        borderVisible: true,
        borderColor: '#2B2B43',
        mode: 0 /* Normal */,
        visible: true,
        timeVisible: false,
        secondsVisible: true,
        shiftVisibleRangeOnNewBar: true,
    };

    var watermarkOptionsDefaults = {
        color: 'rgba(0, 0, 0, 0)',
        visible: false,
        fontSize: 48,
        fontFamily: defaultFontFamily,
        fontStyle: '',
        text: '',
        horzAlign: 'center',
        vertAlign: 'center',
    };

    var chartOptionsDefaults = {
        width: 0,
        height: 0,
        layout: layoutOptionsDefaults,
        crosshair: crosshairOptionsDefaults,
        grid: gridOptionsDefaults,
        overlayPriceScales: __assign({}, priceScaleOptionsDefaults),
        leftPriceScale: __assign(__assign({}, priceScaleOptionsDefaults), { visible: false }),
        rightPriceScale: __assign(__assign({}, priceScaleOptionsDefaults), { visible: true }),
        nonPrimaryPriceScale: __assign(__assign({}, priceScaleOptionsDefaults), { visible: true }),
        timeScale: timeScaleOptionsDefaults,
        watermark: watermarkOptionsDefaults,
        localization: {
            locale: isRunningOnClientSide ? navigator.language : '',
            dateFormat: 'dd MMM \'yy',
        },
        handleScroll: {
            mouseWheel: true,
            pressedMouseMove: true,
            horzTouchDrag: true,
            vertTouchDrag: true,
        },
        handleScale: {
            axisPressedMouseMove: {
                time: true,
                price: true,
            },
            axisDoubleClickReset: true,
            mouseWheel: true,
            pinch: true,
        },
        kineticScroll: {
            mouse: false,
            touch: true,
        },
        trackingMode: {
            exitMode: 1 /* OnNextTap */,
        },
    };

    var candlestickStyleDefaults = {
        upColor: '#26a69a',
        downColor: '#ef5350',
        wickVisible: true,
        borderVisible: true,
        borderColor: '#378658',
        borderUpColor: '#26a69a',
        borderDownColor: '#ef5350',
        wickColor: '#737375',
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
    };
    var barStyleDefaults = {
        upColor: '#26a69a',
        downColor: '#ef5350',
        openVisible: true,
        thinBars: true,
    };
    var lineStyleDefaults = {
        color: '#2196f3',
        lineStyle: 0 /* Solid */,
        lineWidth: 3,
        lineType: 0 /* Simple */,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBorderColor: '',
        crosshairMarkerBackgroundColor: '',
        lastPriceAnimation: 0 /* Disabled */,
    };
    var areaStyleDefaults = {
        topColor: 'rgba( 46, 220, 135, 0.4)',
        bottomColor: 'rgba( 40, 221, 100, 0)',
        lineColor: '#33D778',
        lineStyle: 0 /* Solid */,
        lineWidth: 3,
        lineType: 0 /* Simple */,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBorderColor: '',
        crosshairMarkerBackgroundColor: '',
        lastPriceAnimation: 0 /* Disabled */,
    };
    var cloudAreaStyleDefaults = {
        positiveColor: 'rgba( 76, 175, 80, 0.1)',
        negativeColor: 'rgba( 255, 82, 82, 0.1)',
        higherLineColor: '#4CAF50',
        higherLineStyle: 0,
        higherLineWidth: 3,
        higherLineType: 0,
        lowerLineColor: '#FF5252',
        lowerLineStyle: 0,
        lowerLineWidth: 3,
        lowerLineType: 0,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBorderColor: '',
        crosshairMarkerBackgroundColor: '',
    };
    var baselineStyleDefaults = {
        baseValue: {
            type: 'price',
            price: 0,
        },
        topFillColor1: 'rgba(38, 166, 154, 0.28)',
        topFillColor2: 'rgba(38, 166, 154, 0.05)',
        topLineColor: 'rgba(38, 166, 154, 1)',
        bottomFillColor1: 'rgba(239, 83, 80, 0.05)',
        bottomFillColor2: 'rgba(239, 83, 80, 0.28)',
        bottomLineColor: 'rgba(239, 83, 80, 1)',
        lineWidth: 3,
        lineStyle: 0 /* Solid */,
        lineType: 0 /* Simple */,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBorderColor: '',
        crosshairMarkerBackgroundColor: '',
        lastPriceAnimation: 0 /* Disabled */,
    };
    var histogramStyleDefaults = {
        color: '#26a69a',
        base: 0,
    };
    var seriesOptionsDefaults = {
        title: '',
        visible: true,
        lastValueVisible: true,
        priceLineVisible: true,
        priceLineSource: 0 /* LastBar */,
        priceLineWidth: 1,
        priceLineColor: '',
        priceLineStyle: 1 /* Dotted */,
        baseLineVisible: true,
        baseLineWidth: 1,
        baseLineColor: '#B2B5BE',
        baseLineStyle: 0 /* Solid */,
        priceFormat: {
            type: 'price',
            precision: 2,
            minMove: 0.01,
        },
    };

    var PriceScaleApi = /** @class */ (function () {
        function PriceScaleApi(chartWidget, priceScaleId) {
            this._private__chartWidget = chartWidget;
            this._private__priceScaleId = priceScaleId;
        }
        PriceScaleApi.prototype.applyOptions = function (options) {
            this._private__chartWidget.model().applyPriceScaleOptions(this._private__priceScaleId, options);
        };
        PriceScaleApi.prototype.options = function () {
            return this._priceScale().options();
        };
        PriceScaleApi.prototype.width = function () {
            if (!isDefaultPriceScale(this._private__priceScaleId)) {
                return 0;
            }
            return this._private__chartWidget.getPriceAxisWidth(this._private__priceScaleId === "left" /* Left */ ? 'left' : 'right');
        };
        PriceScaleApi.prototype._priceScale = function () {
            return ensureNotNull(this._private__chartWidget.model().findPriceScale(this._private__priceScaleId)).priceScale;
        };
        return PriceScaleApi;
    }());

    var TimeScaleApi = /** @class */ (function () {
        function TimeScaleApi(model, timeAxisWidget) {
            this._private__timeRangeChanged = new Delegate();
            this._private__logicalRangeChanged = new Delegate();
            this._private__sizeChanged = new Delegate();
            this._private__model = model;
            this._private__timeScale = model.timeScale();
            this._private__timeAxisWidget = timeAxisWidget;
            this._private__timeScale.visibleBarsChanged().subscribe(this._private__onVisibleBarsChanged.bind(this));
            this._private__timeScale.logicalRangeChanged().subscribe(this._private__onVisibleLogicalRangeChanged.bind(this));
            this._private__timeAxisWidget.sizeChanged().subscribe(this._private__onSizeChanged.bind(this));
        }
        TimeScaleApi.prototype.destroy = function () {
            this._private__timeScale.visibleBarsChanged().unsubscribeAll(this);
            this._private__timeScale.logicalRangeChanged().unsubscribeAll(this);
            this._private__timeAxisWidget.sizeChanged().unsubscribeAll(this);
            this._private__timeRangeChanged.destroy();
            this._private__logicalRangeChanged.destroy();
            this._private__sizeChanged.destroy();
        };
        TimeScaleApi.prototype.scrollPosition = function () {
            return this._private__timeScale.rightOffset();
        };
        TimeScaleApi.prototype.scrollToPosition = function (position, animated) {
            if (!animated) {
                this._private__model.setRightOffset(position);
                return;
            }
            this._private__timeScale.scrollToOffsetAnimated(position, 1000 /* AnimationDurationMs */);
        };
        TimeScaleApi.prototype.scrollToRealTime = function () {
            this._private__timeScale.scrollToRealTime();
        };
        TimeScaleApi.prototype.getVisibleRange = function () {
            var _a, _b;
            var timeRange = this._private__timeScale.visibleTimeRange();
            if (timeRange === null) {
                return null;
            }
            return {
                from: (_a = timeRange.from.businessDay) !== null && _a !== void 0 ? _a : timeRange.from.timestamp,
                to: (_b = timeRange.to.businessDay) !== null && _b !== void 0 ? _b : timeRange.to.timestamp,
            };
        };
        TimeScaleApi.prototype.setVisibleRange = function (range) {
            var convertedRange = {
                from: convertTime(range.from),
                to: convertTime(range.to),
            };
            var logicalRange = this._private__timeScale.logicalRangeForTimeRange(convertedRange);
            this._private__model.setTargetLogicalRange(logicalRange);
        };
        TimeScaleApi.prototype.getVisibleLogicalRange = function () {
            var logicalRange = this._private__timeScale.visibleLogicalRange();
            if (logicalRange === null) {
                return null;
            }
            return {
                from: logicalRange.left(),
                to: logicalRange.right(),
            };
        };
        TimeScaleApi.prototype.setVisibleLogicalRange = function (range) {
            assert(range.from <= range.to, 'The from index cannot be after the to index.');
            this._private__model.setTargetLogicalRange(range);
        };
        TimeScaleApi.prototype.resetTimeScale = function () {
            this._private__model.resetTimeScale();
        };
        TimeScaleApi.prototype.fitContent = function () {
            this._private__model.fitContent();
        };
        TimeScaleApi.prototype.logicalToCoordinate = function (logical) {
            var timeScale = this._private__model.timeScale();
            if (timeScale.isEmpty()) {
                return null;
            }
            else {
                return timeScale.indexToCoordinate(logical);
            }
        };
        TimeScaleApi.prototype.coordinateToLogical = function (x) {
            if (this._private__timeScale.isEmpty()) {
                return null;
            }
            else {
                return this._private__timeScale.coordinateToIndex(x);
            }
        };
        TimeScaleApi.prototype.timeToCoordinate = function (time) {
            var timePoint = convertTime(time);
            var timePointIndex = this._private__timeScale.timeToIndex(timePoint, false);
            if (timePointIndex === null) {
                return null;
            }
            return this._private__timeScale.indexToCoordinate(timePointIndex);
        };
        TimeScaleApi.prototype.coordinateToTime = function (x) {
            var _a;
            var timeScale = this._private__model.timeScale();
            var timePointIndex = timeScale.coordinateToIndex(x);
            var timePoint = timeScale.indexToTime(timePointIndex);
            if (timePoint === null) {
                return null;
            }
            return (_a = timePoint.businessDay) !== null && _a !== void 0 ? _a : timePoint.timestamp;
        };
        TimeScaleApi.prototype.width = function () {
            return this._private__timeAxisWidget.getSize().w;
        };
        TimeScaleApi.prototype.height = function () {
            return this._private__timeAxisWidget.getSize().h;
        };
        TimeScaleApi.prototype.subscribeVisibleTimeRangeChange = function (handler) {
            this._private__timeRangeChanged.subscribe(handler);
        };
        TimeScaleApi.prototype.unsubscribeVisibleTimeRangeChange = function (handler) {
            this._private__timeRangeChanged.unsubscribe(handler);
        };
        TimeScaleApi.prototype.subscribeVisibleLogicalRangeChange = function (handler) {
            this._private__logicalRangeChanged.subscribe(handler);
        };
        TimeScaleApi.prototype.unsubscribeVisibleLogicalRangeChange = function (handler) {
            this._private__logicalRangeChanged.unsubscribe(handler);
        };
        TimeScaleApi.prototype.subscribeSizeChange = function (handler) {
            this._private__sizeChanged.subscribe(handler);
        };
        TimeScaleApi.prototype.unsubscribeSizeChange = function (handler) {
            this._private__sizeChanged.unsubscribe(handler);
        };
        TimeScaleApi.prototype.applyOptions = function (options) {
            this._private__timeScale.applyOptions(options);
        };
        TimeScaleApi.prototype.options = function () {
            return clone(this._private__timeScale.options());
        };
        TimeScaleApi.prototype._private__onVisibleBarsChanged = function () {
            if (this._private__timeRangeChanged.hasListeners()) {
                this._private__timeRangeChanged.fire(this.getVisibleRange());
            }
        };
        TimeScaleApi.prototype._private__onVisibleLogicalRangeChanged = function () {
            if (this._private__logicalRangeChanged.hasListeners()) {
                this._private__logicalRangeChanged.fire(this.getVisibleLogicalRange());
            }
        };
        TimeScaleApi.prototype._private__onSizeChanged = function (size) {
            this._private__sizeChanged.fire(size.w, size.h);
        };
        return TimeScaleApi;
    }());

    function patchPriceFormat(priceFormat) {
        if (priceFormat === undefined || priceFormat.type === 'custom') {
            return;
        }
        var priceFormatBuiltIn = priceFormat;
        if (priceFormatBuiltIn.minMove !== undefined && priceFormatBuiltIn.precision === undefined) {
            priceFormatBuiltIn.precision = precisionByMinMove(priceFormatBuiltIn.minMove);
        }
    }
    function migrateHandleScaleScrollOptions(options) {
        if (isBoolean(options.handleScale)) {
            var handleScale = options.handleScale;
            options.handleScale = {
                axisDoubleClickReset: handleScale,
                axisPressedMouseMove: {
                    time: handleScale,
                    price: handleScale,
                },
                mouseWheel: handleScale,
                pinch: handleScale,
            };
        }
        else if (options.handleScale !== undefined && isBoolean(options.handleScale.axisPressedMouseMove)) {
            var axisPressedMouseMove = options.handleScale.axisPressedMouseMove;
            options.handleScale.axisPressedMouseMove = {
                time: axisPressedMouseMove,
                price: axisPressedMouseMove,
            };
        }
        var handleScroll = options.handleScroll;
        if (isBoolean(handleScroll)) {
            options.handleScroll = {
                horzTouchDrag: handleScroll,
                vertTouchDrag: handleScroll,
                mouseWheel: handleScroll,
                pressedMouseMove: handleScroll,
            };
        }
    }
    function migratePriceScaleOptions(options) {
        /* eslint-disable deprecation/deprecation */
        if (options.priceScale) {
            warn('"priceScale" option has been deprecated, use "leftPriceScale", "rightPriceScale" and "overlayPriceScales" instead');
            options.leftPriceScale = options.leftPriceScale || {};
            options.rightPriceScale = options.rightPriceScale || {};
            var position = options.priceScale.position;
            delete options.priceScale.position;
            options.leftPriceScale = merge(options.leftPriceScale, options.priceScale);
            options.rightPriceScale = merge(options.rightPriceScale, options.priceScale);
            if (position === 'left') {
                options.leftPriceScale.visible = true;
                options.rightPriceScale.visible = false;
            }
            if (position === 'right') {
                options.leftPriceScale.visible = false;
                options.rightPriceScale.visible = true;
            }
            if (position === 'none') {
                options.leftPriceScale.visible = false;
                options.rightPriceScale.visible = false;
            }
            // copy defaults for overlays
            options.overlayPriceScales = options.overlayPriceScales || {};
            if (options.priceScale.invertScale !== undefined) {
                options.overlayPriceScales.invertScale = options.priceScale.invertScale;
            }
            // do not migrate mode for backward compatibility
            if (options.priceScale.scaleMargins !== undefined) {
                options.overlayPriceScales.scaleMargins = options.priceScale.scaleMargins;
            }
        }
        /* eslint-enable deprecation/deprecation */
    }
    function migrateLayoutOptions(options) {
        /* eslint-disable deprecation/deprecation */
        if (!options.layout) {
            return;
        }
        if (options.layout.backgroundColor && !options.layout.background) {
            options.layout.background = { type: "solid" /* Solid */, color: options.layout.backgroundColor };
        }
        /* eslint-enable deprecation/deprecation */
    }
    function toInternalOptions(options) {
        migrateHandleScaleScrollOptions(options);
        migratePriceScaleOptions(options);
        migrateLayoutOptions(options);
        return options;
    }
    var ChartApi = /** @class */ (function () {
        function ChartApi(container, options) {
            var _this = this;
            this._private__dataLayer = new DataLayer();
            this._private__seriesMap = new Map();
            this._private__seriesMapReversed = new Map();
            this._private__clickedDelegate = new Delegate();
            this._private__crosshairMovedDelegate = new Delegate();
            var internalOptions = (options === undefined) ?
                clone(chartOptionsDefaults) :
                merge(clone(chartOptionsDefaults), toInternalOptions(options));
            this._chartWidget = new ChartWidget(container, internalOptions);
            this._chartWidget.clicked().subscribe(function (paramSupplier) {
                if (_this._private__clickedDelegate.hasListeners()) {
                    _this._private__clickedDelegate.fire(_this._private__convertMouseParams(paramSupplier()));
                }
            }, this);
            this._chartWidget.crosshairMoved().subscribe(function (paramSupplier) {
                if (_this._private__crosshairMovedDelegate.hasListeners()) {
                    _this._private__crosshairMovedDelegate.fire(_this._private__convertMouseParams(paramSupplier()));
                }
            }, this);
            var model = this._chartWidget.model();
            this._private__timeScaleApi = new TimeScaleApi(model, this._chartWidget.timeAxisWidget());
        }
        ChartApi.prototype.get = function () {
            return this;
        };
        ChartApi.prototype.remove = function () {
            this._chartWidget.clicked().unsubscribeAll(this);
            this._chartWidget.crosshairMoved().unsubscribeAll(this);
            this._private__timeScaleApi.destroy();
            this._chartWidget.destroy();
            this._private__seriesMap.clear();
            this._private__seriesMapReversed.clear();
            this._private__clickedDelegate.destroy();
            this._private__crosshairMovedDelegate.destroy();
            this._private__dataLayer._internal_destroy();
        };
        ChartApi.prototype.resize = function (width, height, forceRepaint) {
            this._chartWidget.resize(width, height, forceRepaint);
        };
        ChartApi.prototype.addAreaSeries = function (options) {
            if (options === void 0) { options = {}; }
            options = migrateOptions(options);
            patchPriceFormat(options.priceFormat);
            var strictOptions = merge(clone(seriesOptionsDefaults), areaStyleDefaults, options);
            var series = this._chartWidget.model().createSeries('Area', strictOptions);
            var res = new SeriesApi(series, this, this);
            this._private__seriesMap.set(res, series);
            this._private__seriesMapReversed.set(series, res);
            return res;
        };
        ChartApi.prototype.addBaselineSeries = function (options) {
            if (options === void 0) { options = {}; }
            options = migrateOptions(options);
            patchPriceFormat(options.priceFormat);
            // to avoid assigning fields to defaults we have to clone them
            var strictOptions = merge(clone(seriesOptionsDefaults), clone(baselineStyleDefaults), options);
            var series = this._chartWidget.model().createSeries('Baseline', strictOptions);
            var res = new SeriesApi(series, this, this);
            this._private__seriesMap.set(res, series);
            this._private__seriesMapReversed.set(series, res);
            return res;
        };
        ChartApi.prototype.addCloudAreaSeries = function (options) {
            if (options === void 0) { options = {}; }
            options = migrateOptions(options);
            patchPriceFormat(options.priceFormat);
            var strictOptions = merge(clone(seriesOptionsDefaults), cloudAreaStyleDefaults, options);
            var series = this._chartWidget.model().createSeries('CloudArea', strictOptions);
            var res = new SeriesApi(series, this, this);
            this._private__seriesMap.set(res, series);
            this._private__seriesMapReversed.set(series, res);
            return res;
        };
        ChartApi.prototype.addBrokenAreaSeries = function (options) {
            if (options === void 0) { options = {}; }
            options = migrateOptions(options);
            var strictOptions = merge(clone(seriesOptionsDefaults), options);
            var series = this._chartWidget.model().createSeries('BrokenArea', strictOptions);
            var res = new SeriesApi(series, this, this);
            this._private__seriesMap.set(res, series);
            this._private__seriesMapReversed.set(series, res);
            return res;
        };
        ChartApi.prototype.addBarSeries = function (options) {
            if (options === void 0) { options = {}; }
            options = migrateOptions(options);
            patchPriceFormat(options.priceFormat);
            var strictOptions = merge(clone(seriesOptionsDefaults), barStyleDefaults, options);
            var series = this._chartWidget.model().createSeries('Bar', strictOptions);
            var res = new SeriesApi(series, this, this);
            this._private__seriesMap.set(res, series);
            this._private__seriesMapReversed.set(series, res);
            return res;
        };
        ChartApi.prototype.addCandlestickSeries = function (options) {
            if (options === void 0) { options = {}; }
            options = migrateOptions(options);
            fillUpDownCandlesticksColors(options);
            patchPriceFormat(options.priceFormat);
            var strictOptions = merge(clone(seriesOptionsDefaults), candlestickStyleDefaults, options);
            var series = this._chartWidget.model().createSeries('Candlestick', strictOptions);
            var res = new CandlestickSeriesApi(series, this, this);
            this._private__seriesMap.set(res, series);
            this._private__seriesMapReversed.set(series, res);
            return res;
        };
        ChartApi.prototype.addHistogramSeries = function (options) {
            if (options === void 0) { options = {}; }
            options = migrateOptions(options);
            patchPriceFormat(options.priceFormat);
            var strictOptions = merge(clone(seriesOptionsDefaults), histogramStyleDefaults, options);
            var series = this._chartWidget.model().createSeries('Histogram', strictOptions);
            var res = new SeriesApi(series, this, this);
            this._private__seriesMap.set(res, series);
            this._private__seriesMapReversed.set(series, res);
            return res;
        };
        ChartApi.prototype.addLineSeries = function (options) {
            if (options === void 0) { options = {}; }
            options = migrateOptions(options);
            patchPriceFormat(options.priceFormat);
            var strictOptions = merge(clone(seriesOptionsDefaults), lineStyleDefaults, options);
            var series = this._chartWidget.model().createSeries('Line', strictOptions);
            var res = new SeriesApi(series, this, this);
            this._private__seriesMap.set(res, series);
            this._private__seriesMapReversed.set(series, res);
            return res;
        };
        ChartApi.prototype.removeSeries = function (seriesApi) {
            var series = ensureDefined(this._private__seriesMap.get(seriesApi));
            var update = this._private__dataLayer._internal_removeSeries(series);
            var model = this._chartWidget.model();
            model.removeSeries(series);
            this._private__sendUpdateToChart(update);
            this._private__seriesMap.delete(seriesApi);
            this._private__seriesMapReversed.delete(series);
        };
        ChartApi.prototype.addLineTool = function (name, points, options) {
            var strictOptions = merge(clone(LineToolsOptionDefaults[name]), options || {});
            var tool = this._chartWidget.model().createLineTool(name, strictOptions, points);
            return new LineToolApi(tool);
        };
        ChartApi.prototype.setActiveLineTool = function (name, options) {
            this._chartWidget.model().lineToolCreator().setActiveLineTool(name, options);
        };
        ChartApi.prototype.applyNewData = function (series, data) {
            this._private__sendUpdateToChart(this._private__dataLayer._internal_setSeriesData(series, data));
        };
        ChartApi.prototype.updateData = function (series, data) {
            this._private__sendUpdateToChart(this._private__dataLayer._internal_updateSeriesData(series, data));
        };
        ChartApi.prototype.subscribeClick = function (handler) {
            this._private__clickedDelegate.subscribe(handler);
        };
        ChartApi.prototype.unsubscribeClick = function (handler) {
            this._private__clickedDelegate.unsubscribe(handler);
        };
        ChartApi.prototype.subscribeCrosshairMove = function (handler) {
            this._private__crosshairMovedDelegate.subscribe(handler);
        };
        ChartApi.prototype.unsubscribeCrosshairMove = function (handler) {
            this._private__crosshairMovedDelegate.unsubscribe(handler);
        };
        ChartApi.prototype.clearCrosshairPosition = function () {
            this._chartWidget.model().clearCurrentPosition();
        };
        ChartApi.prototype.priceScale = function (priceScaleId) {
            if (priceScaleId === undefined) {
                warn('Using ChartApi.priceScale() method without arguments has been deprecated, pass valid price scale id instead');
                priceScaleId = this._chartWidget.model().defaultVisiblePriceScaleId();
            }
            return new PriceScaleApi(this._chartWidget, priceScaleId);
        };
        ChartApi.prototype.timeScale = function () {
            return this._private__timeScaleApi;
        };
        ChartApi.prototype.applyOptions = function (options) {
            this._chartWidget.applyOptions(toInternalOptions(options));
        };
        ChartApi.prototype.options = function () {
            return this._chartWidget.options();
        };
        ChartApi.prototype.takeScreenshot = function () {
            return this._chartWidget.takeScreenshot();
        };
        ChartApi.prototype.fullUpdate = function () {
            return this._chartWidget.model().fullUpdate();
        };
        ChartApi.prototype.removePane = function (index) {
            this._chartWidget.model().removePane(index);
        };
        ChartApi.prototype.swapPane = function (first, second) {
            this._chartWidget.model().swapPane(first, second);
        };
        ChartApi.prototype.getPaneElements = function () {
            return this._chartWidget.paneWidgets().map(function (paneWidget) { return paneWidget.getPaneCell(); });
        };
        ChartApi.prototype._private__sendUpdateToChart = function (update) {
            var model = this._chartWidget.model();
            model.updateTimeScale(update._internal_timeScale._internal_baseIndex, update._internal_timeScale._internal_points, update._internal_timeScale._internal_firstChangedPointIndex);
            update._internal_series.forEach(function (value, series) { return series.setData(value._internal_data, value._internal_info); });
            model.recalculateAllPanes();
        };
        ChartApi.prototype._private__mapSeriesToApi = function (series) {
            return ensureDefined(this._private__seriesMapReversed.get(series));
        };
        ChartApi.prototype._private__convertMouseParams = function (param) {
            var _this = this;
            var seriesPrices = new Map();
            param.seriesPrices.forEach(function (price, series) {
                seriesPrices.set(_this._private__mapSeriesToApi(series), price);
            });
            var hoveredSeries = param.hoveredSeries === undefined ? undefined : this._private__mapSeriesToApi(param.hoveredSeries);
            return {
                time: param.time && (param.time.businessDay || param.time.timestamp),
                point: param.point,
                paneIndex: param.paneIndex,
                hoveredSeries: hoveredSeries,
                hoveredMarkerId: param.hoveredObject,
                seriesPrices: seriesPrices,
            };
        };
        return ChartApi;
    }());

    /**
     * This function is the main entry point of the Lightweight Charting Library.
     *
     * @param container - ID of HTML element or element itself
     * @param options - Any subset of options to be applied at start.
     * @returns An interface to the created chart
     */
    function createChart(container, options) {
        var htmlElement;
        if (isString(container)) {
            var element = document.getElementById(container);
            assert(element !== null, "Cannot find element in DOM with id=".concat(container));
            htmlElement = element;
        }
        else {
            htmlElement = container;
        }
        return new ChartApi(htmlElement, options);
    }

    /// <reference types="_build-time-constants" />
    /**
     * Returns the current version as a string. For example `'3.3.0'`.
     */
    function version() {
        return "3.8.0-dev+202211041912";
    }

    var LightweightChartsModule = /*#__PURE__*/Object.freeze({
        __proto__: null,
        version: version,
        get LineStyle () { return LineStyle; },
        get LineType () { return LineType; },
        get TrackingModeExitMode () { return TrackingModeExitMode; },
        get CrosshairMode () { return CrosshairMode; },
        get PriceScaleMode () { return PriceScaleMode; },
        get TimeScaleMode () { return TimeScaleMode; },
        get PriceLineSource () { return PriceLineSource; },
        get LastPriceAnimationMode () { return LastPriceAnimationMode; },
        get LasPriceAnimationMode () { return LastPriceAnimationMode; },
        get BoxHorizontalAlignment () { return BoxHorizontalAlignment; },
        get BoxVerticalAlignment () { return BoxVerticalAlignment; },
        get TickMarkType () { return TickMarkType; },
        get ColorType () { return ColorType; },
        get LineEnd () { return LineEnd; },
        get TextAlignment () { return TextAlignment; },
        isBusinessDay: isBusinessDay,
        isUTCTimestamp: isUTCTimestamp,
        createChart: createChart
    });

    // put all exports from package to window.LightweightCharts object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-member-access
    window.LightweightCharts = LightweightChartsModule;

})();
