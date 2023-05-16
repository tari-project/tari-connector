class SignaligServer {
  private _token?: string;
  private _server_url: string
  constructor(server_url: string | undefined) {
    if (server_url !== undefined) {
      this._server_url = server_url;
    } else {
      this._server_url = "http://localhost:9100";
    }
  }

  async initToken() {
    this._token = await this.authLogin()
  }

  public get token() {
    return this._token;
  }

  private async jsonRpc(method: string, token?: string, params?: any) {
    let id = 0;
    id += 1;
    let address = this._server_url;
    // let text = await (await fetch('json_rpc_address')).text();
    // if (/^\d+(\.\d+){3}:[0-9]+$/.test(text)) {
    //   address = text;
    // }
    let headers: { [key: string]: string } = { 'Content-Type': 'application/json' };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    if (!params) {
      params = ""
    }
    let response = await fetch(address, {
      method: 'POST',
      body: JSON.stringify({
        method: method,
        jsonrpc: '2.0',
        id: id,
        params: params,
      }),
      headers: headers
    });
    let json = await response.json();
    if (json.error) {
      throw json.error;
    }
    return json.result;
  }

  private async authLogin() {
    return await this.jsonRpc("auth.login");
  }

  async storeIceCandidate(ice_candidate: RTCIceCandidate) {
    return await this.jsonRpc("add.offer_ice_candidate", this._token, ice_candidate)
  }

  async storeOffer(offer: RTCSessionDescriptionInit) {
    return await this.jsonRpc("add.offer", this._token, offer.sdp)
  }

  async getAnswer() {
    return await this.jsonRpc("get.answer", this._token)
  }

  async getIceCandidates() {
    return await this.jsonRpc("get.answer_ice_candidates", this._token)
  }
}

export class TariConnection {
  private _peerConnection: RTCPeerConnection;
  private _dataChannel: RTCDataChannel;
  private _signalingServer: SignaligServer;
  private _messageId: number;
  private _lock: Promise<void>;
  private _callbacks: { [key: string]: any[] };
  private _offer?: RTCSessionDescriptionInit;
  // This is public so that user can directly set the onopen callback that will be called once the data channel is open.
  public onopen: (() => void) | undefined;

  constructor(signalig_server_url?: string, config?: RTCConfiguration) {
    this._peerConnection = new RTCPeerConnection(config || this.config());
    this._dataChannel = this._peerConnection.createDataChannel("tari-data");
    this._signalingServer = new SignaligServer(signalig_server_url);
    this._messageId = 0;
    this._lock = Promise.resolve();
    this._callbacks = {};
  }

  public get token() {
    return this._signalingServer.token;
  }

  async init() {
    await this._signalingServer.initToken();
    // Setup our receiving end
    this._dataChannel.onmessage = (message) => {
      let response = JSON.parse(message.data)
      // The response should contain id, to identify the Promise.resolve, that is waiting for this result
      let [resolve, reject] = this._callbacks[response.id];
      delete this._callbacks[response.id];
      try {
        resolve(JSON.parse(response.payload));
      }
      catch {
        reject(response.payload);
      }
    };
    this._dataChannel.onopen = () => {
      // This is currently just a user notification, but we can use the pc signaling state to know if it is open.
      if (this.onopen) {
        this.onopen();
      }
      // This should be removed before the release, but it's good for debugging.
      console.log("Data channel is open!");
    };
    this._peerConnection.onicecandidate = (event) => {
      if (event?.candidate) {
        // Store the ice candidates, so the other end can add them
        this._signalingServer.storeIceCandidate(event.candidate).then((resp) => {
          // This should be removed before the release, but it's good for debugging.
          console.log("Candidate stored", resp);
        })
      }
    };
    // Create offer
    this._offer = await this._peerConnection.createOffer();
    // Set the offer as our local sdp, at this point it will start getting the ice candidates
    this._peerConnection.setLocalDescription(this._offer);
    // Store the offer so the other end can set it as a remote sdp
    this._signalingServer.storeOffer(this._offer).then((resp) => {
      // This should be removed before the release, but it's good for debugging.
      console.log("Offer stored", resp);
    })
  }

  // We should come up with a solution where the signaling server will send us a message that the other end is connected. 
  // And this should be called automatically after the notification.
  async setAnswer() {
    // This is called once the other end got the offer and ices and created and store an answer and its ice candidates
    // We get its answer sdp
    let sdp = JSON.parse((await this._signalingServer.getAnswer()));
    // And its ice candidates
    let iceCandidates = await this._signalingServer.getIceCandidates();
    // For us the answer is remote sdp
    let answer = new RTCSessionDescription({ sdp, type: "answer" });
    this._peerConnection.setRemoteDescription(answer);
    // We add all the ice candidates to connect, the other end is doing the same with our ice candidates
    iceCandidates = JSON.parse(iceCandidates);
    for (const iceCandidate of iceCandidates) {
      this._peerConnection.addIceCandidate(JSON.parse(iceCandidate));
    }
  }

  private async getNextMessageId() {
    // Javascript "Mutex" :-)
    // We need to make sure the ids are unique so we can assign the result to the correct promises.
    await this._lock;
    let messageId = this._messageId;
    this._messageId += 1;
    this._lock = Promise.resolve();
    return messageId;
  }

  public isConnected() {
    return this._dataChannel.readyState === "open"
  }

  // If the last parameter has timeout property e.g. {timeout:1000}, it set the timeout for this call.
  async sendMessage(method: string, ...args: any[]) {
    var timeout = 0;
    if (args.length > 0) {
      console.log(args.length)
      if (args[args.length - 1]?.timeout) {
        timeout = args.pop().timeout;
      }
    }
    // This should be removed before the release, but it's good for debugging.
    console.log(args, 'timeout', timeout);
    // Generate a unique id
    let messageId = await this.getNextMessageId();
    return new Promise((resolve, reject) => {
      // We store the resolve callback for this request, 
      // so once the data channel receives a response we know where to return the data
      this._callbacks[messageId] = [resolve, reject];
      if (timeout > 0) {
        // If the user set a timeout which set it here so the promise will be rejected if not fulfilled in time.
        setTimeout(() => {
          delete this._callbacks[messageId];
          reject(new Error("Timeout"));
        }, timeout)
      }
      // Make the actual call to the wallet daemon
      this._dataChannel.send(JSON.stringify({ id: messageId, method, params: JSON.stringify(args) }));
    });
  }

  // This is our default config, use can set their own stun/turn server in the constructor.
  private config() {
    return { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
  }
}

async function initTariConnection(signalig_server_url?: string, config?: RTCConfiguration) {
  let tari = new TariConnection(signalig_server_url, config);
  await tari.init();
  return tari;
}

export default initTariConnection;
