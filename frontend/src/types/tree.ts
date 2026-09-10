export interface TreeNode {
  id: number;
  parent_id: number | null;
  name: string;
  type: string;
  depth: number;
  path: string;
  created_at: string;
  updated_at: string;
}export interface TreeNode {
  id: number;
  parent_id: number | null;
  name: string;
  type: string;
  depth: number;
  path: string;
  created_at: string;
  updated_at: string;

  // Available for search results
  hierarchy?: string;
}