import { Delegate } from '../helpers/delegate';

type Primitive = boolean | string | number;

export class Properties {
	private _listeners: Delegate<Properties> = new Delegate();
	private _muteChildChanges: boolean = false;
	private _value: Primitive | null = null;
	private _childs: string[] = [];

	public constructor(value: Primitive | Record<string, unknown>) {
		if (this.isPrimitiveType(value)) {
			this._value = value as Primitive;
		} else {
			Object.keys(value).forEach((key: string) => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				this.addProperty(key, (value as Record<string, any>)[key]);
			});
		}
	}

	public addProperty(key: string, value: Record<string, unknown>): void {
		const newProperty = new Properties(value);
		(this as Record<string, unknown>)[key] = newProperty;

		this._childs.push(key);
		newProperty.subscribe(this, this.childChanged);
	}

	public removeProperty(key: string): void {
		((this as Record<string, unknown>)[key] as Properties).unsubscribe(
			this.childChanged
		);

		delete (this as Record<string, unknown>)[key];
		this._childs = this._childs.filter((c: string) => c !== key);
	}

	public subscribe(owner: unknown, callback: () => void): void {
		this.listeners().subscribe(callback, owner, false);
	}

	public unsubscribeAll(owner: unknown): void {
		this.listeners().unsubscribeAll(owner);
	}

	public unsubscribe(callback: () => void): void {
		this.listeners().unsubscribe(callback);
	}

	public value(): Primitive | null {
		return this._value;
	}

	public childCount(): number {
		return this._childs.length;
	}

	public childNames(): string[] {
		return this._childs;
	}

	public child(name: string): Properties {
		return (this as Record<string, unknown>)[name] as Properties;
	}

	public childs(): Properties {
		return this;
	}

	public hasChild(key: string): boolean {
		return this._childs.indexOf(key) >= 0;
	}

	public addChild(key: string, value: Properties): void {
		((this as Record<string, unknown>)[key] as Properties)?.unsubscribe(
			this.childChanged
		);

		if (this._childs.indexOf(key)) {
			this._childs.push(key);
		}

		(this as Record<string, unknown>)[key] = value;
		value.subscribe(this, this.childChanged);
	}

	public childChanged = (): void => {
		if (!this._muteChildChanges) {
			this.listeners().fire(this);
		}
	};

	public setValue(value: Primitive, force: boolean): void {
		if (force || this._value !== value) {
			this._value = value;
			this.listeners().fire(this);
		}
	}

	public setValueSilently(value: Primitive): void {
		this._value = value;
	}

	public listeners(): Delegate<Properties> {
		return this._listeners;
	}

	public isPrimitiveType(value: unknown): boolean {
		return ['number', 'boolean', 'string'].indexOf(typeof value) !== -1;
	}

	public state(exclusions?: string[]): Primitive | Record<string, unknown> {
		const value = this.value() || {};

		for (let i = 0; i < this._childs.length; i++) {
			const key = this._childs[i];

			if (exclusions && exclusions.indexOf(key) !== -1) {
				continue;
			}

			const itemProp = (this as Record<string, unknown>)[key] as Properties;
			let itemValue: Primitive | Record<string, unknown>;

			if (exclusions) {
				const itemExclusions: string[] = [];
				for (let o = 0; o < exclusions.length; o++) {
					const exclusion = exclusions[o];
					if (exclusion.startsWith(key + '.')) {
						itemExclusions.push(exclusion.substring(key.length + 1));
					}
				}
				itemValue = itemProp.state(itemExclusions) as Record<string, unknown>;
			} else {
				itemValue = itemProp.state() as Primitive;
			}

			(value as Record<string, unknown>)[key] = itemValue;
		}

		return value;
	}

	public clone(): Properties {
		return new Properties(this.state());
	}
}
