import { IPriceAxisViewRenderer } from '../../renderers/iprice-axis-view-renderer';

export interface IPriceAxisView {
	renderer(): IPriceAxisViewRenderer;
	update(): void;
}
