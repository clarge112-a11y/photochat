import { createTRPCRouter, publicProcedure } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import signupRoute from "./routes/auth/signup/route";
import { 
  createChatProcedure, 
  testChatProcedure, 
  getChatsProcedure,
  sendMessageProcedure,
  getMessagesProcedure,
  markMessagesAsReadProcedure,
  setTypingStatusProcedure,
  getTypingStatusProcedure,
  getFriendsProcedure,
  testDatabaseProcedure,
  testGroupTablesProcedure,
  getGroupChatsProcedure,
  createGroupChatProcedure,
  getGroupMessagesProcedure,
  sendGroupMessageProcedure
} from "./routes/chat/create/route";
import {
  createCallProcedure,
  updateCallStatusProcedure,
  getCallsProcedure
} from "./routes/call/route";

export const appRouter = createTRPCRouter({
  // Simple health check
  health: publicProcedure.query(() => {
    console.log('Health check called at:', new Date().toISOString());
    return { 
      status: 'ok', 
      message: 'tRPC backend is working!', 
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };
  }),
  // Simple ping test
  ping: publicProcedure.query(() => {
    console.log('Ping called at:', new Date().toISOString());
    return { message: 'pong', timestamp: new Date().toISOString() };
  }),
  // Database health checks
  testDatabase: testDatabaseProcedure,
  testGroupTables: testGroupTablesProcedure,
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  auth: createTRPCRouter({
    signup: signupRoute,
  }),
  chat: createTRPCRouter({
    test: testChatProcedure,
    create: createChatProcedure,
    getChats: getChatsProcedure,
    sendMessage: sendMessageProcedure,
    getMessages: getMessagesProcedure,
    markAsRead: markMessagesAsReadProcedure,
    setTypingStatus: setTypingStatusProcedure,
    getTypingStatus: getTypingStatusProcedure,
    getFriends: getFriendsProcedure,
  }),
  callRoutes: createTRPCRouter({
    create: createCallProcedure,
    updateStatus: updateCallStatusProcedure,
    getCalls: getCallsProcedure,
  }),
  group: createTRPCRouter({
    getGroupChats: getGroupChatsProcedure,
    createGroupChat: createGroupChatProcedure,
    getGroupMessages: getGroupMessagesProcedure,
    sendGroupMessage: sendGroupMessageProcedure,
  }),
});

export type AppRouter = typeof appRouter;