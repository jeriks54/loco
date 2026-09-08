// Test-only levels; never imported by the production level registry.
export const holeBoard = {
  id: 'test-holes', name: 'Tile workshop', startDir: 'E', memory: 12,
  blocks: ['move', 'turnLeft', 'turnRight', 'loop', 'end'],
  grid: ['################', '#S.H..G........#', '#..............#', '################'],
};
export const holeTrap = {
  ...holeBoard, id: 'test-trap', name: 'No safe route',
  grid: ['#####', '#SHG#', '#####'],
};
