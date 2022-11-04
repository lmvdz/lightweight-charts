import { CanvasRenderParams } from '../model/canvas-render-params';

import { IPaneRenderer } from './ipane-renderer';

export abstract class ScaledRenderer implements IPaneRenderer {
	public draw(ctx: CanvasRenderingContext2D, renderParams: CanvasRenderParams): void {
		const pixelRatio = renderParams.pixelRatio;
		ctx.save();
		// actually we must be sure that this scaling applied only once at the same time
		// currently ScaledRenderer could be only nodes renderer (not top-level renderers like CompositeRenderer or something)
		// so this "constraint" is fulfilled for now
		ctx.scale(pixelRatio, pixelRatio);
		this._drawImpl(ctx, renderParams);
		ctx.restore();
	}

	public drawBackground(ctx: CanvasRenderingContext2D, renderParams: CanvasRenderParams): void {
		const pixelRatio = renderParams.pixelRatio;
		ctx.save();
		// actually we must be sure that this scaling applied only once at the same time
		// currently ScaledRenderer could be only nodes renderer (not top-level renderers like CompositeRenderer or something)
		// so this "constraint" is fulfilled for now
		ctx.scale(pixelRatio, pixelRatio);
		this._drawBackgroundImpl(ctx, renderParams);
		ctx.restore();
	}

	protected abstract _drawImpl(ctx: CanvasRenderingContext2D, renderParams?: CanvasRenderParams): void;

	protected _drawBackgroundImpl(ctx: CanvasRenderingContext2D, renderParams?: CanvasRenderParams): void {}
}
