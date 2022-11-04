import { CanvasRenderParams } from '../model/canvas-render-params';
import { HitTestResult } from '../model/hit-test-result';
import { Point } from '../model/point';

import { IPaneRenderer } from './ipane-renderer';

export class CompositeRenderer implements IPaneRenderer {
	private _renderers: IPaneRenderer[] = [];
	private _globalAlpha: number = 1;

	public setRenderers(renderers: IPaneRenderer[]): void {
		this._renderers = renderers;
	}

	public setGlobalAlpha(value: number): void {
		this._globalAlpha = value;
	}

	public append(renderer: IPaneRenderer): void {
		this._renderers?.push(renderer);
	}

	public insert(renderer: IPaneRenderer, index: number): void {
		this._renderers.splice(index, 0, renderer);
	}

	public clear(): void {
		this._renderers.length = 0;
	}

	public isEmpty(): boolean {
		return this._renderers.length === 0;
	}

	public draw(ctx: CanvasRenderingContext2D, renderParams: CanvasRenderParams): void {
		for (let i = 0; i < this._renderers.length; i++) {
			ctx.save();
			ctx.globalAlpha = this._globalAlpha;
			this._renderers[i].draw(ctx, renderParams);
			ctx.restore();
		}
	}

	public drawBackground(ctx: CanvasRenderingContext2D, renderParams: CanvasRenderParams): void {
		ctx.save();
		ctx.globalAlpha = this._globalAlpha;
		for (let i = 0; i < this._renderers.length; i++) {
			const renderer = this._renderers[i];
			if (renderer.drawBackground) {
				renderer.drawBackground(ctx, renderParams);
			}
		}
		ctx.restore();
	}

	public hitTest(point: Point, renderParams: CanvasRenderParams): HitTestResult<unknown> | null {
		let result = null;
		for (let i = this._renderers.length - 1; i >= 0; i--) {
			const renderer = this._renderers[i];
			if (renderer.hitTest) {
				result = renderer.hitTest(point, renderParams) || null;
			}
			if (result) { break; }
		}
		return result;
	}
}
