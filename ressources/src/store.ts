import Vue from "vue";
import Vuex, { Store } from "vuex";
import localForage from "localforage";

Vue.use(Vuex);

declare global {
  interface Window {
    webpackHotUpdate: any;
  }
}

if (!window.webpackHotUpdate) {
  var server = window.location.protocol + "//" + window.location.host;
} else {
  // var server = "http://192.168.43.150:3000";
  var server = "http://localhost:3000";
}

interface TrickyStore extends Store<any> {
  _vm: any;
}

export default new Vuex.Store({
  state: {
    rooms: Array(),
    connected: Boolean(false),
    user: String(),
    currentRoom: String,
    userColors: new Map([["Serveur", "rgb(237, 237, 237)"]])
  },
  getters: {
    videoLink: state => (id: String) => {
      const returnValue = state.rooms.find(elm => {
        if (elm[0] == id) {
          return true;
        } else {
          return false;
        }
      });
      if (returnValue) {
        return returnValue[1].video;
      }
    },
    roomOwner: state => (id: String) => {
      const returnValue = state.rooms.find(elm => {
        if (elm[0] == id) {
          return true;
        } else {
          return false;
        }
      });
      if (returnValue) {
        return returnValue[1].owner;
      }
    },
    getMessages: state => {
      const room = state.rooms.find(elm => elm[0] === state.currentRoom);
      if (room) {
        return room[1].messages;
      }
    }
  },
  mutations: {
    addRoom(state, user) {
      state.rooms = state.rooms.concat(user);
    },
    deleteRoom(state, id) {
      state.rooms = state.rooms.filter(elm => elm[0] !== id);
    },
    setRoom(state, id) {
      state.currentRoom = id;
    },
    setConnection(state, connecState) {
      state.connected = connecState;
    },
    setUser(state, username) {
      state.user = username;
      localForage.setItem("username", username);
    },
    setCurrentRoom(state, roomId) {
      state.currentRoom = roomId;
    },
    addMessage(state, message) {
      const room = state.rooms.find(elm => elm[0] === state.currentRoom);
      if (room) {
        if (message.type && message.type === "system") {
          message.username = "Serveur";
        }
        if (!state.userColors.has(message.username)) {
          state.userColors.set(
            message.username,
            "hsla(" + Math.random() * 360 + ", 100%, 50%, 1)"
          );
        }
        room[1].messages.push(message);
      }
    },
    setMessages(state, messages) {
      const room = state.rooms.find(elm => elm[0] === state.currentRoom);
      if (room) {
        room[1].messages = messages;

        messages.forEach((elm: any) => {
          if (!state.userColors.has(elm.username)) {
            state.userColors.set(
              elm.username,
              "hsla(" + Math.random() * 360 + ", 100%, 50%, 1)"
            );
          }
        });
      }
    },
    changeRoomLink(state, data) {
      const room = state.rooms.find(elm => elm[0] === data.roomId);
      if (room) {
        room[1].video = data.link;
      }
    }
  },
  actions: {
    socket_rooms({ commit }, status) {
      if (status.operation === "add") {
        commit("addRoom", [status.data]);
      }
      if (status.operation === "remove") {
        commit("deleteRoom", status.data.id);
      }
      if (status.operation === "changeLink") {
        commit("changeRoomLink", status.data);
      }
    },
    socket_currentRoom({ commit }, status) {
      if (status.operation === "text") {
        commit("addMessage", status.data);
      } else if (status.operation === "refreshMessages") {
        commit("setMessages", status.data.messages);
      } else if (status.operation === "changeLink") {
        commit("changeRoomLink", status.data.roomId, status.data.link);
      }
    },
    socket_disconnect() {
      // let userConsent = confirm(
      //  "Un problème de connexion a été détecté ! Souhaitez vous recharger la page ?"
      // );
      // if (userConsent) {
      //  window.location.reload();
      // }
      // alert(
      //   "Impossible de joindre le serveur. Si vous observez des problèmes, n'hésitez pas àrecharger la page."
      // );
    },
    socket_reconnect({ state }) {
      (<any>this)._vm.$socket.emit("reconnect_data", { userName: state.user });
    },
    getRooms({ commit }) {
      Vue.http
        .get(server + "/api/rooms")
        .then((data: any) => commit("addRoom", data.body));
    },
    setupNewRoom({ state }, { roomLink }) {
      return Vue.http.put(server + "/api/rooms/add", {
        video: roomLink,
        userName: state.user
      });
    },
    setUserName({ commit }, uname) {
      // Merci de ne pas lire la ligne qui suit
      (<any>this)._vm.$socket.emit("users", { userName: uname });
      commit("setConnection", true);
      commit("setUser", uname);
    }
  }
});
