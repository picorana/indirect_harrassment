function draw_graphviz(graph){
    let s = `
    digraph G {
        compound=true;
        rankdir=LR;
        fontname = "Helvetica";
    `

    for (let i in graph.node_index){
        let node_index = graph.node_index[i];

        for (let node of node_index){
            if (node.type == "layer_marker") s += `${node.id} [style=invis, fixedsize=true, width=0.1, height=0.1, label=""]\n`
            else s += `${node.id} [fixedsize=true, width=0.1, height=0.1, fontname="Helvetica", label=${node.label}]\n`
        }
    }

    for (let link of graph.links){
        if (link.nodes[0] == undefined || link.nodes[1] == undefined) continue;

        // // if the link is a retweet, make it dashed
        if (link.type == "retweet") s += `${link.nodes[0].id} -> ${link.nodes[1].id} [style=dashed, dir=none];\n`
        if (link.type == "layer_marker_edge") s += `${link.nodes[0].id} -> ${link.nodes[1].id} [style=invis, dir=none];\n`
        else s += `${link.nodes[0].id} -> ${link.nodes[1].id} [dir=none];\n`
    }
    s += `}`

    console.log(s)

    d3.select("#graph").graphviz().zoom(false).renderDot(s);
}