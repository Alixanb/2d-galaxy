import { Tool } from "../systems/ToolManager";

export type InformationValue = string | number;

export default class Information extends Tool {
  unit?: string;
  value: InformationValue;

  constructor(label: string, unit?: string, initialValue: InformationValue = "N/A") {
    super(label, "info-container");
    
    this.value = initialValue;
    this.unit = unit;
  }

  set(value: InformationValue) {
    this.value = value;
  }

  update() {
    this.container.innerHTML = `<b>${this.label} :</b> ${this.value} ${this.unit ? this.unit : ""}`;
  }
}