import type {
  WorkspaceAPI as SdkWorkspaceAPI,
  ModelObjects as SdkModelObjects,
  ModelObjectIds,
  ObjectProperties,
} from 'trimble-connect-workspace-api';

export type { SdkModelObjects as ModelObjects, ObjectProperties, ModelObjectIds };

// Thin facade over the SDK WorkspaceAPI exposing only what Direction 1 needs.
export interface WorkspaceAPI {
  viewer: {
    getObjects(): Promise<SdkModelObjects[]>;
    getObjectProperties(modelId: string, objectRuntimeIds: number[]): Promise<ObjectProperties[]>;
    setObjectState(
      selector: { modelObjectIds: ModelObjectIds[] } | undefined,
      state: { color?: string; visible?: boolean },
    ): Promise<void>;
    /** Resets all object colors and visibility. */
    resetAllObjectState(): Promise<void>;
    /** Zooms camera to fit the given objects. */
    zoomTo(modelObjectIds: ModelObjectIds[]): Promise<void>;
    getSelection(): Promise<ModelObjectIds[]>;
  };
}

// Adapt the real SDK WorkspaceAPI to our thin facade.
function wrapSdkApi(sdk: SdkWorkspaceAPI): WorkspaceAPI {
  return {
    viewer: {
      getObjects: () => sdk.viewer.getObjects(),
      getObjectProperties: (modelId, ids) => sdk.viewer.getObjectProperties(modelId, ids),
      setObjectState: (selector, state) =>
        sdk.viewer.setObjectState(selector, state as Parameters<typeof sdk.viewer.setObjectState>[1]),
      resetAllObjectState: () =>
        sdk.viewer.setObjectState(undefined, { color: 'reset' as const, visible: 'reset' as const }),
      zoomTo: (modelObjectIds) =>
        sdk.viewer.setCamera({ modelObjectIds } as Parameters<typeof sdk.viewer.setCamera>[0]),
      getSelection: () => sdk.viewer.getSelection() as Promise<ModelObjectIds[]>,
    },
  };
}

// Connect to the host Trimble Connect viewer inside the iframe.
export async function connectToWorkspace(): Promise<WorkspaceAPI> {
  const Workspace = await import('trimble-connect-workspace-api');
  const sdk = await Workspace.connect(window.parent, undefined, 4000);
  // When not inside a Connect iframe the SDK resolves with an empty {} instead
  // of rejecting — check for a real viewer before accepting.
  if (!sdk?.viewer) throw new Error('Not inside a Trimble Connect iframe');
  return wrapSdkApi(sdk);
}

// ---------------------------------------------------------------------------
// Mock API — used when running outside Connect (local dev).
// ---------------------------------------------------------------------------
type ElementType = 'Wall' | 'Floor' | 'Column' | 'Beam' | 'Window' | 'Roof' | 'Door';
type Material = 'Concrete' | 'Steel' | 'Glass' | 'Wood' | 'Masonry';
const ELEMENT_TYPES: ElementType[] = ['Wall', 'Floor', 'Column', 'Beam', 'Window', 'Roof', 'Door'];
const MATERIALS: Material[] = ['Concrete', 'Steel', 'Glass', 'Wood', 'Masonry'];
const LEVELS = ['Level 01 — Lobby', 'Level 02 — Office', 'Level 03 — Roof'];
const COUNTS = [42, 8, 24, 36, 51, 6, 14];

function makeMockObjects(): SdkModelObjects[] {
  let globalId = 0;
  const objects: ObjectProperties[] = [];
  for (let ti = 0; ti < ELEMENT_TYPES.length; ti++) {
    for (let c = 0; c < COUNTS[ti]; c++) {
      const id = globalId++;
      objects.push({
        id,
        class: ELEMENT_TYPES[ti],
        properties: [
          {
            name: 'Object properties',
            properties: [
              { name: 'Element type', value: ELEMENT_TYPES[ti], type: 5 },
              { name: 'Material', value: MATERIALS[id % MATERIALS.length], type: 5 },
              { name: 'Level', value: LEVELS[id % LEVELS.length], type: 5 },
              { name: 'Cost (USD)', value: id * 412 + 800, type: 7 },
            ],
          },
        ],
      });
    }
  }
  return [{ modelId: 'arch-r12', objects }];
}

const MOCK_MODEL_OBJECTS = makeMockObjects();

export const mockAPI: WorkspaceAPI = {
  viewer: {
    async getObjects() {
      await delay(350);
      return MOCK_MODEL_OBJECTS;
    },
    async getObjectProperties(modelId, objectRuntimeIds) {
      await delay(50);
      const model = MOCK_MODEL_OBJECTS.find(m => m.modelId === modelId);
      return (model?.objects ?? []).filter(o => objectRuntimeIds.includes(o.id));
    },
    async setObjectState() { await delay(5); },
    async resetAllObjectState() { await delay(10); },
    async zoomTo() { await delay(10); },
    async getSelection() { return []; },
  },
};

function delay(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms));
}
