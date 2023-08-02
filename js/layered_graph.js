function make_layered_graph(data){
    data = data.slice(0, 10000);
    console.log(data)

    // list all the mentioned people in the data
    let mentioned_people = [];
    data.forEach(d => {
        if (d.is_quote_tweet == "yes") mentioned_people.push(d.quoted_user);
        if (d.is_retweet == "yes") mentioned_people.push(d.retweeted_user);
    })
    mentioned_people = [...new Set(mentioned_people)];
    console.log(mentioned_people)

    let layered_graph_width = window.innerWidth;
    let layered_graph_height = 2000;
    let padding = {
        bottom: 50,
        left: 30,
        right: 20,
        top: 70
    }

    let svg = d3.select("body").append("svg")
        .attr("width", layered_graph_width)
        .attr("height", layered_graph_height)
        .style("border", "1px solid gray")
        .attr("viewBox", [0, 0, layered_graph_width, layered_graph_height])
        .attr("style", "max-width: 100%; height: auto;");

    let mintime = data.map(d => parseInt(d.unix_timestamp)).reduce((a, b) => Math.min(a, b));
    let maxtime = data.map(d => parseInt(d.unix_timestamp)).reduce((a, b) => Math.max(a, b));

    let num_intervals;
    if (!dev_mode){
        num_intervals = 1600;
    } else {
        num_intervals = 10;
    }

    let timestep = parseInt((maxtime - mintime) / num_intervals);

    // bin every entry in the data to the closest time interval
    let binned_data = {}
    data.forEach(d => {
        let bin = Math.floor((d.unix_timestamp - mintime) / timestep) * timestep + mintime;
        if (binned_data[bin] == undefined) binned_data[bin] = [];
        binned_data[bin].push(d);
    })

    let graph = {
        nodes: [],
        links: [],
        node_index: []
    }

    let layer_count = 0;
    for (let i of Object.keys(binned_data).sort((a, b) => parseInt(a) - parseInt(b))){
        let bin = binned_data[i];

        // compute x coordinate based on time
        let x = (i - mintime) / (maxtime - mintime) * (layered_graph_width - padding.left - padding.right);

        let nodes_at_this_layer = graph.nodes.filter(n => n.x == x)
        graph.node_index.push(nodes_at_this_layer);

        // append text with the timestamp at the top, rotated vertically
        svg.append("text")
            .attr("x", x + padding.left + 4)
            .attr("y", padding.top - 5)
            .attr("transform", "rotate(-90 " + (x + padding.left + 4) + " " + (padding.top - 5) + ")")
            .style("font-size", "x-small")
            .style("text-anchor", "start")
            .style("alignment-baseline", "middle")
            .style("fill", "gray")
            .text(i)

        for (let entry of bin){
            entry.x = x;
            entry.y = bin.indexOf(entry) * 5

            // if there does not exist a node with the same author in this layer, add it
            if (nodes_at_this_layer.filter(n => n.author == entry.author).length == 0)
                graph.nodes.push(entry);

            // if it is a retweet of a node in the previous layer
            if (entry.is_retweet == "yes"){
                let retweeted_node = graph.nodes.filter(n => n.author == entry.retweeted_user && n.x == x - timestep)[0];
                if (retweeted_node != undefined){
                    graph.links.push({
                        source: graph.nodes.indexOf(retweeted_node),
                        target: graph.nodes.indexOf(entry)
                    })
                }
            }
        }

        layer_count += 1;
        if (layer_count == 10) break;
    }

    console.log(graph.links)

    for (let node of graph.nodes){
        // draw the node
        svg.append("circle")
            .attr("cx", node.x + padding.left)
            .attr("cy", node.y + padding.top)
            .attr("title", node.author)
            .attr("r", 2)
            .attr("fill", () => {
                if (mentioned_people.includes(node.author)) return "red";
                else return "black";
            })
    }
}