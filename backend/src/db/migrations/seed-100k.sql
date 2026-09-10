TRUNCATE TABLE nodes RESTART IDENTITY CASCADE;

-- 3 root nodes
INSERT INTO nodes
(parent_id, name, type, depth, path)
VALUES
(NULL, 'Products', 'folder', 0, '1'),
(NULL, 'Categories', 'folder', 0, '2'),
(NULL, 'Organization', 'folder', 0, '3');

-- Create 100,000 nodes
DO $$
DECLARE
    i INTEGER;
    new_id BIGINT;
    parent_id_value BIGINT;
    parent_path TEXT;
    current_depth INTEGER;
BEGIN

    FOR i IN 1..100000 LOOP

        -- Create a balanced hierarchy with depth 1-12
        current_depth := ((i - 1) % 12) + 1;

        -- Use Categories as the parent for level 1
        IF current_depth = 1 THEN

            parent_id_value := 2;
            parent_path := '2';

        ELSE

            -- Pick an existing node from the previous level
            SELECT id, path
            INTO parent_id_value, parent_path
            FROM nodes
            WHERE depth = current_depth - 1
            ORDER BY id
            LIMIT 1;

        END IF;

        INSERT INTO nodes
        (
            parent_id,
            name,
            type,
            depth,
            path
        )
        VALUES
        (
            parent_id_value,

            CASE (i % 6)
                WHEN 0 THEN 'Electronics ' || i
                WHEN 1 THEN 'Clothing ' || i
                WHEN 2 THEN 'Grocery ' || i
                WHEN 3 THEN 'Furniture ' || i
                WHEN 4 THEN 'Accessories ' || i
                ELSE 'Product Group ' || i
            END,

            'folder',
            current_depth,
            parent_path || '/TEMP'
        )
        RETURNING id INTO new_id;

        UPDATE nodes
        SET path = parent_path || '/' || new_id
        WHERE id = new_id;

    END LOOP;

END $$;

-- Verify total
SELECT COUNT(*) AS total_nodes
FROM nodes;

-- Verify depth
SELECT
    depth,
    COUNT(*) AS node_count
FROM nodes
GROUP BY depth
ORDER BY depth;