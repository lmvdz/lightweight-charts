import { CanvasRenderParams } from '../model/canvas-render-params';
import { HitTestResult } from '../model/hit-test-result';
import { Point } from '../model/point';

export interface IPaneRenderer {
	draw(ctx: CanvasRenderingContext2D, renderParams: CanvasRenderParams): void;
	drawBackground?(ctx: CanvasRenderingContext2D, renderParams: CanvasRenderParams): void;
	hitTest?(point: Point, renderParams: CanvasRenderParams): HitTestResult<unknown> | null;
}
