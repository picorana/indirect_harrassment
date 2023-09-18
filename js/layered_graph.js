function sort_nodes(graph){
    // use barycentric method
    let max_iterations = 20;

    for (let node of graph.nodes){
        node.neighbors_forward = graph.nodes.filter(n => graph.links.find(e => e.source == node && e.target == n) != undefined);
        node.neighbors_backward = graph.nodes.filter(n => graph.links.find(e => e.source == n && e.target == node) != undefined);
    }

    for (let i = 0; i < max_iterations; i++){
        
        // reset all the w
        for (let node of graph.nodes) node.w = -1;

        if (i % 2 == 0){
            for (let j = 0; j < graph.node_index.length - 1; j++){
                for (let k in graph.node_index[j]){
                    let node = graph.node_index[j][k];
                    let indices_of_neighbors_forward = node.neighbors_forward.map(n => graph.node_index[j + 1].indexOf(n));
                    node.w = indices_of_neighbors_forward.reduce((a, b) => a + b, 0) / indices_of_neighbors_forward.length;
                    // console.log(indices_of_neighbors_forward, node.w)
                }
                graph.node_index[j].sort((a, b) => {
                    // console.log(graph.node_index[j].indexOf(a), a.w, graph.node_index[j].indexOf(b), b.w)
                    return a.w - b.w;
                });
            }
        } else {
            for (let j = graph.node_index.length - 1; j > 0; j--){
                for (let k in graph.node_index[j]){
                    let node = graph.node_index[j][k];
                    let indices_of_neighbors_backward = node.neighbors_backward.map(n => graph.node_index[j - 1].indexOf(n));
                    
                    node.w = indices_of_neighbors_backward.reduce((a, b) => a + b, 0) / indices_of_neighbors_backward.length;
                    
                }
                graph.node_index[j].sort((a, b) => a.w - b.w);
            }
        }
    }
}

