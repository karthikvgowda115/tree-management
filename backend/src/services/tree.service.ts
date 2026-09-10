import {
  getRootNodes,
  getChildren,
  searchNodes,
  moveNode,
} from "../queries/tree.queries";

export async function getRootTree() {
  return await getRootNodes();
}

export async function getNodeChildren(parentId: number) {
  return await getChildren(parentId);
}

export async function searchTree(search: string) {
  return await searchNodes(search);
}

export async function moveTreeNode(
  nodeId: number,
  newParentId: number | null
) {
  return await moveNode(nodeId, newParentId);
}