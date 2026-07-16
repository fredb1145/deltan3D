export type ScenePosition = {
  x: number;
  y: number;
};

export type SavedTourNode = {
  id: string;
  label: string;
  imagePath: string;
  previewPath?: string | null;
  imageWidth: number;
  imageHeight: number;
  forward: string | null;
  back: string | null;
  left: string | null;
  right: string | null;
  roomName: string | null;
  position: ScenePosition | null;
};

export type OrderedSceneInput = {
  id: string;
  label: string;
  imagePath: string;
  previewPath?: string | null;
  imageWidth: number;
  imageHeight: number;
  roomName?: string | null;
  position?: ScenePosition | null;
};

export function createSceneId() {
  return `node_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getDefaultSceneLabel(index: number) {
  return `Scene ${index + 1}`;
}

export function normalizeSceneLabel(label: string, index: number) {
  const trimmed = label.trim();
  return trimmed.length ? trimmed : getDefaultSceneLabel(index);
}

export function normalizeRoomName(value: string) {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export function getDefaultScenePosition(): ScenePosition {
  return { x: 0, y: 0 };
}

export function clampSceneAxis(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(-1, Math.min(1, value));
}

export function normalizeScenePosition(position?: ScenePosition | null): ScenePosition {
  if (!position) {
    return getDefaultScenePosition();
  }

  return {
    x: clampSceneAxis(position.x),
    y: clampSceneAxis(position.y),
  };
}

export function hasCustomScenePosition(position?: ScenePosition | null) {
  if (!position) {
    return false;
  }

  const normalized = normalizeScenePosition(position);
  return Math.abs(normalized.x) > 0.04 || Math.abs(normalized.y) > 0.04;
}

export function hasAnySceneLayout(
  scenes: Array<{
    position?: ScenePosition | null;
  }>,
) {
  return scenes.some(scene => hasCustomScenePosition(scene.position));
}

export function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

export function buildOrderedNodes(uploadedScenes: OrderedSceneInput[]): SavedTourNode[] {
  return uploadedScenes.map((scene, index) => ({
    id: scene.id,
    label: scene.label,
    imagePath: scene.imagePath,
    previewPath: scene.previewPath || null,
    imageWidth: scene.imageWidth,
    imageHeight: scene.imageHeight,
    forward: index < uploadedScenes.length - 1 ? uploadedScenes[index + 1].id : null,
    back: index > 0 ? uploadedScenes[index - 1].id : null,
    left: null,
    right: null,
    roomName: normalizeRoomName(scene.roomName || ''),
    position: normalizeScenePosition(scene.position),
  }));
}

export function isSavedTourNode(value: any): value is SavedTourNode {
  return (
    value &&
    typeof value.id === 'string' &&
    typeof value.label === 'string' &&
    typeof value.imagePath === 'string' &&
    value.imagePath.trim().length > 0
  );
}
