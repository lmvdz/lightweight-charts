import { CanvasRenderParams } from '../model/canvas-render-params';
import { TextWidthCache } from '../model/text-width-cache';

export interface PriceAxisViewRendererOptions {
	baselineOffset: number;
	borderSize: number;
	font: string;
	fontFamily: string;
	color: string;
	fontSize: number;
	paddingBottom: number;
	paddingInner: number;
	paddingOuter: number;
	paddingTop: number;
	tickLength: number;

	widthCache: TextWidthCache;
	align: 'left' | 'right';
}

export interface IPriceAxisViewRenderer {
	draw?(ctx: CanvasRenderingContext2D, rendererOptions: PriceAxisViewRendererOptions, renderParams: CanvasRenderParams): void;
	drawBackground?(ctx: CanvasRenderingContext2D, rendererOptions: PriceAxisViewRendererOptions, renderParams: CanvasRenderParams): void;
}
