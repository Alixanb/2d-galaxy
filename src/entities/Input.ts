import { Tool } from "../systems/ToolManager";

abstract class Input<T> extends Tool {
  value: T;
  input: HTMLInputElement;
  labelElement: HTMLElement;
  onChangeCallBack: (e: Input<T>) => void;

  constructor(
    label: string,
    defaultValue: T,
    onChangeCallBack: (e: Input<T>) => void
  ) {
    super(label, "input-container");

    this.value = defaultValue;
    this.input = document.createElement("input");
    this.onChangeCallBack = onChangeCallBack;

    this.labelElement = document.createElement("label");
    this.labelElement.innerHTML = `<b>${this.label}</b><br />`;
    this.container.appendChild(this.labelElement);
  }

  abstract onChange(): void;
}

export class RangeInput extends Input<number> {
  range: [number, number];
  step: number;

  constructor(
    label: string,
    defaultValue: number,
    range: [number, number],
    onChangeCallBack: (input: Input<number>) => void,
    step = 1
  ) {
    super(label, defaultValue, onChangeCallBack);
    this.range = range;
    this.step = step;

    this.input.type = "range";
    this.input.value = defaultValue.toString();
    this.input.min = (range[0] * step).toString();
    this.input.max = (range[1] * step).toString();

    this.input.addEventListener("input", this.onChange.bind(this));

    this.container.appendChild(this.input);
  }

  onChange() {
    this.value = parseInt(this.input.value) / this.step;
    this.onChangeCallBack(this);
  }

  update() {
    this.labelElement.innerHTML = `<b>(${this.value}x) ${this.label}</b><br />`;
  }
}

export class CheckboxInput extends Input<boolean> {
  constructor(
    label: string,
    defaultValue: boolean,
    onChangeCallBack: (input: Input<boolean>) => void
  ) {
    super(label, defaultValue, onChangeCallBack);

    this.input.type = "checkbox";
    this.input.checked = defaultValue;

    this.input.addEventListener("input", this.onChange.bind(this));

    this.container.appendChild(this.input);
  }

  onChange(): void {
    this.value = this.input.checked;
    this.onChangeCallBack(this);
  }

  update(): void {
    this.labelElement.innerHTML = `<b>${this.label}</b><br />`;
  }
}