async function make_layered_graph(data){
    // list all the mentioned people in the data
    let mentioned_people = [];
    data.forEach(d => {
        if (d.is_quote_tweet == "yes") mentioned_people.push(d.quoted_user);
        if (d.is_retweet == "yes") mentioned_people.push(d.retweeted_user);
        if (d.is_reply == "yes") mentioned_people.push(d.replied_user);
    })
    mentioned_people = [...new Set(mentioned_people)];
    console.log("quoted or retweeted people", mentioned_people)

    // some general settings
    let layered_graph_width = window.innerWidth*2;
    let layered_graph_height = 8000;
    let padding = {
        bottom: 50,
        left: 30,
        right: 20,
        top: 70
    }
    let node_radius = 2;
    let node_vertical_spacing = 6;

    let max_sub_node_cols = 16;

    let svg = d3.select("body").append("svg")
        .attr("width", layered_graph_width)
        .attr("height", layered_graph_height)
        .style("border", "1px solid gray")
        .attr("viewBox", [0, 0, layered_graph_width, layered_graph_height])
        // .attr("style", "max-width: 100%; height: auto;");

    let mintime = data.map(d => parseInt(d.unix_timestamp)).reduce((a, b) => Math.min(a, b));
    let maxtime = data.map(d => parseInt(d.unix_timestamp)).reduce((a, b) => Math.max(a, b));

    let num_intervals = 50;

    let timestep = parseInt((maxtime - mintime) / num_intervals);

    // bin every entry in the data to the closest time interval
    let binned_data = {}
    for (let i = mintime; i <= maxtime; i += timestep){
        let data_in_this_bin = data.filter(d => d.unix_timestamp >= i && d.unix_timestamp < i + timestep);
        binned_data[i] = data_in_this_bin;
    }

    let graph = {
        nodes: [],
        links: [],
        node_index: []
    }

    let first_appearance = {};
    let last_appearance = {};

    let layer_count = 0;
    for (let i of Object.keys(binned_data).sort((a, b) => parseInt(a) - parseInt(b))){
        let bin = binned_data[i];

        // compute x coordinate based on time
        let x = (i - mintime) / (maxtime - mintime) * (layered_graph_width - padding.left - padding.right);

        let nodes_at_this_layer = [];
        graph.node_index.push(nodes_at_this_layer);

        let date = new Date((parseInt(i) + timestep) * 1000);

        // append text with the timestamp at the top, rotated vertically
        svg.append("text")
            .attr("x", x + padding.left + 4)
            .attr("y", padding.top - 5)
            .attr("transform", "rotate(-90 " + (x + padding.left + 4) + " " + (padding.top - 5) + ")")
            .style("font-size", "x-small")
            .style("text-anchor", "start")
            .style("alignment-baseline", "middle")
            .style("fill", "gray")
            .text((date.getMonth() + 1) + "/" + date.getDate() + " " + date.getHours() + ":" + date.getMinutes())

        let tweets_from_mentioned_people = bin.filter(d => mentioned_people.includes(d.author));
        for (let entry of tweets_from_mentioned_people){
            // if there is no node with the same author in this layer, add it
            if (nodes_at_this_layer.filter(n => n.author == entry.author).length == 0){
                entry.x = x;
                entry.id = graph.nodes.length;
                graph.nodes.push(entry);
                nodes_at_this_layer.push(entry);
            } else {
                // if there is a node with the same author in this layer, add this entry to the sub_entries of that node
                let node = nodes_at_this_layer.filter(n => n.author == entry.author)[0];
                if (node.other_tweets == undefined) node.other_tweets = [];
                node.other_tweets.push(entry);
            }
        }

        for (let node of bin){
            if (node.retweeted_user != undefined && node.retweeted_user != "") node.mentioned_person = node.retweeted_user;
            if (node.quoted_user != undefined && node.quoted_user != "") node.mentioned_person = node.quoted_user;
            if (node.replied_user != undefined && node.replied_user != "") node.mentioned_person = node.replied_user;

            if (mentioned_people.includes(node.author)){
                if (first_appearance[node.author] == undefined){
                    first_appearance[node.author] = layer_count;
                }

                last_appearance[node.author] = layer_count;
            }
        }

        let mentioned_people_in_this_bin = [... new Set(bin.filter(d => !mentioned_people.includes(d.author)).map(n => {
            return n.mentioned_person;
        }))];

        for (let mentioned_person of mentioned_people_in_this_bin){
            let new_node = {}
            new_node.x = x;
            new_node.id = graph.nodes.length;
            new_node.mentioned_person = mentioned_person;
            new_node.sub_entries = bin.filter(d => d.mentioned_person == mentioned_person);
            graph.nodes.push(new_node);
            nodes_at_this_layer.push(new_node);

            if (layer_count > 0){
                graph.links.push({
                    target: new_node,
                    source: graph.node_index[layer_count - 1].filter(n => n.author == new_node.mentioned_person)[0],
                    type: "retweet"
                })
            }

            if (first_appearance[mentioned_person] == undefined){
                first_appearance[mentioned_person] = layer_count - 1;
            }

            if (last_appearance[mentioned_person] == undefined || last_appearance[mentioned_person] < layer_count - 1){
                last_appearance[mentioned_person] = layer_count - 1;
            }
        }

        // include a node for every mentioned person, specifying that it's an anchor node in case it doesn't exist in this layer
        for (let mentioned_person of mentioned_people){
            if (nodes_at_this_layer.filter(n => n.author == mentioned_person).length == 0){
                let new_node = {
                    x: x,
                    id: graph.nodes.length,
                    author: mentioned_person,
                    type: "anchor",
                    value: 1
                }
                graph.nodes.push(new_node);
                nodes_at_this_layer.push(new_node);
            }
        }

        layer_count += 1;
        // if (layer_count == 10) break;
    }

    for (let i in graph.node_index){
        if (i == 0) continue;
        for (let node of graph.node_index[i]){
            if (!mentioned_people.includes(node.author)) continue;
            if (graph.node_index[i-1].find(n => n.author == node.author)){
                let n  = graph.node_index[i-1].find(n => n.author == node.author);
                graph.links.push({
                    source: n,
                    target: node,
                })
            }
        }
    }

    console.log(graph);

    // update node height for all nodes
    for (let node of graph.nodes){
        node.height = 2;
        if (node.sub_entries != undefined && node.sub_entries.length > 1){
            let node_cols = Math.min(Math.floor(Math.sqrt(node.sub_entries.length)), max_sub_node_cols);
            node.node_cols = node_cols;
            // console.log(node_cols, node.sub_entries.length, node.sub_entries.length / node_cols);
            node.height = Math.ceil(node.sub_entries.length / node_cols) + 1;
        }
    }

    console.log(first_appearance)

    for (let j in graph.node_index){
        let node_index = graph.node_index[j];
        let nodes_to_remove = [];
        for (let i in node_index){
            let node = node_index[i];

            // if the node is not an anchor, continue
            if (node.type != "anchor") continue;

            // console.log(node.author, first_appearance[node.author], j)

            // check the first appearance of this node, if it is less than i, remove the node
            if (first_appearance[node.author] > j || first_appearance[node.author] == undefined){
                // console.log("removed", node.author)
                nodes_to_remove.push(node);
            }
        }

        for (let node of nodes_to_remove){
            graph.nodes.splice(graph.nodes.indexOf(node), 1);
            node_index.splice(node_index.indexOf(node), 1);
            graph.links = graph.links.filter(l => l.source != node && l.target != node);
        }
        // break;
    }

    // remove nodes afer last appearance
    for (let j in graph.node_index){
        let node_index = graph.node_index[j];
        let nodes_to_remove = [];
        for (let i in node_index){
            let node = node_index[i];

            // if the node is not an anchor, continue
            if (node.type != "anchor") continue;

            // console.log(node.author, first_appearance[node.author], j)

            // check the first appearance of this node, if it is less than i, remove the node
            if (last_appearance[node.author] < j || last_appearance[node.author] == undefined){
                // console.log("removed", node.author)
                nodes_to_remove.push(node);
            }
        }

        for (let node of nodes_to_remove){
            graph.nodes.splice(graph.nodes.indexOf(node), 1);
            node_index.splice(node_index.indexOf(node), 1);
            graph.links = graph.links.filter(l => l.source != node && l.target != node);
        }
        // break;
    }

    // sort_nodes(graph);
    draw_graphviz(graph);

    // recompute the y for every node
    for (let node_index of graph.node_index){
        for (let node of node_index){
            let prev_nodes = node_index.filter(n => node_index.indexOf(n) < node_index.indexOf(node))
            node.y = prev_nodes.map(n => {
                return n.height;
            }).reduce((a, b) => a + b, 0) * node_vertical_spacing;
        }
    }

    console.log("total nodes:", graph.nodes.length)
    console.log("total nodes and sub-entries:", graph.nodes.filter(n => n.sub_entries != undefined).map(n => n.sub_entries.length).reduce((a, b) => a + b, 0))

    // draw the links
    for (let link of graph.links){
        if (link.target.sub_entries != undefined && link.target.sub_entries.length > 1){
            let pad = 8;

            // middle between top and bottom
            let mid_point = link.target.y + 0.5 * (link.target.height - 2) * node_vertical_spacing;

            svg.append("line")
            .attr("x1", link.source.x + padding.left)
            .attr("y1", link.source.y + padding.top)
            .attr("x2", link.target.x - pad + padding.left)
            .attr("y2", mid_point + padding.top)
            .attr("stroke", link.type == "retweet"? "gray" : "black")
            .attr("stroke-width", link.type == "retweet" ? 0.5 : 1)
            .attr("stroke-opacity", link.type == "retweet" ? 0.8 : 1)

            svg.append("line")
            .attr("x1", link.target.x - pad + padding.left)
            .attr("y1", link.target.y - node_radius + padding.top)
            .attr("x2", link.target.x - pad + padding.left)
            .attr("y2", link.target.y + (link.target.height - 1) * node_vertical_spacing + padding.top)
            .attr("stroke", link.type == "retweet"? "gray" : "black")
            .attr("stroke-width", link.type == "retweet" ? 0.5 : 1)
            .attr("stroke-opacity", link.type == "retweet" ? 0.8 : 1)
        } else {
            if (link.source == undefined) continue;

            svg.append("line")
            .attr("x1", link.source.x + padding.left)
            .attr("y1", link.source.y + padding.top)
            .attr("x2", link.target.x + padding.left)
            .attr("y2", link.target.y + padding.top)
            .attr("stroke", link.type == "retweet"? "gray" : "black")
            .attr("stroke-width", link.type == "retweet" ? 0.5 : 1)
            .attr("stroke-opacity", link.type == "retweet" ? 0.8 : 1)
            .attr("stroke-dasharray", link.type == "retweet" ? "0, 0" : "1, 10")
        }
    }

    for (let node of graph.nodes){

        if (node.sub_entries != undefined && node.sub_entries.length > 1){
            for (let i in node.sub_entries){
                let sub_entry = node.sub_entries[i];

                let sub_entry_column = i % node.node_cols;

                // if (i < node.sub_entries.length/2){
                    svg.append("circle")
                    .datum(sub_entry)
                    .attr("cx", node.x + sub_entry_column*4 + padding.left - 3)
                    .attr("cy", node.y + Math.floor(i/node.node_cols) * node_vertical_spacing + padding.top)
                    .attr("title", sub_entry.author)
                    .attr("r", node_radius/1.5)
                    .attr("fill", (d) => {
                        if (node.type == "anchor") return "pink";
                        if (mentioned_people.includes(d.author)) return "red";
                        else return "black";
                    })
                    .on("mouseover", function(event, d){
                        // print the node
                        console.log(d)
                    })
                // } else {
                //     svg.append("circle")
                //     .datum(sub_entry)
                //     .attr("cx", node.x + padding.left + 3)
                //     .attr("cy", node.y + (i - node.sub_entries.length/2) * node_vertical_spacing + padding.top)
                //     .attr("title", sub_entry.author)
                //     .attr("r", node_radius/1.5)
                //     .attr("fill", (d) => {
                //         if (node.type == "anchor") return "pink";
                //         if (mentioned_people.includes(d.author)) return "red";
                //         else return "black";
                //     })
                //     .on("mouseover", function(event, d){
                //         // print the node
                //         console.log(d)
                //     })
                // }
                
            }
        } else {
            // draw the node
            svg.append("circle")
            .datum(node)
            .attr("cx", node.x + padding.left)
            .attr("cy", node.y + padding.top)
            .attr("title", node.author)
            .attr("r", d => (node.type != undefined && node.type == "anchor")? node_radius : node_radius*1.5)
            .attr("fill", () => {
                if (node.type == "anchor") return "pink";
                if (mentioned_people.includes(node.author)) return "red";
                else return "black";
            })
            .on("mouseover", function(event, d){
                // print the node
                console.log(d)
            })
        }

        
    }

    
}

