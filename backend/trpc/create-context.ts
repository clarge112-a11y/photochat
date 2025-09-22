import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { supabase } from "../lib/supabase";

// Context creation function
export const createContext = async (opts: FetchCreateContextFnOptions) => {
  console.log('Creating tRPC context for:', opts.req.method, opts.req.url);
  
  const authHeader = opts.req.headers.get('authorization');
  let user = null;
  
  if (authHeader) {
    try {
      const token = authHeader.replace('Bearer ', '');
      console.log('Attempting to authenticate user with token');
      
      const { data: { user: authUser }, error } = await supabase.auth.getUser(token);
      if (!error && authUser) {
        user = authUser;
        console.log('User authenticated:', authUser.id);
      } else if (error) {
        console.error('Auth error:', error.message);
      }
    } catch (error) {
      console.error('Error getting user from token:', error);
    }
  } else {
    console.log('No authorization header found');
  }
  
  return {
    req: opts.req,
    user,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

// Initialize tRPC
const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

// Protected procedure that requires authentication
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});