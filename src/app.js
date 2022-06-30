import { app, pages } from "@microsoft/teams-js";
import { ge, assignIdChildren } from "./utils";
import { SharedMap } from "fluid-framework";
import { TeamsFluidClient } from "@microsoft/live-share";
import { LOCAL_MODE_TENANT_ID } from "@fluidframework/azure-client";
import { InsecureTokenProvider } from "@fluidframework/test-client-utils";

const searchParams = new URL(window.location).searchParams;
const root = document.getElementById("content");
const containerSchema = {
    initialObjects: {
        colorsMap: SharedMap,
    },
};

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
            const { container } = await joinContainer();
            renderStage(root, container.initialObjects.colorsMap);
            break;
    }
}

async function joinContainer() {
    // Are we running in teams?
    let client;
    if (!!searchParams.get("inTeams")) {
        // Create client
        client = new TeamsFluidClient();
    } else {
        // Create client and configure for testing
        client = new TeamsFluidClient({
            connection: {
                tenantId: LOCAL_MODE_TENANT_ID,
                tokenProvider: new InsecureTokenProvider("", { id: "123", name: "Test User" }),
                orderer: "http://localhost:7070",
                storage: "http://localhost:7070",
            },
        });
    }

    // Join container
    try {
        const results = await client.joinContainer(
            containerSchema,
            /* onContainerFirstCreated */ (container) => {
                console.log(container);
            }
        );
        return results;
    } catch (e) {
        console.log(`error ${e}`);
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

function renderStage(elem, colorsMap) {
    elem.appendChild(stageTemplate.content.cloneNode(true));
    ge("loadArtButton").addEventListener("click", () => {
        loadArt(ge("artCode").value);
    });
    // paint();
    paintTogether(colorsMap);
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

function paintTogether(colorsMap) {
    const paint = (color, id) => {
        const artElement = ge(id);
        console.log(`${id} ${artElement}`);
        artElement.style.fill = color;
    };
    const setStateFn = createSharedStateCollection(colorsMap, "artElement", paint);
    document.addEventListener("click", (event) => {
        console.log(event);
        if (event.srcElement.id.indexOf("artElement") === 0) {
            const color = ge("color").value;
            setStateFn(color, event.srcElement.id);
        }
    });
}

function createSharedStateCollection(map, collectionKey, onChange) {
    const isValidKey = (changedKey) => changedKey.indexOf(collectionKey) === 0;

    map.on("valueChanged", (...args) => {
        const changedKey = args[0].key;
        if (isValidKey(changedKey)) {
            onChange(map.get(changedKey), changedKey);
        }
    });
    return (value, key) => {
        map.set(key, value);
    };
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
            entityId: "Paint live share",
            suggestedDisplayName: "Paint live share",
        });
        saveEvent.notifySuccess();
    });

    // Enable the Save button in config dialog
    pages.config.setValidityState(true);
}

start().catch((error) => console.error(error));
