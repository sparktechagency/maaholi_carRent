import { Server } from "socket.io";

let ioInstance: Server;

const socket = (io: Server) => {
  ioInstance = io; 

  io.on("connection", socket => {
    console.log("User connected");

    socket.on("track", (data: any) => {
      const { id, location } = data;
      socket.emit(`track::${id}`, location);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });
};

const getIO = (): Server => {
  if (!ioInstance) {
    throw new Error("Socket.io not initialized");
  }
  return ioInstance;
};

export const socketHelper = {
  socket,
  getIO,
};