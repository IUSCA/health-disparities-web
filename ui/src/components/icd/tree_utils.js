function createTree(nodes) {
  // convert path '1.2.3' to ['1', '2', '3'] in each node
  nodes.forEach((node) => {
    node.path = node.path.split(".");
  });

  const id_node_map = nodes.reduce((acc, node) => {
    acc[node.concept_id] = node;
    return acc;
  }, {});
  const tree = {
    children: {},
  };
  // for each node in the list
  // navigate to the parent node
  // add the node to the parent's children
  // if the parent is in id_node_map and not in the tree, add it
  // if the parent is not in id_node_map, add the node to the root
  nodes.forEach((node) => {
    let current = tree; // start from root
    const path = node.path;

    // iterate through parent chain
    for (let i = 0; i < path.length - 1; i++) {
      const id = path[i];
      if (!id_node_map[id]) {
        continue;
      }
      if (!current.children[id]) {
        current.children[id] = {
          data: null,
          children: {},
        };
      }
      current = current.children[id];
    }

    const id = node.concept_id;
    if (current.children[id]) {
      // already created
      current.children[id].data = node;
    } else {
      // create new
      current.children[id] = {
        data: node,
        children: {},
      };
    }
  });
  return tree;
}

function formatTree(root) {
  // convert {children: {1: {data: null, children: {}}}} to [{concept_id: 1, children: []}]
  const formattedChildren = Object.values(root.children)
    .map(formatTree)
    .sort((a, b) => {
      try {
        return a.concept_code.localeCompare(b.concept_code);
      } catch (e) {
        console.log("error", a, b);
      }
    });
  return {
    ...root.data,
    ...(formattedChildren.length > 0 ? { children: formattedChildren } : {}),
  };
}

export { createTree, formatTree };
