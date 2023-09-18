class Graph{
    constructor(){
        this.nodes = [];
        this.links = [];
        this.node_index = [];
    }

    add_node(node){
        node.id = "n" + this.nodes.length;
        this.nodes.push(node);
        if (this.node_index[node.layer] == undefined) this.node_index[node.layer] = [];
        this.node_index[node.layer].push(node);
    }

    add_edge(edge){
        this.links.push(edge);
    }
}