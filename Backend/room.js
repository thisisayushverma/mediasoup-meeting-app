class Room {
    constructor() {
        this.peers = new Map();
        this.producers = new Map();
        this.plainTransport = new Map();
    }

    addPeer(routerId, peer) {
        const peerArray = this.peers.get(routerId) || [];
        const newPeerArray = peerArray.filter((p) => p.peerId !== peer.peerId);
        newPeerArray.push(peer);
        this.peers.set(routerId, newPeerArray);
    }

    removePeer(routerId, peer) {
        const peerArray = this.peers.get(routerId) || [];
        const newPeerArray = peerArray.filter((p) => p.peerId !== peer.peerId);
        this.peers.set(routerId, newPeerArray);
    }


    getAllPeers(routerId) {
        return this.peers.get(routerId) || [];
    }

    addProducer(routerId, producer) {
        const producerArray = this.producers.get(routerId) || [];
        const newProducerArray = producerArray.filter((p) => p.id !== producer.id);
        newProducerArray.push(producer);
        this.producers.set(routerId, newProducerArray);
    }

    removeProducer(routerId, producer) {
        const producerArray = this.producers.get(routerId) || [];
        const newProducerArray = producerArray.filter((p) => p.id !== producer.id);
        this.producers.set(routerId, newProducerArray);
    }

    getProducers(routerId) {
        return this.producers.get(routerId) || [];
    }

    createPlainTransport = async (roomId, worker) => {
        const router = worker.getRouter(roomId);
        if (!router) return;
        // before this ip:0.0.0.0
        const transport = await router.createPlainTransport({
            listenIp: { ip: '127.0.0.1', announcedIp: '127.0.0.1' },
            rtcpMux: false,  // FFmpeg often expects RTP+RTCP separately
            comedia: false,  // we are sending, not receiving
        });
        this.plainTransport.set(router.id, transport);
        return transport;
    }


    getPlainTransport = (routerId) => {
        return this.plainTransport.get(routerId);
    }

    removePlainTransport = (routerId) => {
        this.plainTransport.delete(routerId);
    }
}


export default Room