import type Information from "../entities/Information";
import type { CheckBoxInput, RangeInput } from "../entities/Input";

type ClassExtendsTool = Information | RangeInput | CheckBoxInput;

export abstract class Tool {
  label: string;
  container: HTMLElement;

  constructor(label: string, className: string) {
    this.label = label;
    
    this.container = document.createElement("div");
    this.container.classList.add(className);
  }

  abstract update(): void
}

export default class ToolManager {
  element: HTMLElement;
  tools: ClassExtendsTool[];

  constructor(ref: string, informations: ClassExtendsTool[] = []) {
    const element = document.querySelector<HTMLElement>(ref);
    if (!element)
      throw new Error("Unable to fetch canvas element with string " + ref);

    this.element = element;
    this.tools = informations;

    for(let tool of this.tools) {
      this.element.appendChild(tool.container);

      tool.update()
    }
  }

  update() {
    for(let tool of this.tools) {
      tool.update()
    }
  }
}