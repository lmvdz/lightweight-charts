/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import { Coordinate } from './coordinate';

export interface IPoint {
	readonly x: Coordinate;
	readonly y: Coordinate;
}

export class Point {
	public x!: Coordinate;
	public y!: Coordinate;

	public constructor(x: number, y: number)
	public constructor(x: Coordinate, y: Coordinate) {
		(this.x as Coordinate) = x;
		(this.y as Coordinate) = y;
	}

	public add(point: Point): Point {
		return new Point(this.x + point.x, this.y + point.y);
	}

	public addScaled(point: Point, scale: number): Point {
		return new Point(this.x + scale * point.x, this.y + scale * point.y);
	}

	public subtract(point: Point): Point {
		return new Point(this.x - point.x, this.y - point.y);
	}

	public dotProduct(point: Point): number {
		return this.x * point.x + this.y * point.y;
	}

	public crossProduct(point: Point): number {
		return this.x * point.y - this.y * point.x;
	}

	public signedAngle(point: Point): number {
		return Math.atan2(this.crossProduct(point), this.dotProduct(point));
	}

	public angle(point: Point): number {
		return Math.acos(this.dotProduct(point) / (this.length() * point.length()));
	}

	public length(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}

	public scaled(scale: number): Point {
		return new Point(this.x * scale, this.y * scale);
	}

	public normalized(): Point {
		return this.scaled(1 / this.length());
	}

	public transposed(): Point {
		return new Point(-this.y, this.x);
	}

	public clone(): Point {
		return new Point(this.x, this.y);
	}
}

export class Box {
	public min: Point;
	public max: Point;

	public constructor(a: Point, b: Point) {
		this.min = new Point(Math.min(a.x, b.x), Math.min(a.y, b.y));
		this.max = new Point(Math.max(a.x, b.x), Math.max(a.y, b.y));
	}
}

export interface Rect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface Line {
	a: number;
	b: number;
	c: number;
}

export type Segment = [Point, Point];

export function equalPoints(a: Point, b: Point): boolean {
	return a.x === b.x && a.y === b.y;
}

export function line(a: number, b: number, c: number): Line {
	return { a, b, c };
}

export function lineThroughPoints(a: Point, b: Point): Line {
	if (equalPoints(a, b)) {throw new Error('Points should be distinct');}
	return line(a.y - b.y, b.x - a.x, a.x * b.y - b.x * a.y);
}

export function lineSegment(a: Point, b: Point): Segment {
	if (equalPoints(a, b)) { throw new Error('Points of a segment should be distinct'); }
	return [a, b];
}

export function equalBoxes(a: Box, b: Box): boolean {
	return equalPoints(a.min, b.min) && equalPoints(a.max, b.max);
}
