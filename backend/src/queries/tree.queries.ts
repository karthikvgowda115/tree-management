import pool from "../config/database";

export async function getRootNodes() {
  const result = await pool.query(`
    SELECT
      id,
      parent_id,
      name,
      type,
      depth,
      path,
      created_at,
      updated_at
    FROM nodes
    WHERE parent_id IS NULL
    ORDER BY name ASC
  `);

  return result.rows;
}

export async function getChildren(parentId: number) {
  const result = await pool.query(
    `
    SELECT
      id,
      parent_id,
      name,
      type,
      depth,
      path,
      created_at,
      updated_at
    FROM nodes
    WHERE parent_id = $1
    ORDER BY name ASC
    `,
    [parentId]
  );

  return result.rows;
}

export async function searchNodes(search: string) {
  const result = await pool.query(
    `
    WITH RECURSIVE node_tree AS (
      SELECT
        id,
        parent_id,
        name,
        type,
        depth,
        path,
        created_at,
        updated_at,
        name::text AS hierarchy
      FROM nodes
      WHERE parent_id IS NULL

      UNION ALL

      SELECT
        child.id,
        child.parent_id,
        child.name,
        child.type,
        child.depth,
        child.path,
        child.created_at,
        child.updated_at,
        node_tree.hierarchy || ' / ' || child.name
      FROM nodes child
      INNER JOIN node_tree
        ON child.parent_id = node_tree.id
    )

    SELECT
      id,
      parent_id,
      name,
      type,
      depth,
      path,
      created_at,
      updated_at,
      hierarchy
    FROM node_tree
    WHERE name ILIKE $1
    ORDER BY name ASC
    LIMIT 100
    `,
    [`%${search}%`]
  );

  return result.rows;
}

export async function moveNode(
  nodeId: number,
  newParentId: number | null
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Get node being moved
    const nodeResult = await client.query(
      `
      SELECT
        id,
        parent_id,
        depth,
        path
      FROM nodes
      WHERE id = $1
      `,
      [nodeId]
    );

    if (nodeResult.rows.length === 0) {
      throw new Error("Node not found");
    }

    const node = nodeResult.rows[0];

    // Cannot move node into itself
    if (newParentId === nodeId) {
      throw new Error(
        "A node cannot be moved inside itself"
      );
    }

    let newDepth = 0;
    let newPath = String(nodeId);

    // Moving under another parent
    if (newParentId !== null) {
      const parentResult = await client.query(
        `
        SELECT
          id,
          depth,
          path
        FROM nodes
        WHERE id = $1
        `,
        [newParentId]
      );

      if (parentResult.rows.length === 0) {
        throw new Error("New parent not found");
      }

      const parent = parentResult.rows[0];

      // Prevent circular hierarchy
      if (
        parent.path === node.path ||
        parent.path.startsWith(`${node.path}/`)
      ) {
        throw new Error(
          "A node cannot be moved inside its own descendant"
        );
      }

      newDepth = parent.depth + 1;
      newPath = `${parent.path}/${nodeId}`;
    }

    const oldPath = node.path;
    const oldDepth = node.depth;

    // Update moved node
    await client.query(
      `
      UPDATE nodes
      SET
        parent_id = $1,
        depth = $2,
        path = $3,
        updated_at = NOW()
      WHERE id = $4
      `,
      [
        newParentId,
        newDepth,
        newPath,
        nodeId,
      ]
    );

    // Update all descendants
    await client.query(
      `
      UPDATE nodes
      SET
        depth = depth + $1::INTEGER,
        path = $2::TEXT || SUBSTRING(
          path FROM $3::INTEGER
        ),
        updated_at = NOW()
      WHERE path LIKE $4::TEXT || '/%'
      `,
      [
        newDepth - oldDepth,
        newPath,
        oldPath.length + 1,
        oldPath,
      ]
    );

    await client.query("COMMIT");

    return {
      id: nodeId,
      parent_id: newParentId,
      depth: newDepth,
      path: newPath,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function createNode(
  name: string,
  parentId: number | null,
  type: string = "folder"
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let depth = 0;
    let path = "";

    // Get parent information
    if (parentId !== null) {
      const parentResult = await client.query(
        `
        SELECT
          depth,
          path
        FROM nodes
        WHERE id = $1
        `,
        [parentId]
      );

      if (parentResult.rows.length === 0) {
        throw new Error(
          "Parent node not found"
        );
      }

      const parent = parentResult.rows[0];

      depth = parent.depth + 1;
    }

    // Create node
    const result = await client.query(
      `
      INSERT INTO nodes
      (
        parent_id,
        name,
        type,
        depth,
        path
      )
      VALUES ($1, $2, $3, $4, '')
      RETURNING id
      `,
      [
        parentId,
        name,
        type,
        depth,
      ]
    );

    const newNodeId = result.rows[0].id;

    // Build path
    if (parentId !== null) {
      const parentResult = await client.query(
        `
        SELECT path
        FROM nodes
        WHERE id = $1
        `,
        [parentId]
      );

      path =
        `${parentResult.rows[0].path}/${newNodeId}`;
    } else {
      path = String(newNodeId);
    }

    // Save path
    const updated = await client.query(
      `
      UPDATE nodes
      SET
        path = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING *
      `,
      [
        path,
        newNodeId,
      ]
    );

    await client.query("COMMIT");

    return updated.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}