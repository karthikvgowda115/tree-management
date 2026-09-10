import axios from "axios";
import type { TreeNode } from "../types/tree";

const API_URL = "http://localhost:5000/api/tree";

export async function getRootNodes(): Promise<TreeNode[]> {
  const response = await axios.get(`${API_URL}/root`);

  return response.data.data;
}

export async function getChildren(
  parentId: number
): Promise<TreeNode[]> {
  const response = await axios.get(
    `${API_URL}/${parentId}/children`
  );

  return response.data.data;
}

export async function searchNodes(
  query: string
): Promise<TreeNode[]> {
  const response = await axios.get(
    `${API_URL}/search`,
    {
      params: {
        q: query,
      },
    }
  );

  return response.data.data;
}

export async function moveNode(
  nodeId: number,
  newParentId: number | null
): Promise<TreeNode> {
  const response = await axios.patch(
    `${API_URL}/${nodeId}/move`,
    {
      newParentId,
    }
  );

  return response.data.data;
}