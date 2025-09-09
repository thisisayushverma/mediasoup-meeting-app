const openMediaDevices = async (constraints)=>{
    return await navigator.mediaDevices.getUserMedia(constraints);
}

const getDeviceDetails = async ()=>{
    return await navigator.mediaDevices.enumerateDevices();
}

const getDisplayMedia = async (constraints)=>{
    return await navigator.mediaDevices.getDisplayMedia(constraints);
}





export {
    openMediaDevices,
    getDeviceDetails,
    getDisplayMedia
}