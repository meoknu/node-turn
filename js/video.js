(function() {
  /** @type {SocketIOClient.Socket} */
  const socket = io('http://localhost:5000');
  const localVideo = document.querySelector('.localVideo');
  const remoteVideos = document.querySelector('.remoteVideos');
  const peerConnections = {};
  
  let room = 'home' // !location.pathname.substring(1) ? 'home' : location.pathname.substring(1);
  let getUserMediaAttempts = 5;
  let gettingUserMedia = false;

  /** @type {RTCConfiguration} */
  const config = {
    'iceServers': [{
      'urls': ['stun:stun.l.google.com:19302']
    }]
  };

  /** @type {MediaStreamConstraints} */
  const constraints = {
    // audio: true,
    video: { facingMode: "user" }
  };

  socket.on('full', function(room) {
    alert('Room ' + room + ' is full');
  });

  socket.on('bye', function(id) {
    handleRemoteHangup(id);
  });

  if (room && !!room) {
    setTimeout(() => {
      console.log(socket.id+' to join room '+room);
      socket.emit('join', room);
    }, 1000);
  }

  window.onunload = window.onbeforeunload = function() {
    socket.close();
  };

  socket.on('ready', function (id) {
    console.log('ready');
    if (!(localVideo instanceof HTMLVideoElement) || !localVideo.srcObject) {
      return;
    }
    const peerConnection = new RTCPeerConnection(config);
    peerConnections[id] = peerConnection;
    if (localVideo instanceof HTMLVideoElement) {
      console.log('add stream');
      peerConnection.addStream(localVideo.srcObject);
    }
    peerConnection.createOffer()
    .then(sdp => peerConnection.setLocalDescription(sdp))
    .then(function () {
      socket.emit('offer', room, peerConnection.localDescription);
    });
    peerConnection.onaddstream = (event) => {
      console.log(event);
      handleRemoteStreamAdded(event.stream, id);
    }
    peerConnection.onicecandidate = function(event) {
      if (event.candidate) {
        socket.emit('candidate', id, event.candidate);
      }
    };
  });

  socket.on('offer', function(id, description) {
    console.log('offer');
    console.log(id);
    console.log(description);
    const peerConnection = new RTCPeerConnection(config);
    window.pc = peerConnection;
    peerConnections[id] = peerConnection;
    if (localVideo instanceof HTMLVideoElement) {
      peerConnection.addStream(localVideo.srcObject);
    }
    peerConnection.setRemoteDescription(description)
    .then(() => peerConnection.createAnswer())
    .then(sdp => peerConnection.setLocalDescription(sdp))
    .then(function () {
      socket.emit('answer', room, peerConnection.localDescription);
    });
    peerConnection.onaddstream = (event) => {
      console.log('added stream', event);
      handleRemoteStreamAdded(event.stream, id);
    }
    peerConnection.onicecandidate = function(event) {
      if (event.candidate) {
        socket.emit('candidate', id, event.candidate);
      }
    };
  });

  socket.on('candidate', function(id, candidate) {
    console.log('candidate');
    peerConnections[id].addIceCandidate(new RTCIceCandidate(candidate))
    .catch(e => console.error(e));
  });

  socket.on('answer', function(id, description) {
    console.log('answer');
    peerConnections[id].setRemoteDescription(description);
  });

  function getUserMediaSuccess(stream) {
    gettingUserMedia = false;
    if (localVideo instanceof HTMLVideoElement) {
      !localVideo.srcObject && (localVideo.srcObject = stream);
    }
    console.log(socket.id+' ready for '+room);
    socket.emit('ready', room);
  }

  function handleRemoteStreamAdded(stream, id) {
    const remoteVideo = document.createElement('video');
    console.log(stream);
    console.log(id);
    remoteVideo.srcObject = stream;
    remoteVideo.setAttribute("id", id.replace(/[^a-zA-Z]+/g, "").toLowerCase());
    remoteVideo.setAttribute("playsinline", "true");
    remoteVideo.setAttribute("autoplay", "true");
    remoteVideo.setAttribute("controls", "true");
    remoteVideos.appendChild(remoteVideo);
    if (remoteVideos.querySelectorAll("video").length === 1) {
      remoteVideos.setAttribute("class", "one remoteVideos");
    } else {
      remoteVideos.setAttribute("class", "remoteVideos");
    }
  }

  function getUserMediaError(error) {
    console.error(error);
    gettingUserMedia = false;
    (--getUserMediaAttempts > 0) && setTimeout(getUserMediaDevices, 1000);
  }

  function getUserMediaDevices() {
    if (localVideo instanceof HTMLVideoElement) {
      if (localVideo.srcObject) {
        getUserMediaSuccess(localVideo.srcObject);
      } else if (!gettingUserMedia && !localVideo.srcObject) {
        gettingUserMedia = true;
        navigator.mediaDevices.getDisplayMedia()
        .then(getUserMediaSuccess)
        .catch(getUserMediaError);
        // getUserMediaSuccess();
      }
    }
  }

  function handleRemoteHangup(id) {
    peerConnections[id] && peerConnections[id].close();
    delete peerConnections[id];
    document.querySelector("#" + id.replace(/[^a-zA-Z]+/g, "").toLowerCase()).remove();
    if (remoteVideos.querySelectorAll("video").length === 1) {
      remoteVideos.setAttribute("class", "one remoteVideos");
    } else {
      remoteVideos.setAttribute("class", "remoteVideos");
    }
  }

  getUserMediaDevices();
})();