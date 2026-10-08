/**
 * Per-message TV selection: `msg.tv` names an lgtv-config node by its name, host or id.
 * Without `msg.tv` the node's own config node is used. Only config nodes can be selected -
 * they own the pairing token and the connection; an unknown name is reported on the node.
 */
function selectTv(RED, node, msg) {
    if (msg.tv === undefined || msg.tv === null || msg.tv === '') {
        return node.tvConn;
    }
    const wanted = String(msg.tv);
    let found = null;
    RED.nodes.eachNode((n) => {
        if (!found && n.type === 'lgtv-config' && (n.name === wanted || n.host === wanted || n.id === wanted)) {
            found = n;
        }
    });
    const conn = found && RED.nodes.getNode(found.id);
    if (!conn) {
        node.error(new Error('msg.tv: no TV configuration named "' + wanted + '" (name, host or id)'), msg);
        return null;
    }
    return conn;
}

module.exports = {selectTv};
