import type { SavedTourNode, ScenePosition } from './tourScenes';

export type MovementMarker = {
  targetId: string;
  label: string;
  icon: 'arrow-up' | 'arrow-down' | 'arrow-forward' | 'arrow-back';
  anchorX: number;
  anchorY: number;
  primary: boolean;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getRoomName(node: SavedTourNode) {
  if (!node.roomName) {
    return null;
  }

  const trimmed = node.roomName.trim();
  return trimmed.length ? trimmed : null;
}

function getPosition(node: SavedTourNode): ScenePosition {
  if (!node.position) {
    return { x: 0, y: 0 };
  }

  return {
    x: clamp(node.position.x, -1, 1),
    y: clamp(node.position.y, -1, 1),
  };
}

function areSameRoom(a: SavedTourNode, b: SavedTourNode) {
  const roomA = getRoomName(a);
  const roomB = getRoomName(b);

  if (!roomA || !roomB) {
    return false;
  }

  return roomA.toLowerCase() === roomB.toLowerCase();
}

function getDistance(a: SavedTourNode, b: SavedTourNode) {
  const positionA = getPosition(a);
  const positionB = getPosition(b);
  const dx = positionB.x - positionA.x;
  const dy = positionB.y - positionA.y;

  return Math.sqrt(dx * dx + dy * dy);
}

function getMarkerIcon(dx: number, dy: number): MovementMarker['icon'] {
  if (Math.abs(dy) >= Math.abs(dx)) {
    return dy >= 0 ? 'arrow-up' : 'arrow-down';
  }

  return dx >= 0 ? 'arrow-forward' : 'arrow-back';
}

function getFallbackAnchor(
  relation: 'next' | 'previous',
  isSameRoom: boolean,
): Pick<MovementMarker, 'anchorX' | 'anchorY' | 'icon'> {
  if (relation === 'next') {
    return { anchorX: 0.5, anchorY: 0.42, icon: 'arrow-up' };
  }

  return isSameRoom
    ? { anchorX: 0.32, anchorY: 0.64, icon: 'arrow-back' }
    : { anchorX: 0.22, anchorY: 0.68, icon: 'arrow-back' };
}

function buildMarkerFromTarget(params: {
  currentNode: SavedTourNode;
  targetNode: SavedTourNode;
  relation: 'next' | 'previous' | 'nearby';
  primary: boolean;
}): MovementMarker {
  const { currentNode, targetNode, relation, primary } = params;
  const currentPosition = getPosition(currentNode);
  const targetPosition = getPosition(targetNode);
  const dx = targetPosition.x - currentPosition.x;
  const dy = targetPosition.y - currentPosition.y;
  const sameRoom = areSameRoom(currentNode, targetNode);
  const roomName = getRoomName(targetNode);

  const useRelativePlacement =
    sameRoom && (Math.abs(dx) >= 0.1 || Math.abs(dy) >= 0.1 || relation === 'nearby');

  const anchor = useRelativePlacement
    ? {
        anchorX: clamp(0.5 + dx * 0.26, 0.18, 0.82),
        anchorY: clamp(0.64 - dy * 0.2, 0.24, 0.76),
        icon: getMarkerIcon(dx, dy),
      }
    : getFallbackAnchor(relation === 'previous' ? 'previous' : 'next', sameRoom);

  return {
    targetId: targetNode.id,
    label: sameRoom ? targetNode.label : roomName || targetNode.label,
    icon: anchor.icon,
    anchorX: anchor.anchorX,
    anchorY: anchor.anchorY,
    primary,
  };
}

export function buildMovementMarkers(
  nodes: SavedTourNode[],
  currentNodeId: string,
): MovementMarker[] {
  const currentIndex = nodes.findIndex(node => node.id === currentNodeId);

  if (currentIndex < 0) {
    return [];
  }

  const currentNode = nodes[currentIndex];
  const previousNode = currentIndex > 0 ? nodes[currentIndex - 1] : null;
  const nextNode = currentIndex < nodes.length - 1 ? nodes[currentIndex + 1] : null;

  const markerMap = new Map<string, MovementMarker>();

  if (nextNode) {
    markerMap.set(
      nextNode.id,
      buildMarkerFromTarget({
        currentNode,
        targetNode: nextNode,
        relation: 'next',
        primary: true,
      }),
    );
  }

  if (previousNode) {
    markerMap.set(
      previousNode.id,
      buildMarkerFromTarget({
        currentNode,
        targetNode: previousNode,
        relation: 'previous',
        primary: false,
      }),
    );
  }

  const sameRoomCandidates = nodes
    .filter(node => node.id !== currentNode.id)
    .filter(node => areSameRoom(currentNode, node))
    .sort((a, b) => getDistance(currentNode, a) - getDistance(currentNode, b))
    .slice(0, 4);

  sameRoomCandidates.forEach(node => {
    if (markerMap.has(node.id)) {
      return;
    }

    markerMap.set(
      node.id,
      buildMarkerFromTarget({
        currentNode,
        targetNode: node,
        relation: 'nearby',
        primary: false,
      }),
    );
  });

  return [...markerMap.values()].slice(0, 4);
}
