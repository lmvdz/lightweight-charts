import { CanvasRenderParams } from '../model/canvas-render-params';
import { TextWidthCache } from '../model/text-width-cache';

export interface TimeAxisViewRendererOptions {
	baselineOffset: number;
	borderSize: number;
	font: string;
	fontSize: number;
	paddingBottom: number;
	paddingTop: number;
	tickLength: number;
	paddingHorizontal: number;
	widthCache: TextWidthCache;
}

export interface ITimeAxisViewRenderer {
	draw?(ctx: CanvasRenderingContext2D, rendererOptions: TimeAxisViewRendererOptions, renderParams: CanvasRenderParams): void;
	drawBackground?(ctx: CanvasRenderingContext2D, rendererOptions: TimeAxisViewRendererOptions, renderParams: CanvasRenderParams): void;
}
