class Peer{
    constructor(peerId,socket){
        this.peerId = peerId;
        this.socket = socket;
        this.sendTransport = null;
        this.recvTransport = null;
        this.transport = new Map();
        this.producers = new Map();
        this.consumers = new Map();
        this.plainTransport = new Map();
    }


    addPlainTransport(plainTransport){
        this.plainTransport.set(plainTransport.id,plainTransport);
    }
    
    removePlainTransport(plainTransport){
        this.plainTransport.delete(plainTransport.id);
    }

    getPlainTransport(plainTransportId){
        return this.plainTransport.get(plainTransportId);
    }

    addTransport(transport){
        this.transport.set(transport.id,transport);
    }
    removeTransport(transport){
        this.transport.delete(transport.id);
    }

    getTransport(transportId){
        return this.transport.get(transportId);
    }

    setSendTransport(transport){
        this.sendTransport = transport;
    }
    setRecvTransport(transport){
        this.recvTransport = transport;
    }
    

    addProducer(producer){
        this.producers.set(producer.id,producer);
    }

    getProducer(producerId){
        return this.producers.get(producerId);
    }

    removeProducer(producer){
        this.producers.delete(producer.id);
    }

    addConsumer(consumer){
        this.consumers.set(consumer.id,consumer);
    }

    getConsumer(consumerId){
        return this.consumers.get(consumerId);
    }

    removeConsumer(consumer){
        this.consumers.delete(consumer.id);
    }
}

export default Peer