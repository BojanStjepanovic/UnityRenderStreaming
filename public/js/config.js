export async function getServerConfig() {
  const protocolEndPoint = location.origin + "/config";
  const createResponse = await fetch(protocolEndPoint);
  return await createResponse.json();
}

export function getRTCConfiguration() {
  let config = {};
  config.sdpSemantics = "unified-plan";
  config.iceServers = [
    {
      urls: ["stun:stun.l.google.com:19302"],
    },
    {
      urls: ["turn:192.158.29.39:3478?transport=tcp"],
      username: "1379330808",
      credential: "JZEOEt2V3Qb0y27GRntt2u2PAYA",
    },
  ];
  return config;
}
