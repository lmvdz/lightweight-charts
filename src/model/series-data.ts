import { PlotRow } from './plot-data';
import { PlotList } from './plot-list';
import { SeriesType } from './series-options';

export interface LinePlotRow extends PlotRow {
	readonly color?: string;
}

export interface HistogramPlotRow extends PlotRow {
	readonly color?: string;
}

export interface BarPlotRow extends PlotRow {
	readonly color?: string;
}

export interface CandlestickPlotRow extends PlotRow {
	readonly color?: string;
	readonly borderColor?: string;
	readonly wickColor?: string;
}

<<<<<<< HEAD
export interface BrokenAreaPlotRow extends PlotRow {
	readonly color?: string;
	readonly label?: string;
	readonly extendRight?: boolean;
	readonly id?: string;
}

=======
>>>>>>> iosiftalmacel/master
export interface SeriesPlotRowTypeAtTypeMap {
	Bar: BarPlotRow;
	Candlestick: CandlestickPlotRow;
	Area: PlotRow;
	Baseline: PlotRow;
<<<<<<< HEAD
	CloudArea: PlotRow;
	BrokenArea: BrokenAreaPlotRow;
=======
>>>>>>> iosiftalmacel/master
	Line: LinePlotRow;
	Histogram: HistogramPlotRow;
}

export type SeriesPlotRow<T extends SeriesType = SeriesType> = SeriesPlotRowTypeAtTypeMap[T];
export type SeriesPlotList<T extends SeriesType = SeriesType> = PlotList<SeriesPlotRow<T>>;

export function createSeriesPlotList<T extends SeriesType = SeriesType>(): SeriesPlotList<T> {
	return new PlotList<SeriesPlotRow<T>>();
}
