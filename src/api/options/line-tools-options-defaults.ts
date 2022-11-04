/* eslint-disable @typescript-eslint/naming-convention */
import { applyAlpha } from '../../helpers/color';
import { defaultFontFamily } from '../../helpers/make-font';
import { clone, merge } from '../../helpers/strict-type-checks';

import { BoxHorizontalAlignment, BoxVerticalAlignment, BrushToolOptions, CrossLineToolOptions, FibRetracementToolOptions, HighlighterToolOptions, HorizontalLineToolOptions, LineJoin, ParallelChannelToolOptions, PathToolOptions, RectangleToolOptions, TextAlignment, TextOptions, TextToolOptions, TrendLineToolOptions, TriangleToolOptions, VerticalLineToolOptions } from '../../model/line-tool-options';

import { LineEnd, LineStyle } from '../..';

export const TextDefaults: TextOptions = {
	value: '',
	padding: 0,
	wordWrapWidth: 0,
	forceTextAlign: false,
	forceCalculateMaxLineWidth: false,
	alignment: TextAlignment.Left,
	font: { family: defaultFontFamily, color: '#2962ff', size: 12, bold: false, italic: false },
	box: { scale: 1, angle: 0, alignment: { vertical: BoxVerticalAlignment.Bottom, horizontal: BoxHorizontalAlignment.Left } },
};

export const TrendLineOptionDefaults: TrendLineToolOptions = {
	visible: true,
	line: {
		width: 1,
		color: '#2962ff',
		style: LineStyle.Solid,
		extend: { left: false, right: false },
		end: { left: LineEnd.Normal, right: LineEnd.Normal },
	},
	text: TextDefaults,
};

export const HorizontalLineOptionDefaults: HorizontalLineToolOptions = {
	visible: true,
	line: {
		width: 1,
		color: '#2962ff',
		style: LineStyle.Solid,
		extend: { left: true, right: true },
		end: { left: LineEnd.Normal, right: LineEnd.Normal },
	},
	text: TextDefaults,
};

export const ParallelChannelOptionDefaults: ParallelChannelToolOptions = {
	visible: true,
	showMiddleLine: true,
	extend: { left: false, right: false },
	background: { color: applyAlpha('#2962ff', 0.2) },
	middleLine: { width: 1, color: '#2962ff', style: LineStyle.Dashed },
	channelLine: { width: 1, color: '#2962ff', style: LineStyle.Solid },
};

export const FibRetracementOptionDefaults: FibRetracementToolOptions = {
	visible: true,
	extend: { left: false, right: false },
	line: { width: 1, style: LineStyle.Solid },
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

export const BrushOptionDefaults: BrushToolOptions = {
	visible: true,
	line: {
		width: 1,
		color: '#00bcd4',
		join: LineJoin.Round,
		style: LineStyle.Solid,
		end: { left: LineEnd.Normal, right: LineEnd.Normal },
	},
};

export const RectangleOptionDefaults: RectangleToolOptions = {
	visible: true,
	rectangle: {
		extend: { left: false, right: false },
		background: { color: applyAlpha('#9c27b0', 0.2) },
		border: { width: 1, style: LineStyle.Solid, color: '#9c27b0' },
	},
	text: TextDefaults,
};

export const TriangleOptionDefaults: TriangleToolOptions = {
	visible: true,
	triangle: {
		background: { color: applyAlpha('#f57c00', 0.2) },
		border: { width: 1, style: LineStyle.Solid, color: '#f57c00' },
	},
};

export const VerticalLineOptionDefaults: VerticalLineToolOptions = {
	visible: true,
	text: TextDefaults,
	line: { width: 1, color: '#2962ff', style: LineStyle.Solid },
};

export const PathOptionDefaults: PathToolOptions = {
	visible: true,
	line: {
		width: 1,
		color: '#2962ff',
		style: LineStyle.Solid,
		end: { left: LineEnd.Normal, right: LineEnd.Arrow },
	},
};

export const CrossLineOptionDefaults: CrossLineToolOptions = {
	visible: true,
	line: { width: 1, color: '#2962ff', style: LineStyle.Solid },
};

export const HighlighterOptionDefaults: HighlighterToolOptions = {
	visible: true,
	line: { color: applyAlpha('#f23645', 0.15) },
};

export const TextOptionDefaults: TextToolOptions = {
	visible: true,
	text: merge(clone(TextDefaults), { value: 'Text' }) as TextOptions,
};

/** @public */
export const LineToolsOptionDefaults = {
	Ray: merge(clone(TrendLineOptionDefaults), { line: { extend: { right: true } } }),
	Arrow: merge(clone(TrendLineOptionDefaults), { line: { end: { right: LineEnd.Arrow } } }),
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
