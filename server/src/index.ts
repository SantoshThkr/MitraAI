import "dotenv/config";
import Fastify, {
  type FastifyError,
  type FastifyInstance,
} from "fastify";
import cors from "@fastify/cors";
import { z } from "zod";

const environmentSchema = z.object({
  HOST: z.string().default("127.0.0.1"),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
});

const environment = environmentSchema.parse(process.env);

const buildServer = async (): Promise<FastifyInstance> => {
  const server = Fastify({ logger: true });

  await server.register(cors, {
    origin: environment.CORS_ORIGIN,
  });

  server.setErrorHandler((error: FastifyError, _request, reply) => {
    server.log.error(error);
    void reply.status(error.statusCode ?? 500).send({
      error: "Internal Server Error",
    });
  });

  server.get("/api/health", async () => ({ status: "ok" }));

  return server;
};

const startServer = async (): Promise<void> => {
  const server = await buildServer();

  const shutdown = async (signal: string) => {
    server.log.info({ signal }, "Shutting down server");
    await server.close();
    process.exit(0);
  };

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));

  try {
    await server.listen({
      host: environment.HOST,
      port: environment.PORT,
    });
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
};

void startServer();
