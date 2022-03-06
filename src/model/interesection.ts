import { Coordinate } from './coordinate';
import { Box, equalPoints, Line, lineSegment, Point, Segment } from './point';

function addPoint(array: Point[], point: Point): boolean {
	for (let i = 0; i < array.length; i++) {
		if (equalPoints(array[i], point)) {
			return false;
		}
	}

	array.push(point);
	return true;
}

export function intersectLineAndBox(line: Line, box: Box): Segment | Point | null {
	if (line.a === 0) {
		const l = -line.c / line.b;
		return box.min.y <= l && l <= box.max.y ? lineSegment(new Point(box.min.x, l), new Point(box.max.x, l)) : null;
	}
	if (line.b === 0) {
		const h = -line.c / line.a;
		return box.min.x <= h && h <= box.max.x ? lineSegment(new Point(h, box.min.y), new Point(h, box.max.y)) : null;
	}

	const points: Point[] = [];
	const u = function(value: number): void {
		const i = -(line.c + line.a * value) / line.b;
		if (box.min.y <= i && i <= box.max.y) { addPoint(points, new Point(value, i)); }
	};
	const p = function(value: number): void {
		const s = -(line.c + line.b * value) / line.a;
		if (box.min.x <= s && s <= box.max.x) { addPoint(points, new Point(s, value)); }
	};

	u(box.min.x);
	p(box.min.y);
	u(box.max.x);
	p(box.max.y);

	switch (points.length) {
		case 0:
			return null;
		case 1:
			return points[0];
		case 2:
			return equalPoints(points[0], points[1]) ? points[0] : lineSegment(points[0], points[1]);
	}

	throw new Error('We should have at most two intersection points');
	return null;
}

export function intersectRayAndBox(point0: Point, point1: Point, box: Box): Point | null {
	const s = intersectLineSegments(point0, point1, box.min, new Point(box.max.x, box.min.y));
	const n = intersectLineSegments(point0, point1, new Point(box.max.x, box.min.y), box.max);
	const a = intersectLineSegments(point0, point1, box.max, new Point(box.min.x, box.max.y));
	const c = intersectLineSegments(point0, point1, new Point(box.min.x, box.max.y), box.min);

	const h = [];
	if (null !== s && s >= 0) { h.push(s); }
	if (null !== n && n >= 0) { h.push(n); }
	if (null !== a && a >= 0) { h.push(a); }
	if (null !== c && c >= 0) { h.push(c); }

	if (0 === h.length) { return null; }
	h.sort((e: number, t: number) => e - t);

	const d = pointInBox(point0, box) ? h[0] : h[h.length - 1];
	return point0.addScaled(point1.subtract(point0), d);
}

export function intersectLineSegments(point0: Point, point1: Point, point2: Point, point3: Point): number | null {
	const z = (function(e: Point, t: Point, i: Point, s: Point): number | null {
		const r = t.subtract(e);
		const n = s.subtract(i);
		const o = r.x * n.y - r.y * n.x;
		if (Math.abs(o) < 1e-6) {return null;}
		const a = e.subtract(i);
		return (a.y * n.x - a.x * n.y) / o;
	})(point0, point1, point2, point3);

	if (null === z) {return null;}
	const o = point1.subtract(point0).scaled(z).add(point0);
	const a = distanceToSegment(point2, point3, o);
	return Math.abs(a.distance) < 1e-6 ? z : null;
}

export function intersectLineSegmentAndBox(segment: Segment, box: Box): Point | Segment | null {
	let i = segment[0].x;
	let s = segment[0].y;
	let n = segment[1].x;
	let o = segment[1].y;
	const a = box.min.x;
	const l = box.min.y;
	const c = box.max.x;
	const h = box.max.y;

	function d(n1: number, n2: number, n3: number, n4: number, n5: number, n6: number): number {
		let z = 0;
		if (n1 < n3) { z |= 1; } else if (n1 > n5) { z |= 2; }
		if (n2 < n4) { z |= 4; } else if (n2 > n6) { z |= 8; }
		return z;
	}

	let check = false;

	for (let u = d(i, s, a, l, c, h), p = d(n, o, a, l, c, h), m = 0; ;) {
		if (m > 1e3) {throw new Error('Cohen - Sutherland algorithm: infinity loop');}
		m++;

		if (!(u | p)) {
			check = true;
			break;
		}

		if (u & p) {break;}

		const g = u || p;
		let f: number | undefined = void 0;
		let v: number | undefined = void 0;

		if (8 & g) {
			f = i + (n - i) * (h - s) / (o - s);
			v = h;
		} else if (4 & g) {
			f = i + (n - i) * (l - s) / (o - s);
			v = l;
		} else if (2 & g) {
			v = s + (o - s) * (c - i) / (n - i);
			f = c;
		} else {
			v = s + (o - s) * (a - i) / (n - i);
			f = a;
		}

		if (g === u) {
			i = f as Coordinate;
			s = v as Coordinate;
			u = d(i, s, a, l, c, h);
		} else {
			n = f as Coordinate;
			o = v as Coordinate;
			p = d(n, o, a, l, c, h);
		}
	}

	return check ? equalPoints(new Point(i, s), new Point(n, o)) ? new Point(i, s) : lineSegment(new Point(i, s), new Point(n, o)) : null;
}

export function distanceToLine(point0: Point, point1: Point, point2: Point): { distance: number; coeff: number } {
	const s = point1.subtract(point0);
	const r = point2.subtract(point0).dotProduct(s) / s.dotProduct(s);
	return { coeff: r, distance: point0.addScaled(s, r).subtract(point2).length() };
}

export function distanceToSegment(point0: Point, point1: Point, point2: Point): { distance: number; coeff: number } {
	const lineDist = distanceToLine(point0, point1, point2);
	if (0 <= lineDist.coeff && lineDist.coeff <= 1) { return lineDist; }

	const n = point0.subtract(point2).length();
	const o = point1.subtract(point2).length();

	return n < o ? { coeff: 0, distance: n } : { coeff: 1, distance: o };
}

export function pointInBox(point: Point, box: Box): boolean {
	return point.x >= box.min.x && point.x <= box.max.x && point.y >= box.min.y && point.y <= box.max.y;
}

export function pointInPolygon(point: Point, polygon: Point[]): boolean {
	const x = point.x;
	const y = point.y;
	let isInside = false;

	for (let j = polygon.length - 1, i = 0; i < polygon.length; i++) {
		const curr = polygon[i];
		const prev = polygon[j];
		j = i;

		if ((curr.y < y && prev.y >= y || prev.y < y && curr.y >= y) && curr.x + (y - curr.y) / (prev.y - curr.y) * (prev.x - curr.x) < x) {
			isInside = !isInside;
		}
	}
	return isInside;
}
