const { ServeGrip } = require( '@fanoutio/serve-grip' );
const { WebSocketMessageFormat } = require( '@fanoutio/grip' );

const serveGrip = new ServeGrip({grip: process.env.GRIP_URL});

module.exports = async (req, res) => {

    if (!(await serveGrip.run(req, res))) {
        console.log("run returned false");
        return;
    }

    const { wsContext } = req.grip;
    if (wsContext == null) {
        console.log("wsContext is null");
        res.statusCode = 400;
        res.end('Not a WebSocket-over-HTTP request\n');
        return;
    }

    // if this is a new connection, accept it and subscribe it to a channel
    if (wsContext.isOpening()) {
        console.log("wsContext isOpening is true");
        wsContext.accept();
        wsContext.subscribe('all');
    }

    while (wsContext.canRecv()) {
        const message = wsContext.recv();

        if (message == null) {
            // if return value is undefined then connection is closed
            console.log("wsContext closed");
            wsContext.close();
            break;
        }

        // broadcast to other connections
        const publisher = serveGrip.getPublisher();
        await publisher.publishFormats('all', new WebSocketMessageFormat(message));
    }

    console.log("calling res.end");
    res.end();
};
