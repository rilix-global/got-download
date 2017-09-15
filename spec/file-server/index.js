import hapi from 'hapi';
import inert from 'inert';
import path from 'path';

let server = null;

export async function startServer(host = '0.0.0.0', port = 7845) {
  if (server) await stopServer();

  server = new hapi.Server({
    connections: {
      routes: {
        files: {
          relativeTo: path.join(__dirname, 'files')
        }
      }
    }
  });

  server.connection({ host, port });

  await server.register(inert);

  server.route({
    method: 'GET',
    path: '/{files*}',
    handler: {
      directory: {
        path: '.'
      }
    }
  });

  server.route({
    method: 'GET',
    path: '/error-download',
    handler: function (request, reply) {
      reply.file('one-mb');
      request.raw.res.destroy(new Error());
    }
  });

  await server.start();


  return server;
}

export async function stopServer() {
  await server.stop();
  server = null;
}
