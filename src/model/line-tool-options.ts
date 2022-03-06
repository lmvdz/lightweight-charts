/* eslint-disable @typescript-eslint/naming-convention */
import { DeepPartial } from '../helpers/strict-type-checks';

import { LineCap, LineStyle, LineWidth } from '../renderers/draw-line';

export const enum BoxVerticalAlignment {
	Top = 'top',
	Middle = 'middle',
	Bottom = 'bottom',
}

export const enum BoxHorizontalAlignment {
	Left = 'left',
	Center = 'center',
	Right = 'right',
}

export const enum TextAlignment {
	Start = 'start',
	Center = 'center',
	End = 'end',
	Left = 'left',
	Right = 'right',
}

export interface LineToolLineExtend {
	/**
	 * Extend line right.
	 *
	 * @defaultValue `false`
	 */
	right: boolean;

	/**
	 * Extend line left.
	 *
	 * @defaultValue `false`
	 */
	left: boolean;
}

export interface LineToolLineCap {
	/**
	 * Line cap right.
	 *
	 * @defaultValue {@link LinkCap.Normal}
	 */
	left: LineCap;

	/**
	 * Line cap left.
	 *
	 * @defaultValue {@link LinkCap.Normal}
	 */
	right: LineCap;
}

export interface LineToolTextBoxAlignment {
	/**
	 * Text vertical alignment.
	 *
	 * @defaultValue {@link BoxVerticalAlignment.Top}
	 */
	vertical: BoxVerticalAlignment;

	/**
	 * Text horizontal alignment.
	 *
	 * @defaultValue {@link BoxHorizontalAlignment.Left}
	 */
	horizontal: BoxHorizontalAlignment;
}

export interface XY {
	/**
	 * Box offset x.
	 */
	x: number;

	/**
	 * Box offset y.
	 */
	y: number;
}

export interface LineToolTextBoxShadow {
	blur: number;
	color: string;
	offset: XY;
}

export interface LineToolTextBox {
	/**
	 * Box alignment.
	 */
	alignment: LineToolTextBoxAlignment;

	/**
	 * Box angle.
	*/
	angle: number;

	/**
	 * Box scale.
	 */
	scale: number;

	/**
	 * Box offset.
	 */
	offset: XY;

	/**
	 * Box padding.
	 */
	padding: XY;

	/**
	 * Box max height.
	 */
	maxHeight: number;

	/**
	 * Box shadow.
	 */
	shadow: LineToolTextBoxShadow;

	/**
	 * Box background.
	 */
	background: LineToolTextBackround;

	/**
	 * Box border.
	 */
	border: LineToolTextBorder;
}

export interface LineToolTextFont {
	/**
	 * Font color.
	 *
	 * @defaultValue `'#B2B5BE'`
	 */
	color: string;

	/**
	 * Font size.
	 *
	 * @defaultValue `12`
	 */
	size: number;

	/**
	 * If font should be bold.
	 *
	 * @defaultValue `false`
	 */
	bold: boolean;

	/**
	 * If font should be italic.
	 *
	 * @defaultValue `false`
	 */
	italic: boolean;

	/**
	 * Font family.
	 *
	 * @defaultValue `-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, SegoeUI, Ubuntu, sans-serif`
	 */
	family: string;
}

export interface LineToolTextBackround {

	/**
	 * Background color.
	 */
	color: string;

	/**
	 * Background transparency.
	 */
	transparency: number;

	/**
	 * Background inflate.
	 */
	inflation: XY;
}

export interface LineToolTextBorder {

	/**
	 * Border color.
	 */
	color: string;

	/**
	 * Border width.
	 */
	width: number;

	/**
	 * Border radius.
	 */
	radius: number;

	/**
	 * If border should be highlighted.
	 */
	highlight: boolean;
}

export interface LineToolText {
	/**
	 * Text value.
	 *
	 * @defaultValue `""`
	 */
	value: string;

	/**
	 * Text alignment.
	 *
	 * @defaultValue {@link BoxHorizontalAlignment.Left}
	 */
	alignment: TextAlignment;

	/**
	 * Text font.
	 */
	font: LineToolTextFont;

	/**
	 * Text box.
	 */
	box: LineToolTextBox;

	/**
	 * Text padding.
	 */
	padding: number;

	/**
	 * Text word wrap width.
	 */
	wordWrapWidth: number;

	/**
	 * Should force text align.
	 */
	forceTextAlign: boolean;

	/**
	 * Should force calcualte max line width.
	 */
	forceCalculateMaxLineWidth: boolean;
}

export interface LineToolLine {
	/**
	 * Line color.
	 *
	 * @defaultValue `'#B2B5BE'`
	 */
	color: string;

	/**
	 * Line width.
	 *
	 * @defaultValue `1`
	 */
	width: LineWidth;

	/**
	 * Line style.
	 *
	 * @defaultValue {@link LineStyle.Solid}
	 */
	style: LineStyle;

	/**
	 * Line ends cap.
	 *
	 */
	cap: LineToolLineCap;

	/**
	 * Line ends cap.
	 *
	 */
	extend: LineToolLineExtend;
}

export interface LineToolOptionsCommon {
	/**
	 * Visibility of the line.
	 *
	 * @defaultValue `true`
	 */
	visible: boolean;

	/**
	 * The owner source id.
	 */
	ownerSourceId: string;
}

/**
 * Represents style options for a bar series.
 */
export interface TrendLineOptions {
	/**
	 * Text config.
	 */
	text: LineToolText;
	/**
	 * Line config.
	 */
	line: LineToolLine;
}

/**
 * Represents the intersection of a series type `T`'s options and common line tool options.
 *
 * @see {@link SeriesOptionsCommon} for common options.
 */
export type LineToolOptions<T> = T & LineToolOptionsCommon;
/**
 * Represents a {@link LineToolOptions} where every property is optional.
 */
export type LineToolPartialOptions<T> = DeepPartial<T & LineToolOptionsCommon>;

export type TrendLineToolOptions = LineToolOptions<TrendLineOptions>;
export type TrendLineToolPartialOptions = LineToolPartialOptions<TrendLineOptions>;

/**
 * Represents the type of options for each line tool type.
 */
export interface LineToolOptionsMap {
	/**
	 * The type of trend line tool options.
	 */
	Trend: TrendLineToolOptions;
}

/**
 * Represents the type of partial options for each line tool type.
 */
export interface LineToolPartialOptionsMap {
	/**
	 * The type of bar series partial options.
	 */
	Trend: TrendLineToolPartialOptions;
}

/**
 * Represents a type of line tool.
 *
 * @see {@link LineToolOptionsMap}
 */
export type LineToolType = keyof LineToolOptionsMap;
