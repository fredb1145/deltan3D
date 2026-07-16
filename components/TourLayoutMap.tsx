import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import {
  hasCustomScenePosition,
  normalizeScenePosition,
  type ScenePosition,
} from '../lib/tourScenes';

export type TourLayoutMapNode = {
  id: string;
  label: string;
  roomName?: string | null;
  position?: ScenePosition | null;
};

type Props = {
  nodes: TourLayoutMapNode[];
  activeNodeId?: string | null;
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string) => void;
  onPlaceNode?: (nodeId: string, position: ScenePosition) => void;
  compact?: boolean;
  showLabels?: boolean;
  helperText?: string | null;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function positionToPercent(position?: ScenePosition | null) {
  const normalized = normalizeScenePosition(position);

  return {
    left: clamp((normalized.x + 1) / 2, 0.06, 0.94),
    top: clamp(1 - (normalized.y + 1) / 2, 0.06, 0.94),
  };
}

function pointToPosition(x: number, y: number, width: number, height: number): ScenePosition {
  const horizontalRatio = clamp(x / width, 0, 1);
  const verticalRatio = clamp(y / height, 0, 1);

  return normalizeScenePosition({
    x: horizontalRatio * 2 - 1,
    y: (1 - verticalRatio) * 2 - 1,
  });
}

export default function TourLayoutMap({
  nodes,
  activeNodeId,
  selectedNodeId,
  onSelectNode,
  onPlaceNode,
  compact = false,
  showLabels = !compact,
  helperText,
}: Props) {
  const [boardSize, setBoardSize] = useState({ width: 0, height: 0 });

  const orderedNodes = useMemo(
    () =>
      nodes.map((node, index) => ({
        ...node,
        index,
        percent: positionToPercent(node.position),
        placed: hasCustomScenePosition(node.position),
      })),
    [nodes],
  );

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;

    if (width !== boardSize.width || height !== boardSize.height) {
      setBoardSize({ width, height });
    }
  };

  const handleBoardPress = (event: any) => {
    if (!onPlaceNode || !selectedNodeId || !boardSize.width || !boardSize.height) {
      return;
    }

    const { locationX, locationY } = event.nativeEvent;
    onPlaceNode(selectedNodeId, pointToPosition(locationX, locationY, boardSize.width, boardSize.height));
  };

  const selectedNode = orderedNodes.find(node => node.id === selectedNodeId) || null;
  const hasPlacedNodes = orderedNodes.some(node => node.placed);

  return (
    <Pressable
      onLayout={handleLayout}
      onPress={handleBoardPress}
      style={[styles.board, compact ? styles.boardCompact : styles.boardExpanded]}
    >
      <View style={styles.gridOverlay}>
        <View style={styles.gridHorizontalTop} />
        <View style={styles.gridHorizontalMiddle} />
        <View style={styles.gridHorizontalBottom} />
        <View style={styles.gridVerticalLeft} />
        <View style={styles.gridVerticalMiddle} />
        <View style={styles.gridVerticalRight} />
      </View>

      {!hasPlacedNodes ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Layout Map</Text>
          <Text style={styles.emptyText}>
            {helperText || 'Select a scene, then tap where it belongs.'}
          </Text>
        </View>
      ) : null}

      {orderedNodes.map(node => {
        const isActive = node.id === activeNodeId;
        const isSelected = node.id === selectedNodeId;
        const dotSize = compact ? 22 : 28;

        return (
          <Pressable
            key={node.id}
            onPress={() => onSelectNode?.(node.id)}
            style={[
              styles.markerWrap,
              {
                left: `${node.percent.left * 100}%`,
                top: `${node.percent.top * 100}%`,
                marginLeft: -dotSize / 2,
                marginTop: -dotSize / 2,
              },
            ]}
          >
            <View
              style={[
                styles.markerDot,
                compact ? styles.markerDotCompact : styles.markerDotExpanded,
                isActive ? styles.markerDotActive : null,
                isSelected ? styles.markerDotSelected : null,
              ]}
            >
              <Text
                style={[
                  styles.markerNumber,
                  isActive || isSelected ? styles.markerNumberActive : null,
                ]}
              >
                {node.index + 1}
              </Text>
            </View>

            {showLabels ? (
              <View style={[styles.markerLabel, isSelected ? styles.markerLabelSelected : null]}>
                <Text style={styles.markerLabelTitle} numberOfLines={1}>
                  {node.label}
                </Text>
                {node.roomName ? (
                  <Text style={styles.markerLabelRoom} numberOfLines={1}>
                    {node.roomName}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </Pressable>
        );
      })}

      {selectedNode && onPlaceNode ? (
        <View style={styles.selectionHint}>
          <Text style={styles.selectionHintLabel}>Selected</Text>
          <Text style={styles.selectionHintTitle} numberOfLines={1}>
            {selectedNode.label}
          </Text>
          <Text style={styles.selectionHintText}>Tap anywhere on the map to place it.</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  board: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.2)',
    backgroundColor: '#140307',
  },
  boardExpanded: {
    minHeight: 320,
  },
  boardCompact: {
    minHeight: 138,
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  gridHorizontalTop: {
    position: 'absolute',
    top: '25%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  gridHorizontalMiddle: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(201,168,76,0.1)',
  },
  gridHorizontalBottom: {
    position: 'absolute',
    top: '75%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  gridVerticalLeft: {
    position: 'absolute',
    left: '25%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  gridVerticalMiddle: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(201,168,76,0.1)',
  },
  gridVerticalRight: {
    position: 'absolute',
    left: '75%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  emptyState: {
    position: 'absolute',
    top: 18,
    left: 18,
    right: 18,
    alignItems: 'flex-start',
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    lineHeight: 18,
    maxWidth: 260,
  },
  markerWrap: {
    position: 'absolute',
    alignItems: 'center',
  },
  markerDot: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: '#1A0509',
  },
  markerDotExpanded: {
    width: 28,
    height: 28,
  },
  markerDotCompact: {
    width: 22,
    height: 22,
  },
  markerDotActive: {
    backgroundColor: '#C9A84C',
    borderColor: 'rgba(255,255,255,0.32)',
  },
  markerDotSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C9A84C',
  },
  markerNumber: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  markerNumberActive: {
    color: '#0D0407',
  },
  markerLabel: {
    marginTop: 8,
    backgroundColor: 'rgba(26,5,9,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.16)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 104,
    maxWidth: 150,
  },
  markerLabelSelected: {
    borderColor: 'rgba(201,168,76,0.38)',
  },
  markerLabelTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  markerLabelRoom: {
    color: '#C9A84C',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  selectionHint: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: 'rgba(26,5,9,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.22)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectionHintLabel: {
    color: '#C9A84C',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  selectionHintTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  selectionHintText: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 12,
    marginTop: 4,
  },
});
