import { SYSTEMS } from "../data/systems";

export class DebugPanel {
  private container: HTMLDivElement;
  private content: HTMLDivElement;
  private isCollapsed = false;

  constructor(
    private onWarp: (systemId: string) => void,
    private onRefill: () => void,
    private onMaxUpgrades: () => void,
    private onAddParts: () => void
  ) {
    this.container = document.createElement("div");
    this.setupStyles();
    this.buildUI();
    document.body.appendChild(this.container);
  }

  private setupStyles() {
    this.container.style.position = "fixed";
    this.container.style.top = "10px";
    this.container.style.right = "10px";
    this.container.style.backgroundColor = "rgba(0, 0, 0, 0.85)";
    this.container.style.color = "#0f0";
    this.container.style.border = "1px solid #0f0";
    this.container.style.padding = "10px";
    this.container.style.fontFamily = "monospace";
    this.container.style.zIndex = "9999";
    this.container.style.display = "flex";
    this.container.style.flexDirection = "column";
    this.container.style.gap = "10px";
    this.container.style.minWidth = "200px";
    this.container.style.borderRadius = "4px";
  }

  private buildUI() {
    // Header & Toggle
    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.alignItems = "center";
    header.style.cursor = "pointer";
    header.style.userSelect = "none";
    header.style.fontWeight = "bold";

    const title = document.createElement("span");
    title.innerText = "🛠 Debug UI";

    const toggleBtn = document.createElement("button");
    toggleBtn.innerText = "[-]";
    this.styleButton(toggleBtn);
    toggleBtn.style.padding = "2px 5px";

    header.appendChild(title);
    header.appendChild(toggleBtn);

    this.container.appendChild(header);

    // Content Area
    this.content = document.createElement("div");
    this.content.style.display = "flex";
    this.content.style.flexDirection = "column";
    this.content.style.gap = "8px";
    this.content.style.marginTop = "10px";
    this.container.appendChild(this.content);

    header.onclick = () => {
      this.isCollapsed = !this.isCollapsed;
      this.content.style.display = this.isCollapsed ? "none" : "flex";
      toggleBtn.innerText = this.isCollapsed ? "[+]" : "[-]";
    };

    // --- System Warp ---
    const warpContainer = document.createElement("div");
    warpContainer.style.display = "flex";
    warpContainer.style.gap = "5px";

    const systemSelect = document.createElement("select");
    systemSelect.style.flexGrow = "1";
    systemSelect.style.backgroundColor = "#000";
    systemSelect.style.color = "#0f0";
    systemSelect.style.border = "1px solid #0f0";

    SYSTEMS.forEach(sys => {
      const option = document.createElement("option");
      option.value = sys.id;
      option.innerText = sys.name;
      systemSelect.appendChild(option);
    });

    const warpBtn = document.createElement("button");
    warpBtn.innerText = "Warp";
    this.styleButton(warpBtn);
    warpBtn.onclick = () => this.onWarp(systemSelect.value);

    warpContainer.appendChild(systemSelect);
    warpContainer.appendChild(warpBtn);
    this.content.appendChild(warpContainer);

    // --- Actions ---
    const refillBtn = document.createElement("button");
    refillBtn.innerText = "Refill Tanks";
    this.styleButton(refillBtn);
    refillBtn.onclick = () => this.onRefill();
    this.content.appendChild(refillBtn);

    const upgradesBtn = document.createElement("button");
    upgradesBtn.innerText = "Max Upgrades";
    this.styleButton(upgradesBtn);
    upgradesBtn.onclick = () => this.onMaxUpgrades();
    this.content.appendChild(upgradesBtn);
    
    const partsBtn = document.createElement("button");
    partsBtn.innerText = "+100 Parts";
    this.styleButton(partsBtn);
    partsBtn.onclick = () => this.onAddParts();
    this.content.appendChild(partsBtn);
  }

  private styleButton(btn: HTMLButtonElement) {
    btn.style.backgroundColor = "#000";
    btn.style.color = "#0f0";
    btn.style.border = "1px solid #0f0";
    btn.style.cursor = "pointer";
    btn.style.padding = "5px";
    btn.style.fontFamily = "monospace";
    btn.onmouseover = () => btn.style.backgroundColor = "#0f03";
    btn.onmouseout = () => btn.style.backgroundColor = "#000";
  }

  public destroy() {
    this.container.remove();
  }
}
