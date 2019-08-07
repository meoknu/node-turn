var _stream = null;

var socket = io('http://localhost:5000');
socket.emit('join', '_room');
var peers = [];

var video = document.getElementById('viewBroadcast');
var streaming = false;
var config = 
{  
  iceServers: [
    {
      urls: ['stun:27.7.242.231']
    },
    {
        urls: ['turn:27.7.242.231'],
        username: 'username',
        credential: 'password'
    }
  ]
};

function broadcast() {
	navigator.mediaDevices.getDisplayMedia({video: true, audio: true}).then((stream) => {
		streaming = true;
		_stream = stream;
	  	video.srcObject = stream;
		// pc.addStream(stream);
		startStreaming();
	});
}

function startStreaming() {
	peers.forEach((peer) => {
		peer.addStream(_stream);
		peer.createOffer().then((sdp) => {
			return peer.setLocalDescription(sdp);
		}).then(() => {
	 		socket.emit('send_offer', {
	 			to: peer.peer_id,
	 			message: peer.localDescription
	 		});
		});
	});
}

socket.on('peer_connected', (peer_id) => {
	var pc = new RTCPeerConnection(config);
	pc.peer_id = peer_id;
	addEventsListener(pc);
	if(streaming) {
		pc.addStream(_stream);
		pc.createOffer().then((sdp) => {
			return pc.setLocalDescription(sdp);
		}).then(() => {
	 		socket.emit('send_offer', {
	 			to: pc.peer_id,
	 			message: pc.localDescription
	 		});
		});
	}
	peers.push(pc);
	// console.log(location.pathname);
	// console.log(peers);
	socket.emit('connect_to_peer', {
		to: peer_id
	});
});

socket.on('connected_to_peer', (peer_id) => {
	var pc = new RTCPeerConnection(config);
	pc.peer_id = peer_id;
	addEventsListener(pc);
	peers.push(pc);
	// console.log(location.pathname);
	// console.log(peers);
});

function addEventsListener(pc) {
	pc.ontrack = (event) => {
	  v = document.createElement('video');
	  v.height = 100;
	  v.controls = true;
	  v.autoplay = true;
	  v.srcObject = event.streams[0];
	  document.body.appendChild(v);
	}
    pc.onicecandidate = (ice) => {
      // console.log(ice.candidate);
      if(ice.candidate && ice.candidate.candidate) {
        socket.emit('candidate_available', {
        	to: pc.peer_id,
        	message: ice.candidate
        });
      }
    }
}

socket.on('receive_offer', (id, msg) => {
	// console.log(id, msg);

	  // stop sending tracks if it starts receiving
	  peers.forEach((peer) => {
	  	peer.getSenders().forEach((track) => {
	  		peer.removeTrack(track);
	  	});
	  });
	  
	var peer = peers.find(p => p.peer_id == id);
	peer.setRemoteDescription(msg).then(() => {
		return peer.createAnswer();
	}).then((sdp) => {
		return peer.setLocalDescription(sdp);
	}).then(() => {
		socket.emit('send_answer', {
			to: peer.peer_id,
			message: peer.localDescription
		});
	});
});

socket.on('receive_answer', (id, msg) => {
	// console.log(id, msg);
	var peer = peers.find(p => p.peer_id == id);
	peer.setRemoteDescription(msg);
});

socket.on('add_candidate', (id, msg) => {
	// console.log(id, msg);
	var peer = peers.find(p => p.peer_id == id);
	peer.addIceCandidate(msg);
});

// socket.on('offer', (msg) => {
// 	console.log('offer');
// 	console.log(msg);
// 	if(!host) {
// 		pc.setRemoteDescription(msg).then(() => {
// 			console.log('remote set');
// 			// return pc.createAnswer()
// 		})
// 		// .then((sdp) => {
// 		// 	return pc.setLocalDescription(sdp)
// 		// }).then(() => {
// 		// 	socket.emit('answer', pc.localDescription)
// 		// });
// 	}
// });

// socket.on('answer', (msg) => {
// 	console.log('answer');
// 	console.log(msg);
// 	pc.setRemoteDescription(msg);
// })

// socket.on('candidate', (msg) => {
// 	console.log('candidate');
// 	console.log(msg);
// 	pc.addIceCandidate(msg);
// });

// pc.ontrack = (t) => {
//   video.srcObject = t.streams[0];
// }

// pc.onicecandidate = function(ice) {
// 	if(ice.candidate && ice.candidate.candidate) {
//         socket.emit('candidate', ice.candidate);
// 	}
// }