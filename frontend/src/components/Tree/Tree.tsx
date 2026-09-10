import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { TreeNode } from "../../types/tree";
import {
  getRootNodes,
  getChildren,
  searchNodes,
  moveNode,
} from "../../services/treeApi";
import "./Tree.css";

type VisibleNode = {
  node: TreeNode;
  level: number;
};

function Tree() {
  const [nodes, setNodes] = useState<TreeNode[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [children, setChildren] = useState<Record<number, TreeNode[]>>({});
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState(false);
  const [draggedNode, setDraggedNode] = useState<TreeNode | null>(null);
  const [error, setError] = useState("");

  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadRootNodes() {
      try {
        setError("");

        const data = await getRootNodes();

        setNodes(data);
      } catch (error) {
        console.error("Failed to load root nodes:", error);
        setError("Failed to load tree");
      } finally {
        setLoading(false);
      }
    }

    loadRootNodes();
  }, []);

  useEffect(() => {
    const query = search.trim();

    if (!query) {
      setSearchResults([]);
      setError("");
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setError("");

        const results = await searchNodes(query);

        setSearchResults(results);
      } catch (error) {
        console.error("Search failed:", error);
        setError("Search failed");
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  async function toggleNode(node: TreeNode) {
    const isExpanded = expanded.has(node.id);

    if (isExpanded) {
      setExpanded((previous) => {
        const next = new Set(previous);

        next.delete(node.id);

        return next;
      });

      return;
    }

    if (!children[node.id]) {
      try {
        setError("");

        const data = await getChildren(node.id);

        setChildren((previous) => ({
          ...previous,
          [node.id]: data,
        }));
      } catch (error) {
        console.error("Failed to load children:", error);
        setError("Failed to load children");
        return;
      }
    }

    setExpanded((previous) => {
      const next = new Set(previous);

      next.add(node.id);

      return next;
    });
  }

  function handleSearch(value: string) {
    setSearch(value);
  }

  async function openSearchResult(node: TreeNode) {
    if (!node.path) return;

    try {
      setError("");

      const ids = node.path
        .split("/")
        .map((id) => Number(id));

      for (let i = 0; i < ids.length - 1; i++) {
        const parentId = ids[i];

        if (!children[parentId]) {
          const data = await getChildren(parentId);

          setChildren((previous) => ({
            ...previous,
            [parentId]: data,
          }));
        }
      }

      setExpanded((previous) => {
        const next = new Set(previous);

        ids
          .slice(0, -1)
          .forEach((id) => next.add(id));

        return next;
      });

      setSearch("");

      parentRef.current?.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      console.error("Failed to open search result:", error);
      setError("Failed to open search result");
    }
  }

  function handleDragStart(node: TreeNode) {
    setDraggedNode(node);
  }

  async function handleDrop(targetNode: TreeNode) {
    if (!draggedNode || moving) return;

    if (draggedNode.id === targetNode.id) {
      setDraggedNode(null);
      return;
    }

    if (draggedNode.parent_id === targetNode.id) {
      setDraggedNode(null);
      return;
    }

    try {
      setMoving(true);
      setError("");

      await moveNode(draggedNode.id, targetNode.id);

      const updatedTargetChildren =
        await getChildren(targetNode.id);

      setChildren((previous) => ({
        ...previous,
        [targetNode.id]: updatedTargetChildren,
      }));

      if (draggedNode.parent_id !== null) {
        const oldParentId = draggedNode.parent_id;

        const updatedOldChildren =
          await getChildren(oldParentId);

        setChildren((previous) => ({
          ...previous,
          [oldParentId]: updatedOldChildren,
        }));
      } else {
        const updatedRoots = await getRootNodes();

        setNodes(updatedRoots);
      }

      setExpanded((previous) => {
        const next = new Set(previous);

        next.add(targetNode.id);

        return next;
      });
    } catch (error) {
      console.error("Failed to move node:", error);
      setError("Failed to move node");
    } finally {
      setMoving(false);
      setDraggedNode(null);
    }
  }

  const visibleNodes = useMemo<VisibleNode[]>(() => {
    const result: VisibleNode[] = [];

    function addNodes(
      list: TreeNode[],
      level: number
    ) {
      for (const node of list) {
        result.push({
          node,
          level,
        });

        if (
          expanded.has(node.id) &&
          children[node.id]
        ) {
          addNodes(
            children[node.id],
            level + 1
          );
        }
      }
    }

    addNodes(nodes, 0);

    return result;
  }, [nodes, expanded, children]);

  const rowVirtualizer = useVirtualizer({
    count: visibleNodes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 10,
  });

  if (loading) {
    return (
      <div className="tree-page">
        <div className="loading-card">
          <div className="spinner" />
          <p>Loading your tree...</p>
        </div>
      </div>
    );
  }

  if (error && nodes.length === 0) {
    return (
      <div className="tree-page">
        <div className="error-card">
          <div className="error-icon">!</div>

          <h3>Something went wrong</h3>

          <p>{error}</p>

          <button
            onClick={() => window.location.reload()}
            className="retry-button"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tree-page">
      <div className="tree-container">
        {/* Header */}
        <div className="tree-header">
          <div>
            <div className="eyebrow">
              HIERARCHY MANAGEMENT
            </div>

            <h1>Tree Management</h1>

            <p>
              Browse, search and reorganize your
              hierarchy effortlessly.
            </p>
          </div>

          <div className="node-count">
            <strong>{visibleNodes.length}</strong>
            <span>visible nodes</span>
          </div>
        </div>

        {/* Search */}
        <div className="search-card">
          <div className="search-wrapper">
            <span className="search-icon">⌕</span>

            <input
              type="text"
              placeholder="Search nodes..."
              value={search}
              onChange={(event) =>
                handleSearch(event.target.value)
              }
            />

            {search && (
              <button
                className="clear-button"
                onClick={() => setSearch("")}
              >
                ×
              </button>
            )}
          </div>

          <div className="search-hint">
            Search across the entire hierarchy
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="error-banner">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* Moving */}
        {moving && (
          <div className="moving-banner">
            <div className="small-spinner" />
            <span>Moving node...</span>
          </div>
        )}

        {/* Search results */}
        {search.trim() ? (
          <div className="content-card">
            <div className="section-header">
              <div>
                <h2>Search Results</h2>

                <p>
                  {searchResults.length} result
                  {searchResults.length !== 1
                    ? "s"
                    : ""}{" "}
                  found
                </p>
              </div>
            </div>

            {searchResults.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">⌕</div>

                <h3>No nodes found</h3>

                <p>
                  Try searching with a different name.
                </p>
              </div>
            ) : (
              <div>
                {searchResults.map((node) => (
                  <div
                    key={node.id}
                    className="search-result"
                    onClick={() =>
                      openSearchResult(node)
                    }
                  >
                    <div className="result-icon">
                      {node.type === "folder"
                        ? "▣"
                        : "•"}
                    </div>

                    <div className="result-content">
                      <div className="result-name">
                        {node.name}
                      </div>

                      {node.hierarchy && (
                        <div className="hierarchy">
                          {node.hierarchy}
                        </div>
                      )}
                    </div>

                    <div className="result-arrow">
                      →
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Tree */
          <div className="content-card">
            <div className="section-header">
              <div>
                <h2>Hierarchy</h2>

                <p>
                  Expand folders to explore
                </p>
              </div>

              <div className="drag-hint">
                ↕ Drag & drop to move
              </div>
            </div>

            <div
              ref={parentRef}
              className="tree-scroll"
            >
              {visibleNodes.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    ◫
                  </div>

                  <h3>No nodes available</h3>
                </div>
              ) : (
                <div
                  style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: "100%",
                    position: "relative",
                  }}
                >
                  {rowVirtualizer
                    .getVirtualItems()
                    .map((virtualRow) => {
                      const item =
                        visibleNodes[
                          virtualRow.index
                        ];

                      const isExpanded =
                        expanded.has(
                          item.node.id
                        );

                      const hasChildren =
                        children[
                          item.node.id
                        ] !== undefined;

                      const isDragging =
                        draggedNode?.id ===
                        item.node.id;

                      return (
                        <div
                          key={item.node.id}
                          className={`tree-row ${
                            isDragging
                              ? "dragging"
                              : ""
                          }`}
                          draggable
                          onDragStart={() =>
                            handleDragStart(
                              item.node
                            )
                          }
                          onDragOver={(event) =>
                            event.preventDefault()
                          }
                          onDrop={() =>
                            handleDrop(
                              item.node
                            )
                          }
                          onClick={() =>
                            toggleNode(
                              item.node
                            )
                          }
                          style={{
                            top: 0,
                            left: 0,
                            height: `${virtualRow.size}px`,
                            transform: `translateY(${virtualRow.start}px)`,
                            paddingLeft: `${
                              item.level * 28 + 16
                            }px`,
                          }}
                        >
                          {item.level > 0 && (
                            <div
                              className="indent-line"
                              style={{
                                left: `${
                                  item.level *
                                    28 +
                                  3
                                }px`,
                              }}
                            />
                          )}

                          <div className="expand-button">
                            {hasChildren ? (
                              isExpanded ? (
                                "⌄"
                              ) : (
                                "›"
                              )
                            ) : (
                              <span className="dot">
                                •
                              </span>
                            )}
                          </div>

                          <div
                            className={`folder-icon ${
                              isExpanded
                                ? "folder-open"
                                : ""
                            }`}
                          >
                            {isExpanded
                              ? "📂"
                              : "📁"}
                          </div>

                          <div className="node-info">
                            <span className="node-name">
                              {item.node.name}
                            </span>

                            <span className="node-type">
                              {item.node.type}
                            </span>
                          </div>

                          <div className="drag-indicator">
                            ⋮⋮
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="tree-footer">
          <span>
            ⚡ Virtualized rendering enabled
          </span>

          <span>
            Lazy loading • Fast search • Drag & drop
          </span>
        </div>
      </div>
    </div>
  );
}

export default Tree;