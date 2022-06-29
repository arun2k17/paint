import { app, pages } from "@microsoft/teams-js";
import { ge, assignIdChildren } from "./utils";

const searchParams = new URL(window.location).searchParams;
const root = document.getElementById("content");

// STARTUP LOGIC

async function start() {
    // Check for page to display
    let view = searchParams.get("view") || "stage";

    // Check if we are running on stage.
    if (!!searchParams.get("inTeams")) {
        // Initialize teams app
        await app.initialize();

        // Get our frameContext from context of our app in Teams
        const context = await app.getContext();
        if (context.page.frameContext == "meetingStage") {
            view = "stage";
        }
    }

    // Load the requested view
    switch (view) {
        case "content":
            renderSideBar(root);
            break;
        case "config":
            renderSettings(root);
            break;
        case "stage":
        default:
            renderStage(root);
            break;
    }
}

// STAGE VIEW

const stageTemplate = document.createElement("template");

stageTemplate["innerHTML"] = `
  <style>
    .wrapper { text-align: center; color: white }
    .text { font-size: medium; }
    svg {
      max-width: 100%;
      max-height: 700px;
    }
  </style>
  <div class="wrapper">
    <div>
      <label for="color">
          <span class="text">Pick color</span>
          <input type="color" id="color" value="#ffffff" />
      </label>
    </div>
    <div>
      <label>
          <span class="text">Enter code for art</span>
          <textarea id="artCode" placeholder="Paste any svg art here"></textarea>
      </label>
    </div>
    <button id="loadArtButton">Load custom art</button>
    <div id="art"></div>
  </div>
`;

function renderStage(elem) {
    elem.appendChild(stageTemplate.content.cloneNode(true));
    ge("loadArtButton").addEventListener("click", () => {
        loadArt(ge("artCode").value);
    });
    paint();
}
function loadArt(code) {
    const art = ge("art");
    art.innerHTML = code;
    assignIdChildren(art, "artElement", 0);
}

function paint() {
    document.addEventListener("click", (event) => {
        if (event.srcElement.id.indexOf("artElement") === 0) {
            const color = ge("color").value;
            event.srcElement.style.backgroundColor = color;
            event.srcElement.style.fill = color;
        }
    });
}
// SIDEBAR VIEW

const sideBarTemplate = document.createElement("template");

sideBarTemplate["innerHTML"] = `
  <style>
    .wrapper { text-align: center; color: white }
    .text { font-size: medium; }
  </style>
  <div class="wrapper">
    <p class="text">Press the share to stage button to share the app to meeting stage.</p>
  </div>
`;

function renderSideBar(elem) {
    elem.appendChild(sideBarTemplate.content.cloneNode(true));
}

// SETTINGS VIEW

const settingsTemplate = document.createElement("template");

settingsTemplate["innerHTML"] = `
  <style>
    .wrapper { text-align: center; color: white }
    .text { font-size: medium; }
  </style>
  <div class="wrapper">
    <p class="text">Press save to create the tab.</p>
  </div>
`;

function renderSettings(elem) {
    elem.appendChild(settingsTemplate.content.cloneNode(true));

    // Save the configurable tab
    pages.config.registerOnSaveHandler((saveEvent) => {
        pages.config.setConfig({
            websiteUrl: window.location.origin,
            contentUrl: window.location.origin + "?inTeams=1&view=content",
            entityId: "TeamsTabApp",
            suggestedDisplayName: "TeamsTabApp",
        });
        saveEvent.notifySuccess();
    });

    // Enable the Save button in config dialog
    pages.config.setValidityState(true);
}

start().catch((error) => console.error(error));
