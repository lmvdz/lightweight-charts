export function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number | number[]): void {
	let a; let b; let c; let d;

	if (Array.isArray(radius)) {
		if (2 === radius.length) {
			const e = Math.max(0, radius[0]);
			const t = Math.max(0, radius[1]);
			a = e;
			b = e;
			c = t;
			d = t;
		} else {
			if (4 !== radius.length) { throw new Error('Wrong border radius - it should be like css border radius'); }
			a = Math.max(0, radius[0]);
			b = Math.max(0, radius[1]);
			c = Math.max(0, radius[2]);
			d = Math.max(0, radius[3]);
		}
	} else {
		const e = Math.max(0, radius);
		a = e;
		b = e;
		c = e;
		d = e;
	}

	ctx.beginPath();
	ctx.moveTo(x + a, y);
	ctx.lineTo(x + width - b, y);
	if (b !== 0) { ctx.arcTo(x + width, y, x + width, y + b, b); }
	ctx.lineTo(x + width, y + height - c);
	if (c !== 0) { ctx.arcTo(x + width, y + height, x + width - c, y + height, c); }
	ctx.lineTo(x + d, y + height);
	if (d !== 0) { ctx.arcTo(x, y + height, x, y + height - d, d); }
	ctx.lineTo(x, y + a);
	if (a !== 0) { ctx.arcTo(x, y, x + a, y, a); }
}
